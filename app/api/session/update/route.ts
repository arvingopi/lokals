import { NextRequest, NextResponse } from "next/server"
import { updateSessionProfile } from "@/lib/firebase-session-server"

export async function PUT(request: NextRequest) {
  try {
    const { sessionId, updates } = await request.json()
    
    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      )
    }
    
    // Update session profile
    await updateSessionProfile(sessionId, updates)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Session update API error:", error)
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    )
  }
}