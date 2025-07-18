import { type NextRequest, NextResponse } from "next/server"
import { updateUserPresence } from "@/lib/firebase-database"

export async function POST(request: NextRequest, _context: { params: Promise<{ zipcode: string }> }) {
  try {
    const { userId } = await request.json()

    await updateUserPresence(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating presence:", error)
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 })
  }
}
