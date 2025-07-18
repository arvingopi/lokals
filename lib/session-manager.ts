// Session management for cross-device persistence
import { neon } from "@neondatabase/serverless"
import { getDeviceFingerprint } from "./device-fingerprint"
import { generateUserId, generateUsername } from "./user-persistence"
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// Types
export interface UserSession {
  session_id: string
  encrypted_profile_data: string
  created_at: Date
  expires_at: Date
  device_count: number
  last_active: Date
}

export interface SessionProfile {
  userId: string
  username: string
  zipcode?: string
  gender?: string
  age?: string
  createdAt: string
}

export interface DeviceInfo {
  fingerprint_hash: string
  device_type: string
  device_name?: string
  authorized_at: Date
  last_seen: Date
  is_active: boolean
}

// Encryption key - MUST be set in production
function getEncryptionKey(): string {
  const key = process.env.SESSION_ENCRYPTION_KEY
  if (!key) {
    console.error("SESSION_ENCRYPTION_KEY environment variable is not set!")
    throw new Error("SESSION_ENCRYPTION_KEY environment variable is required")
  }
  if (key.length !== 64) {
    console.error(`SESSION_ENCRYPTION_KEY length is ${key.length}, expected 64`)
    throw new Error("SESSION_ENCRYPTION_KEY must be exactly 64 characters (32 bytes hex)")
  }
  return key
}

// Get database connection
function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required")
  }
  return neon(process.env.DATABASE_URL)
}

// Encrypt profile data using AES-256-GCM
function encryptProfile(profile: SessionProfile): string {
  try {
    const data = JSON.stringify(profile)
    const key = Buffer.from(getEncryptionKey(), 'hex')
    
    // Generate random IV (12 bytes for GCM)
    const iv = randomBytes(12)
    
    // Create cipher
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    cipher.setAAD(Buffer.from('lokals-session', 'utf8'))
    
    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Get authentication tag
    const authTag = cipher.getAuthTag()
    
    // Combine IV + authTag + encrypted data
    const result = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]).toString('base64')
    
    return result
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('Failed to encrypt session data')
  }
}

// Decrypt profile data with backward compatibility
function decryptProfile(encryptedData: string): SessionProfile {
  try {
    // First, try new AES-256-GCM decryption
    return decryptProfileNew(encryptedData)
  } catch (newDecryptError) {
    console.log('New decryption failed, trying legacy base64 decryption...')
    try {
      // Fallback to old base64 decryption for existing sessions
      return decryptProfileLegacy(encryptedData)
    } catch (legacyDecryptError) {
      console.error('Both decryption methods failed:', { newDecryptError, legacyDecryptError })
      throw new Error('Invalid or corrupted session data')
    }
  }
}

// New AES-256-GCM decryption
function decryptProfileNew(encryptedData: string): SessionProfile {
  const key = Buffer.from(getEncryptionKey(), 'hex')
  const combined = Buffer.from(encryptedData, 'base64')
  
  // Check if this looks like new format (has enough bytes for IV + authTag)
  if (combined.length < 44) { // 12 (IV) + 16 (authTag) + 16 (minimum encrypted data)
    throw new Error('Data too short for new format')
  }
  
  // Extract components
  const iv = combined.subarray(0, 12)
  const authTag = combined.subarray(12, 28)
  const encrypted = combined.subarray(28)
  
  // Create decipher
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAAD(Buffer.from('lokals-session', 'utf8'))
  decipher.setAuthTag(authTag)
  
  // Decrypt data
  let decrypted = decipher.update(encrypted, undefined, 'utf8')
  decrypted += decipher.final('utf8')
  
  return JSON.parse(decrypted)
}

// Legacy base64 decryption (for backward compatibility)
function decryptProfileLegacy(encryptedData: string): SessionProfile {
  const decrypted = Buffer.from(encryptedData, 'base64').toString('utf8')
  const profile = JSON.parse(decrypted)
  
  // Validate that this looks like a session profile
  if (!profile.userId || !profile.username) {
    throw new Error('Invalid legacy session format')
  }
  
  console.log('Successfully decrypted legacy session, will re-encrypt with new format')
  return profile
}

