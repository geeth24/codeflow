import { RunResponse, ExplainResponse } from "./types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

export async function runCode(code: string, language: string, input?: string): Promise<RunResponse> {
  const apiKey = localStorage.getItem("anthropic_api_key")
  
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (apiKey) {
    headers["X-API-Key"] = apiKey
  }
  
  const response = await fetch("/api/run", {
    method: "POST",
    headers,
    body: JSON.stringify({ code, language, input }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to run code")
  }

  return response.json()
}

export async function explainCode(code: string, trace: any[], onChunk: (text: string) => void): Promise<void> {
  const apiKey = localStorage.getItem("anthropic_api_key")

  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (apiKey) {
    headers["X-API-Key"] = apiKey
  }

  const response = await fetch("/api/explain", {
    method: "POST",
    headers,
    body: JSON.stringify({ code, trace }),
  })

  if (!response.ok || !response.body) {
    throw new Error("Failed to explain code")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value, { stream: true })
    onChunk(text)
  }
}

