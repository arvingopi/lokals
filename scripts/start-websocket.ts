import { getWebSocketServer } from "../lib/websocket-server"
import { initializeDatabase } from "../lib/database"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

async function startServer() {
  try {
    console.log("🚀 Starting chat application...")

    // Initialize database
    console.log("📊 Initializing database...")
    await initializeDatabase()
    console.log("✅ Database ready!")

    // Start WebSocket server
    console.log("🔌 Starting WebSocket server...")
    getWebSocketServer()
    console.log("✅ WebSocket server ready!")

    console.log("🎉 Chat application is ready!")
    console.log("📱 WebSocket: ws://localhost:8080")
    console.log("🌐 Web app: http://localhost:3000")
  } catch (error) {
    console.error("❌ Failed to start server:", error)
    process.exit(1)
  }
}

startServer()
