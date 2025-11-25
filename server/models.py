from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class TraceStep(BaseModel):
    step: int
    line: int
    locals: Dict[str, Any]
    stack: List[str]


class RunRequest(BaseModel):
    code: str
    language: str = "python"
    input: Optional[str] = None


class RunResponse(BaseModel):
    trace: List[TraceStep]
    output: Optional[str] = None
    error: Optional[str] = None
    modified_code: Optional[str] = None


class ExplainRequest(BaseModel):
    code: str
    trace: List[Dict[str, Any]]


class ExplainResponse(BaseModel):
    explanation: str

