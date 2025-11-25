export interface TraceStep {
  step: number;
  line: number;
  locals: Record<string, unknown>;
  stack: string[];
}

export interface RunResponse {
  trace: TraceStep[];
  output?: string;
  error?: string;
  modified_code?: string;
}

export interface ExplainResponse {
  explanation: string;
}
