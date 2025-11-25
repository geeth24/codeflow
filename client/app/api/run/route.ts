import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

export async function POST(request: NextRequest) {
  try {
    const { code, input, language = "python" } = await request.json()
    const apiKey = request.headers.get("X-API-Key")

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }
    if (apiKey) {
      headers["X-API-Key"] = apiKey
    }

    const response = await fetch(`${BACKEND_URL}/run`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code, input, language }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ error: error.detail || "Failed to run code" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

