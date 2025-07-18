import { NextRequest, NextResponse } from "next/server"
import { getActiveChats } from "@/lib/firebase-database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? parseInt(limitParam, 10) : 10

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const activeChats = await getActiveChats(userId, limit)
    return NextResponse.json({ activeChats })
  } catch (error) {
    console.error("Error fetching active chats:", error)
    return NextResponse.json({ error: "Failed to fetch active chats" }, { status: 500 })
  }
}