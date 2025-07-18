import { NextResponse } from "next/server"
import { cleanupOldData } from "@/lib/firebase-database"

export async function POST() {
  try {
    console.log("🧹 Starting cleanup...")
    await cleanupOldData()
    console.log("✅ Cleanup completed!")

    return NextResponse.json({
      success: true,
      message: "Cleanup completed successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Error during cleanup:", error)
    return NextResponse.json(
      {
        error: "Cleanup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
