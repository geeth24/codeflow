from typing import Any

from pydantic import BaseModel


class TraceStep(BaseModel):
    step: int
    line: int
    locals: dict[str, Any]
    stack: list[str]


class RunRequest(BaseModel):
    code: str
    language: str = "python"
    input: str | None = None


class RunResponse(BaseModel):
    trace: list[TraceStep]
    output: str | None = None
    error: str | None = None
    modified_code: str | None = None


class ExplainRequest(BaseModel):
    code: str
    trace: list[dict[str, Any]]


class ExplainResponse(BaseModel):
    explanation: str
