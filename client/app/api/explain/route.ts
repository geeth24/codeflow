import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

export async function POST(request: NextRequest) {
  try {
    const { code, trace } = await request.json()
    const apiKey = request.headers.get("X-API-Key")

    if (!code || !trace) {
      return NextResponse.json({ error: "Code and trace are required" }, { status: 400 })
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }
    if (apiKey) {
      headers["X-API-Key"] = apiKey
    }

    const response = await fetch(`${BACKEND_URL}/explain`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code, trace }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: error || "Failed to explain code" }, { status: response.status })
    }

    return new NextResponse(response.body)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