// Create new session
export async function createSession(profile: SessionProfile, deviceFingerprint: string): Promise<UserSession> {
  const sql = getSql()
  
  // Encrypt profile data
  const encryptedData = encryptProfile(profile)
  
  // Create session
  const [session] = await sql`
    INSERT INTO user_sessions (encrypted_profile_data)
    VALUES (${encryptedData})
    RETURNING *
  `
  
  // Link device to session
  await linkDeviceToSession(session.session_id, deviceFingerprint)
  
  return session
}

// Link device to existing session
export async function linkDeviceToSession(
  sessionId: string, 
  deviceFingerprint: string, 
  deviceType: string = 'unknown'
): Promise<void> {
  const sql = getSql()
  
  // Check if device exists
  const [existingDevice] = await sql`
    SELECT * FROM device_fingerprints 
    WHERE fingerprint_hash = ${deviceFingerprint}
  `
  
  if (!existingDevice) {
    // Create new device record
    await sql`
      INSERT INTO device_fingerprints (fingerprint_hash, session_id)
      VALUES (${deviceFingerprint}, ${sessionId})
    `
  } else {
    // Update existing device
    await sql`
      UPDATE device_fingerprints 
      SET session_id = ${sessionId}, last_seen = NOW()
      WHERE fingerprint_hash = ${deviceFingerprint}
    `
  }
  
  // Create or update session_devices link
  await sql`
    INSERT INTO session_devices (session_id, device_fingerprint, device_type)
    VALUES (${sessionId}, ${deviceFingerprint}, ${deviceType})
    ON CONFLICT (session_id, device_fingerprint) 
    DO UPDATE SET last_seen = NOW(), is_active = TRUE
  `
  
  // Update device count
  await sql`
    UPDATE user_sessions 
    SET device_count = (
      SELECT COUNT(*) FROM session_devices 
      WHERE session_id = ${sessionId} AND is_active = TRUE
    )
    WHERE session_id = ${sessionId}
  `
}

// Get session by device fingerprint
export async function getSessionByDevice(deviceFingerprint: string): Promise<{
  session: UserSession | null
  profile: SessionProfile | null
}> {
  const sql = getSql()
  
  console.log('🔍 DB: Looking for device fingerprint in database:', deviceFingerprint.substring(0, 8) + '...')
  
  const [device] = await sql`
    SELECT df.*, s.*
    FROM device_fingerprints df
    JOIN user_sessions s ON df.session_id = s.session_id
    WHERE df.fingerprint_hash = ${deviceFingerprint}
    AND s.expires_at > NOW()
  `
  
  if (!device) {
    console.log('❌ DB: No existing session found for this device')
    return { session: null, profile: null }
  }
  
  console.log('✅ DB: Found existing session:', {
    sessionId: device.session_id.substring(0, 8) + '...',
    deviceCount: device.device_count,
    createdAt: device.created_at
  })
  
  // Update last seen
  await sql`
    UPDATE device_fingerprints 
    SET last_seen = NOW()
    WHERE fingerprint_hash = ${deviceFingerprint}
  `
  
  await sql`
    UPDATE session_devices 
    SET last_seen = NOW()
    WHERE session_id = ${device.session_id} 
    AND device_fingerprint = ${deviceFingerprint}
  `
  
  await sql`
    UPDATE user_sessions 
    SET last_active = NOW()
    WHERE session_id = ${device.session_id}
  `
  
  let profile: SessionProfile
  try {
    profile = decryptProfile(device.encrypted_profile_data)
    
    // If we successfully decrypted a legacy session, update it with new encryption
    if (device.encrypted_profile_data.length < 100) { // Likely legacy format
      console.log('Upgrading legacy session to new encryption format')
      const newEncryptedData = encryptProfile(profile)
      
      // Update the database with new encryption
      await sql`
        UPDATE user_sessions 
        SET encrypted_profile_data = ${newEncryptedData}
        WHERE session_id = ${device.session_id}
      `
    }
  } catch (error) {
    console.error('Session decryption failed:', error)
    return { session: null, profile: null }
  }
  
  return {
    session: {
      session_id: device.session_id,
      encrypted_profile_data: device.encrypted_profile_data,
      created_at: device.created_at,
      expires_at: device.expires_at,
      device_count: device.device_count,
      last_active: device.last_active
    },
    profile
  }
}

