import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

async function migrateDeviceTracking() {
  try {
    console.log("🚀 Starting device tracking migration...")
    
    // Create user_sessions table
    console.log("Creating user_sessions table...")
    await sql`
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        encrypted_profile_data TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 year',
        device_count INTEGER DEFAULT 1,
        last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    // Create device_fingerprints table
    console.log("Creating device_fingerprints table...")
    await sql`
      CREATE TABLE IF NOT EXISTS device_fingerprints (
        fingerprint_hash VARCHAR(64) PRIMARY KEY,
        first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        session_id UUID REFERENCES user_sessions(session_id) ON DELETE CASCADE,
        is_blocked BOOLEAN DEFAULT FALSE,
        device_info JSONB DEFAULT '{}'::jsonb
      )
    `
    
    // Create session_devices table for many-to-many relationship
    console.log("Creating session_devices table...")
    await sql`
      CREATE TABLE IF NOT EXISTS session_devices (
        session_id UUID REFERENCES user_sessions(session_id) ON DELETE CASCADE,
        device_fingerprint VARCHAR(64) REFERENCES device_fingerprints(fingerprint_hash) ON DELETE CASCADE,
        device_type VARCHAR(20) DEFAULT 'unknown',
        device_name VARCHAR(100),
        authorized_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        PRIMARY KEY (session_id, device_fingerprint)
      )
    `
    
    // Create device_transfer_codes table
    console.log("Creating device_transfer_codes table...")
    await sql`
      CREATE TABLE IF NOT EXISTS device_transfer_codes (
        code VARCHAR(10) PRIMARY KEY,
        session_id UUID REFERENCES user_sessions(session_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 minutes',
        used_at TIMESTAMP WITH TIME ZONE,
        max_uses INTEGER DEFAULT 1,
        uses_count INTEGER DEFAULT 0
      )
    `
    
    // Add session_id to users table if not exists
    console.log("Adding session_id to users table...")
    await sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'session_id'
        ) THEN
          ALTER TABLE users ADD COLUMN session_id UUID REFERENCES user_sessions(session_id) ON DELETE SET NULL;
        END IF;
      END $$;
    `
    
    // Add session_id to messages table if not exists
    console.log("Adding session_id to messages table...")
    await sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'messages' AND column_name = 'session_id'
        ) THEN
          ALTER TABLE messages ADD COLUMN session_id UUID REFERENCES user_sessions(session_id) ON DELETE CASCADE;
        END IF;
      END $$;
    `
    
    // Create indexes for performance
    console.log("Creating indexes...")
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_device_fingerprints_session 
      ON device_fingerprints(session_id)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_session_devices_fingerprint 
      ON session_devices(device_fingerprint)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_device_transfer_codes_session 
      ON device_transfer_codes(session_id)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_device_transfer_codes_expires 
      ON device_transfer_codes(expires_at) 
      WHERE used_at IS NULL
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_session_timestamp 
      ON messages(session_id, timestamp DESC)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_session_private 
      ON messages(session_id, user_id, recipient_id) 
      WHERE is_private = TRUE
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_session 
      ON users(session_id)
    `
    
    // Create cleanup function for expired transfer codes
    console.log("Creating cleanup function...")
    await sql`
      CREATE OR REPLACE FUNCTION cleanup_expired_transfer_codes() 
      RETURNS void AS $$
      BEGIN
        DELETE FROM device_transfer_codes 
        WHERE expires_at < NOW() AND used_at IS NULL;
      END;
      $$ LANGUAGE plpgsql;
    `
    
    console.log("✅ Device tracking migration completed successfully!")
    console.log("\nTables created:")
    console.log("- user_sessions")
    console.log("- device_fingerprints")
    console.log("- session_devices")
    console.log("- device_transfer_codes")
    console.log("\nColumns added:")
    console.log("- users.session_id")
    console.log("- messages.session_id")
    console.log("\nIndexes created for optimal performance")
    
    process.exit(0)
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

migrateDeviceTracking()