import { initializeDatabase } from "../lib/database"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

async function main() {
  try {
    console.log("Initializing database...")
    await initializeDatabase()
    console.log("✅ Database initialized successfully!")
    console.log("Tables created:")
    console.log("- messages (with indexes)")
    console.log("- users (with indexes)")
    console.log("- favourite_users (with indexes)")
    process.exit(0)
  } catch (error) {
    console.error("❌ Failed to initialize database:", error)
    process.exit(1)
  }
}

main()