// Get or create session for device
export async function getOrCreateSession(deviceFingerprint: string): Promise<{
  session: UserSession
  profile: SessionProfile
  isNew: boolean
}> {
  console.log('🔄 getOrCreateSession: Starting for fingerprint:', deviceFingerprint.substring(0, 8) + '...')
  
  // Check for existing session
  const existing = await getSessionByDevice(deviceFingerprint)
  
  if (existing.session && existing.profile) {
    console.log('✅ getOrCreateSession: Using existing session')
    return {
      session: existing.session,
      profile: existing.profile,
      isNew: false
    }
  }
  
  console.log('🆕 getOrCreateSession: Creating new session')
  // Create new session
  const newProfile: SessionProfile = {
    userId: generateUserId(),
    username: generateUsername(),
    createdAt: new Date().toISOString()
  }
  
  const session = await createSession(newProfile, deviceFingerprint)
  
  return {
    session,
    profile: newProfile,
    isNew: true
  }
}

// Update session profile
export async function updateSessionProfile(
  sessionId: string, 
  updates: Partial<SessionProfile>
): Promise<void> {
  const sql = getSql()
  
  // Get current session
  const [currentSession] = await sql`
    SELECT * FROM user_sessions 
    WHERE session_id = ${sessionId}
  `
  
  if (!currentSession) {
    throw new Error('Session not found')
  }
  
  // Decrypt current profile
  const currentProfile = decryptProfile(currentSession.encrypted_profile_data)
  
  // Merge updates
  const updatedProfile = { ...currentProfile, ...updates }
  
  // Encrypt and save
  const encryptedData = encryptProfile(updatedProfile)
  
  await sql`
    UPDATE user_sessions 
    SET encrypted_profile_data = ${encryptedData}, last_active = NOW()
    WHERE session_id = ${sessionId}
  `
}

// Get devices for session
export async function getSessionDevices(sessionId: string): Promise<DeviceInfo[]> {
  const sql = getSql()
  
  const devices = await sql`
    SELECT 
      sd.device_fingerprint as fingerprint_hash,
      sd.device_type,
      sd.device_name,
      sd.authorized_at,
      sd.last_seen,
      sd.is_active
    FROM session_devices sd
    WHERE sd.session_id = ${sessionId}
    ORDER BY sd.last_seen DESC
  `
  
  return devices
}

// Remove device from session
export async function removeDeviceFromSession(
  sessionId: string, 
  deviceFingerprint: string
): Promise<void> {
  const sql = getSql()
  
  // Mark device as inactive
  await sql`
    UPDATE session_devices 
    SET is_active = FALSE
    WHERE session_id = ${sessionId} 
    AND device_fingerprint = ${deviceFingerprint}
  `
  
  // Update device count
  await sql`
    UPDATE user_sessions 
    SET device_count = (
      SELECT COUNT(*) FROM session_devices 
      WHERE session_id = ${sessionId} AND is_active = TRUE
    )
    WHERE session_id = ${sessionId}
  `
}

// Generate device transfer code
export async function generateTransferCode(sessionId: string): Promise<string> {
  const sql = getSql()
  
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  
  // Store in database
  await sql`
    INSERT INTO device_transfer_codes (code, session_id)
    VALUES (${code}, ${sessionId})
  `
  
  return code
}

// Use transfer code to link device
export async function useTransferCode(
  code: string, 
  deviceFingerprint: string
): Promise<{
  success: boolean
  sessionId?: string
  error?: string
}> {
  const sql = getSql()
  
  // Get valid transfer code
  const [transferCode] = await sql`
    SELECT * FROM device_transfer_codes
    WHERE code = ${code}
    AND expires_at > NOW()
    AND uses_count < max_uses
  `
  
  if (!transferCode) {
    return { success: false, error: 'Invalid or expired code' }
  }
  
  // Link device to session
  await linkDeviceToSession(transferCode.session_id, deviceFingerprint)
  
  // Update uses count
  await sql`
    UPDATE device_transfer_codes
    SET uses_count = uses_count + 1,
        used_at = CASE WHEN used_at IS NULL THEN NOW() ELSE used_at END
    WHERE code = ${code}
  `
  
  return { success: true, sessionId: transferCode.session_id }
}

// Clean up expired sessions and codes
export async function cleanupExpiredData(): Promise<void> {
  const sql = getSql()
  
  // Clean expired transfer codes
  await sql`
    DELETE FROM device_transfer_codes 
    WHERE expires_at < NOW() AND used_at IS NULL
  `
  
  // Clean expired sessions (optional, sessions have 1 year expiry)
  await sql`
    DELETE FROM user_sessions 
    WHERE expires_at < NOW()
  `
}