from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv

from tracer import trace_execution
from ai import stream_explanation, generate_example_call
from models import RunRequest, RunResponse, ExplainRequest, ExplainResponse
import ast

load_dotenv()

app = FastAPI(title="Flow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


import subprocess
import json
import tempfile
import httpx

# ... existing imports ...

@app.post("/run", response_model=RunResponse)
async def run_code(request: RunRequest, http_request: Request):
    api_key = http_request.headers.get("X-API-Key")
    try:
        if request.language == "python":
            return await run_python_code(request, api_key)
        elif request.language in ["javascript", "typescript"]:
            return await run_node_code(request, api_key)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported language: {request.language}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def js_has_only_definitions(code: str) -> bool:
    """Check if JS code only has function definitions without any calls."""
    lines = code.strip().split('\n')
    in_function = 0
    has_function = False
    
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('//'):
            continue
        
        if 'function ' in stripped or '=>' in stripped:
            has_function = True
        
        in_function += stripped.count('{') - stripped.count('}')
        
        if in_function == 0 and has_function:
            # We're at top level, check if this line is a call
            if '(' in stripped and not stripped.startswith('function ') and not 'function ' in stripped:
                # Looks like a function call at top level
                return False
    
    return has_function

async def run_node_code(request: RunRequest, api_key: Optional[str] = None):
    node_runner_url = os.getenv("NODE_RUNNER_URL", "http://runner-node:3000")
    code = request.code
    modified_code = None
    language = request.language
    
    # Check if JS/TS code needs a driver call
    if js_has_only_definitions(code):
        example_call = await generate_example_call(code, language=language, api_key=api_key)
        if example_call:
            code = f"{code}\n\n// Auto-generated example call:\n{example_call}"
            modified_code = code
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{node_runner_url}/trace", json={"code": code, "language": language})
            
            if response.status_code != 200:
                return RunResponse(trace=[], error=f"Runner Error: {response.text}")
                
            data = response.json()
            if "error" in data:
                return RunResponse(trace=[], error=data["error"])
                
            return RunResponse(trace=data["trace"], modified_code=modified_code)
    except Exception as e:
        return RunResponse(trace=[], error=f"Failed to communicate with Node runner: {str(e)}")

async def run_python_code(request: RunRequest, api_key: Optional[str] = None):
    code = request.code
    modified_code = None
    
    # Check if the code needs a driver call
    try:
        tree = ast.parse(code)
        has_top_level_execution = False
        has_definitions = False
        
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.Import, ast.ImportFrom)):
                if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                    has_definitions = True
            else:
                # Found something that isn't a definition or import (like an expression or assignment)
                has_top_level_execution = True
                break
        
        if has_definitions and not has_top_level_execution:
            # Generate an example call
            example_call = await generate_example_call(code, language="python", api_key=api_key)
            if example_call:
                code = f"{code}\n\n# Auto-generated example call:\n{example_call}"
                modified_code = code
    except Exception as e:
        print(f"Error analyzing code: {e}")
        # If AST parsing fails, just run the code as is
        pass

    trace = trace_execution(code, request.input)
    return RunResponse(trace=trace, modified_code=modified_code)


@app.post("/explain")
async def explain_code(request: ExplainRequest, http_request: Request):
    api_key = http_request.headers.get("X-API-Key")
    return StreamingResponse(
        stream_explanation(request.code, request.trace, api_key=api_key),
        media_type="text/plain"
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
