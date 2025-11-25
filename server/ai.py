import os
import json
from anthropic import Anthropic
from typing import List, Dict, Any

async def generate_example_call(code: str, language: str = "python", api_key: str = None) -> str:
    """
    Generate a single line of code that calls the function(s) defined in the provided code.
    """
    api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return ""

    client = Anthropic(api_key=api_key)
    
    lang_name = "Python" if language == "python" else "JavaScript"
    lang_ext = "python" if language == "python" else "javascript"
    
    prompt = f"""You are a {lang_name} expert. I have some {lang_name} code that defines functions but doesn't call them.
    
Code:
```{lang_ext}
{code}
```

Please generate ONE single line of code that calls the main function with interesting example data to demonstrate its behavior.
For example, if the function is `twoSum(nums, target)`, you might return: `twoSum([2, 7, 11, 15], 9)`
If there are multiple functions, pick the most interesting one to run.
Do not add comments. Do not add markdown formatting. Just return the code line.
"""

    try:
        message = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=100,
            temperature=0.5,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()
    except Exception:
        return ""

async def stream_explanation(code: str, trace: list, api_key: str = None):
    """
    Stream an explanation from AI based on the code execution trace.
    """
    api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        yield "Error: ANTHROPIC_API_KEY not found. Please add it in Settings."
        return

    client = Anthropic(api_key=api_key)
    
    # Prepare a summarized trace to avoid token limits
    # Take first few steps, last few steps, and sampled steps in between if too long
    summary_trace = trace
    if len(trace) > 50:
        summary_trace = trace[:20] + trace[-20:]
    
    system_prompt = """You are an expert Python tutor. Your goal is to explain how the code works based on the execution trace provided.
    
    Focus on:
    1. The flow of execution
    2. How variables change over time
    3. Key logic steps
    4. Any potential issues or optimizations
    
    Be concise, encouraging, and clear. Use markdown for formatting."""
    
    user_message = f"""Here is the Python code:
```python
{code}
```

Here is the execution trace (summarized):
```json
{json.dumps(summary_trace, default=str)}
```

Explain what happened during this execution. Start with a high-level summary, then break down the key steps."""

    try:
        with client.messages.stream(
            model="claude-3-5-haiku-20241022",
            max_tokens=1000,
            temperature=0.7,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_message}
            ]
        ) as stream:
            for text in stream.text_stream:
                yield text
    except Exception as e:
        yield f"Error communicating with AI: {str(e)}"
