import type { NextRequest } from "next/server"
import { getWebSocketServer } from "@/lib/websocket-server"
import { initializeDatabase } from "@/lib/database"

// Initialize on first API call
let initialized = false

async function initialize() {
  if (!initialized) {
    console.log("🚀 Initializing chat system...")
    await initializeDatabase()
    getWebSocketServer()
    initialized = true
    console.log("✅ Chat system ready!")
  }
}

export async function GET() {
  try {
    await initialize()

    return new Response(
      JSON.stringify({
        status: "WebSocket server is running",
        port: 8080,
        initialized: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("❌ Error initializing WebSocket:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to initialize WebSocket server",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
