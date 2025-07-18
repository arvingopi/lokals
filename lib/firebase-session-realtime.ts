// Server-side Firebase session management using only Realtime Database
import { 
  ref, 
  get, 
  set, 
  update,
  child
} from 'firebase/database'
import { database } from './firebase'
import { generateUserId, generateUsername } from './user-persistence'

// Types for compatibility
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

// Session structure in Realtime Database
interface RealtimeSessionDoc {
  sessionId: string
  userId: string
  profileData: SessionProfile
  createdAt: number
  expiresAt: number
  deviceCount: number
  lastActive: number
  devices: {
    [deviceFingerprint: string]: {
      deviceType: string
      deviceName?: string
      authorizedAt: number
      lastSeen: number
      isActive: boolean
    }
  }
}

export async function getOrCreateSession(deviceFingerprint: string): Promise<{
  session: UserSession
  profile: SessionProfile
  isNew: boolean
}> {
  try {
    // Check if we have an existing session for this device
    const deviceSessionRef = ref(database, `device_sessions/${deviceFingerprint}`)
    const deviceSnapshot = await get(deviceSessionRef)
    
    if (deviceSnapshot.exists()) {
      const deviceData = deviceSnapshot.val()
      const sessionId = deviceData.sessionId
      
      // Get the actual session data
      const sessionRef = ref(database, `user_sessions/${sessionId}`)
      const sessionSnapshot = await get(sessionRef)
      
      if (sessionSnapshot.exists()) {
        const sessionData = sessionSnapshot.val() as RealtimeSessionDoc
        
        // Update last active
        await update(sessionRef, {
          lastActive: Date.now()
        })
        
        const session: UserSession = {
          session_id: sessionData.sessionId,
          encrypted_profile_data: JSON.stringify(sessionData.profileData),
          created_at: new Date(sessionData.createdAt),
          expires_at: new Date(sessionData.expiresAt),
          device_count: sessionData.deviceCount,
          last_active: new Date(sessionData.lastActive)
        }
        
        return { session, profile: sessionData.profileData, isNew: false }
      }
    }
    
    // Create new session
    const profile: SessionProfile = {
      userId: generateUserId(),
      username: generateUsername(),
      createdAt: new Date().toISOString()
    }
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const now = Date.now()
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1 year expiry
    
    const sessionData: RealtimeSessionDoc = {
      sessionId,
      userId: profile.userId,
      profileData: profile,
      createdAt: now,
      expiresAt: expiresAt.getTime(),
      deviceCount: 1,
      lastActive: now,
      devices: {
        [deviceFingerprint]: {
          deviceType: 'web',
          authorizedAt: now,
          lastSeen: now,
          isActive: true
        }
      }
    }
    
    // Create session document
    await set(ref(database, `user_sessions/${sessionId}`), sessionData)
    
    // Create device mapping
    await set(ref(database, `device_sessions/${deviceFingerprint}`), {
      sessionId,
      deviceType: 'web',
      createdAt: now,
      lastSeen: now
    })
    
    const session: UserSession = {
      session_id: sessionId,
      encrypted_profile_data: JSON.stringify(profile),
      created_at: new Date(now),
      expires_at: expiresAt,
      device_count: 1,
      last_active: new Date(now)
    }
    
    return { session, profile, isNew: true }
    
  } catch (error) {
    console.error('Error in getOrCreateSession:', error)
    throw error
  }
}

export async function getSessionByDevice(deviceFingerprint: string): Promise<{
  session: UserSession | null
  profile: SessionProfile | null
}> {
  try {
    const deviceSessionRef = ref(database, `device_sessions/${deviceFingerprint}`)
    const deviceSnapshot = await get(deviceSessionRef)
    
    if (!deviceSnapshot.exists()) {
      return { session: null, profile: null }
    }
    
    const deviceData = deviceSnapshot.val()
    const sessionId = deviceData.sessionId
    
    const sessionRef = ref(database, `user_sessions/${sessionId}`)
    const sessionSnapshot = await get(sessionRef)
    
    if (!sessionSnapshot.exists()) {
      return { session: null, profile: null }
    }
    
    const sessionData = sessionSnapshot.val() as RealtimeSessionDoc
    
    const session: UserSession = {
      session_id: sessionData.sessionId,
      encrypted_profile_data: JSON.stringify(sessionData.profileData),
      created_at: new Date(sessionData.createdAt),
      expires_at: new Date(sessionData.expiresAt),
      device_count: sessionData.deviceCount,
      last_active: new Date(sessionData.lastActive)
    }
    
    return { session, profile: sessionData.profileData }
    
  } catch (error) {
    console.error('Error in getSessionByDevice:', error)
    return { session: null, profile: null }
  }
}

export async function updateSessionProfile(sessionId: string, updates: Partial<SessionProfile>): Promise<void> {
  try {
    const sessionRef = ref(database, `user_sessions/${sessionId}`)
    const sessionSnapshot = await get(sessionRef)
    
    if (!sessionSnapshot.exists()) {
      throw new Error('Session not found')
    }
    
    const sessionData = sessionSnapshot.val() as RealtimeSessionDoc
    const updatedProfile = { ...sessionData.profileData, ...updates }
    
    await update(sessionRef, {
      profileData: updatedProfile,
      lastActive: Date.now()
    })
    
  } catch (error) {
    console.error('Error in updateSessionProfile:', error)
    throw error
  }
}