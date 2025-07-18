import { type NextRequest, NextResponse } from "next/server"
import { saveMessage, getRoomMessages, updateUserPresence, getActiveUsers } from "@/lib/firebase-database"

export async function GET(request: NextRequest, { params }: { params: { zipcode: string } }) {
  try {
    const zipcode = params.zipcode

    const [messages, users] = await Promise.all([getRoomMessages(zipcode), getActiveUsers(zipcode)])

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        timestamp: m.timestamp,
        userId: m.user_id,
        username: m.username,
      })),
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        lastSeen: u.last_seen,
      })),
    })
  } catch (error) {
    console.error("Error fetching room data:", error)
    return NextResponse.json({ error: "Failed to fetch room data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { zipcode: string } }) {
  try {
    const zipcode = params.zipcode
    const { content, userId, username } = await request.json()

    // Save message and update user presence
    const [message] = await Promise.all([
      saveMessage(content, userId, username, zipcode),
      updateUserPresence(userId),
    ])

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        timestamp: message.timestamp,
        userId: message.user_id,
        username: message.username,
      },
    })
  } catch (error) {
    console.error("Error saving message:", error)
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
  }
}
