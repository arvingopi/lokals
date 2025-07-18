import { neon } from "@neondatabase/serverless"

let sql: ReturnType<typeof neon>

function getSql() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required")
    }
    sql = neon(process.env.DATABASE_URL)
  }
  return sql
}

// Database interfaces
export interface Message {
  id: string
  content: string
  timestamp: Date
  user_id: string
  username: string
  zipcode: string
  is_private: boolean
  recipient_id?: string
  session_id?: string
}

export interface User {
  id: string
  username: string
  last_seen: Date
  zipcode: string
  is_online: boolean
  session_id?: string
}

export interface FavouriteUser {
  id: string
  user_id: string
  favourite_user_id: string
  favourite_username: string
  created_at: Date
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Create messages table
    await getSql()`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id VARCHAR(50) NOT NULL,
        username VARCHAR(50) NOT NULL,
        zipcode VARCHAR(10) NOT NULL,
        is_private BOOLEAN DEFAULT FALSE,
        recipient_id VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create users table
    await getSql()`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        zipcode VARCHAR(10) NOT NULL,
        is_online BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create favourite_users table
    await getSql()`
      CREATE TABLE IF NOT EXISTS favourite_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(50) NOT NULL,
        favourite_user_id VARCHAR(50) NOT NULL,
        favourite_username VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, favourite_user_id)
      )
    `

