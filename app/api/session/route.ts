import { NextRequest, NextResponse } from "next/server"
import { getOrCreateSession } from "@/lib/firebase-session-server"

export async function POST(request: NextRequest) {
  try {
    const { fingerprint } = await request.json()
    
    if (!fingerprint) {
      return NextResponse.json(
        { error: "Device fingerprint is required" },
        { status: 400 }
      )
    }
    
    console.log('🔍 Session API: Looking for fingerprint:', fingerprint.substring(0, 8) + '...')
    
    // Get or create session for this device
    const result = await getOrCreateSession(fingerprint)
    
    console.log('📝 Session API result:', {
      sessionId: result.session.session_id.substring(0, 8) + '...',
      userId: result.profile.userId,
      username: result.profile.username,
      zipcode: result.profile.zipcode,
      isNew: result.isNew
    })
    
    return NextResponse.json({
      session: {
        session_id: result.session.session_id,
        device_count: result.session.device_count,
      },
      profile: result.profile,
      isNew: result.isNew
    })
  } catch (error) {
    console.error("Session API error:", error)
    return NextResponse.json(
      { error: "Failed to manage session" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fingerprint = searchParams.get("fingerprint")
    
    if (!fingerprint) {
      return NextResponse.json(
        { error: "Device fingerprint is required" },
        { status: 400 }
      )
    }
    
    // Get existing session for this device  
    const result = await getOrCreateSession(fingerprint)
    
    return NextResponse.json({
      session: {
        session_id: result.session.session_id,
        device_count: result.session.device_count,
      },
      profile: result.profile
    })
  } catch (error) {
    console.error("Session API error:", error)
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    )
  }
}