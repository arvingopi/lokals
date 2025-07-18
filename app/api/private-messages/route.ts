import { type NextRequest, NextResponse } from "next/server"
import { savePrivateMessage, getPrivateMessages } from "@/lib/firebase-database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId1 = searchParams.get("userId1")
    const userId2 = searchParams.get("userId2")

    if (!userId1 || !userId2) {
      return NextResponse.json({ error: "Missing user IDs" }, { status: 400 })
    }

    const messages = await getPrivateMessages(userId1, userId2)

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        timestamp: m.timestamp,
        userId: m.user_id,
        username: m.username,
        recipientId: m.recipient_id,
      })),
    })
  } catch (error) {
    console.error("Error fetching private messages:", error)
    return NextResponse.json({ error: "Failed to fetch private messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { senderId, recipientId, content, username } = await request.json()

    const message = await savePrivateMessage(senderId, recipientId, content, username)

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        timestamp: message.timestamp,
        userId: message.user_id,
        username: message.username,
        recipientId: message.recipient_id,
      },
    })
  } catch (error) {
    console.error("Error saving private message:", error)
    return NextResponse.json({ error: "Failed to save private message" }, { status: 500 })
  }
}