    // Create indexes for better performance
    await getSql()`CREATE INDEX IF NOT EXISTS idx_messages_zipcode ON messages(zipcode, timestamp DESC)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_messages_private ON messages(user_id, recipient_id, timestamp DESC) WHERE is_private = TRUE`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_users_zipcode ON users(zipcode, last_seen DESC)`
    await getSql()`CREATE INDEX IF NOT EXISTS idx_favourite_users ON favourite_users(user_id, created_at DESC)`

    console.log("Database initialized successfully")
  } catch (error) {
    console.error("Error initializing database:", error)
    throw error
  }
}

// Message operations
export async function saveMessage(
  content: string,
  userId: string,
  username: string,
  zipcode: string,
  isPrivate = false,
  recipientId?: string,
  sessionId?: string
): Promise<Message> {
  const result = await getSql()`
    INSERT INTO messages (content, user_id, username, zipcode, is_private, recipient_id, session_id)
    VALUES (${content}, ${userId}, ${username}, ${zipcode}, ${isPrivate}, ${recipientId || null}, ${sessionId || null})
    RETURNING *
  `
  return result[0] as Message
}

export async function getRoomMessages(zipcode: string, limit = 50): Promise<Message[]> {
  const result = await getSql()`
    SELECT * FROM messages 
    WHERE zipcode = ${zipcode} AND is_private = FALSE
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `
  return (result as Message[]).reverse()
}

export async function getPrivateMessages(userId1: string, userId2: string, limit = 50): Promise<Message[]> {
  const result = await getSql()`
    SELECT * FROM messages 
    WHERE is_private = TRUE 
    AND ((user_id = ${userId1} AND recipient_id = ${userId2}) 
         OR (user_id = ${userId2} AND recipient_id = ${userId1}))
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `
  return (result as Message[]).reverse()
}

// User operations
export async function upsertUser(userId: string, username: string, zipcode: string, sessionId?: string): Promise<User> {
  const result = await getSql()`
    INSERT INTO users (id, username, zipcode, last_seen, is_online, session_id)
    VALUES (${userId}, ${username}, ${zipcode}, NOW(), TRUE, ${sessionId || null})
    ON CONFLICT (id) 
    DO UPDATE SET 
      username = EXCLUDED.username,
      zipcode = EXCLUDED.zipcode,
      last_seen = NOW(),
      is_online = TRUE,
      session_id = EXCLUDED.session_id
    RETURNING *
  `
  return result[0] as User
}

export async function updateUserPresence(userId: string): Promise<void> {
  await getSql()`
    UPDATE users 
    SET last_seen = NOW(), is_online = TRUE
    WHERE id = ${userId}
  `
}

export async function setUserOffline(userId: string): Promise<void> {
  await getSql()`
    UPDATE users 
    SET is_online = FALSE
    WHERE id = ${userId}
  `
}

export async function getActiveUsers(zipcode: string): Promise<User[]> {
  const result = await getSql()`
    SELECT * FROM users 
    WHERE zipcode = ${zipcode} 
    AND (is_online = TRUE OR last_seen > NOW() - INTERVAL '2 minutes')
    ORDER BY last_seen DESC
  `
  return result as User[]
}

// Cleanup functions
export async function cleanupOldData(): Promise<void> {
  // Mark users offline if they haven't been seen in 5 minutes
  await getSql()`
    UPDATE users 
    SET is_online = FALSE 
    WHERE last_seen < NOW() - INTERVAL '5 minutes'
  `

  // Delete old messages (keep last 30 days)
  await getSql()`
    DELETE FROM messages 
    WHERE timestamp < NOW() - INTERVAL '30 days'
  `

  // Delete old users (keep last 7 days)
  await getSql()`
    DELETE FROM users 
    WHERE last_seen < NOW() - INTERVAL '7 days'
  `
}

export async function savePrivateMessage(
  senderId: string,
  recipientId: string,
  content: string,
  username: string,
  sessionId?: string
): Promise<Message> {
  const result = await getSql()`
    INSERT INTO messages (content, user_id, username, zipcode, is_private, recipient_id, session_id)
    VALUES (${content}, ${senderId}, ${username}, '', TRUE, ${recipientId}, ${sessionId || null})
    RETURNING *
  `
  return result[0] as Message
}

export async function getMessages(zipcode: string, limit = 50): Promise<Message[]> {
  const result = await getSql()`
    SELECT * FROM messages 
    WHERE zipcode = ${zipcode} AND is_private = FALSE
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `
  return (result as Message[]).reverse()
}

// Favourite user operations
export async function addFavouriteUser(userId: string, favouriteUserId: string, favouriteUsername: string): Promise<FavouriteUser> {
  const result = await getSql()`
    INSERT INTO favourite_users (user_id, favourite_user_id, favourite_username)
    VALUES (${userId}, ${favouriteUserId}, ${favouriteUsername})
    ON CONFLICT (user_id, favourite_user_id) DO NOTHING
    RETURNING *
  `
  return result[0] as FavouriteUser
}

export async function removeFavouriteUser(userId: string, favouriteUserId: string): Promise<void> {
  await getSql()`
    DELETE FROM favourite_users 
    WHERE user_id = ${userId} AND favourite_user_id = ${favouriteUserId}
  `
}

export async function getFavouriteUsers(userId: string): Promise<FavouriteUser[]> {
  const result = await getSql()`
    SELECT * FROM favourite_users 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `
  return result as FavouriteUser[]
}

export async function isFavouriteUser(userId: string, favouriteUserId: string): Promise<boolean> {
  const result = await getSql()`
    SELECT 1 FROM favourite_users 
    WHERE user_id = ${userId} AND favourite_user_id = ${favouriteUserId}
    LIMIT 1
  `
  return result.length > 0
}

// Active chat operations
export interface ActiveChatUser {
  user_id: string
  username: string
  last_message_time: Date
  last_message_content: string
  is_sender: boolean
}

export async function getActiveChats(userId: string, limit = 10): Promise<ActiveChatUser[]> {
  const result = await getSql()`
    WITH recent_messages AS (
      SELECT 
        CASE 
          WHEN user_id = ${userId} THEN recipient_id 
          ELSE user_id 
        END as chat_user_id,
        CASE 
          WHEN user_id = ${userId} THEN (
            SELECT username FROM users WHERE id = recipient_id LIMIT 1
          )
          ELSE username 
        END as chat_username,
        content,
        timestamp,
        user_id = ${userId} as is_sender,
        ROW_NUMBER() OVER (
          PARTITION BY CASE 
            WHEN user_id = ${userId} THEN recipient_id 
            ELSE user_id 
          END 
          ORDER BY timestamp DESC
        ) as rn
      FROM messages 
      WHERE is_private = TRUE 
        AND (user_id = ${userId} OR recipient_id = ${userId})
        AND timestamp > NOW() - INTERVAL '7 days'
    )
    SELECT 
      chat_user_id as user_id,
      chat_username as username,
      timestamp as last_message_time,
      content as last_message_content,
      is_sender
    FROM recent_messages 
    WHERE rn = 1 
      AND chat_user_id IS NOT NULL 
      AND chat_username IS NOT NULL
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `
  return result as ActiveChatUser[]
}
