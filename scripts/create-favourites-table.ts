import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

async function createFavouritesTable() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required")
    }
    
    const sql = neon(process.env.DATABASE_URL)
    
    console.log("Creating favourite_users table...")
    
    // Create favourite_users table
    await sql`
      CREATE TABLE IF NOT EXISTS favourite_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(50) NOT NULL,
        favourite_user_id VARCHAR(50) NOT NULL,
        favourite_username VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, favourite_user_id)
      )
    `
    
    // Create index
    await sql`CREATE INDEX IF NOT EXISTS idx_favourite_users ON favourite_users(user_id, created_at DESC)`
    
    console.log("✅ favourite_users table created successfully!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Failed to create favourite_users table:", error)
    process.exit(1)
  }
}

createFavouritesTable()