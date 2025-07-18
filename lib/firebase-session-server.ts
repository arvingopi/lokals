// Server-side Firebase session management
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  Timestamp
} from 'firebase/firestore'
import { firestore } from './firebase'
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

// Firebase session document structure
interface FirebaseSessionDoc {
  sessionId: string
  userId: string
  profileData: SessionProfile
  createdAt: Timestamp
  expiresAt: Timestamp
  deviceCount: number
  lastActive: Timestamp
  devices: {
    [deviceFingerprint: string]: {
      deviceType: string
      deviceName?: string
      authorizedAt: Timestamp
      lastSeen: Timestamp
      isActive: boolean
    }
  }
}

// Server-side session management
export async function getOrCreateSession(deviceFingerprint: string): Promise<{
  session: UserSession
  profile: SessionProfile
  isNew: boolean
}> {
  try {
    // Check if we have an existing session for this device
    const sessionDoc = await getDoc(doc(firestore, 'device_sessions', deviceFingerprint))
    
    if (sessionDoc.exists()) {
      const deviceData = sessionDoc.data()
      const sessionId = deviceData.sessionId
      
      // Get the actual session data
      const actualSessionDoc = await getDoc(doc(firestore, 'user_sessions', sessionId))
      
      if (actualSessionDoc.exists()) {
        const sessionData = actualSessionDoc.data() as FirebaseSessionDoc
        
        // Update last active
        await updateDoc(doc(firestore, 'user_sessions', sessionId), {
          lastActive: Timestamp.now()
        })
        
        const session: UserSession = {
          session_id: sessionData.sessionId,
          encrypted_profile_data: JSON.stringify(sessionData.profileData),
          created_at: sessionData.createdAt.toDate(),
          expires_at: sessionData.expiresAt.toDate(),
          device_count: sessionData.deviceCount,
          last_active: sessionData.lastActive.toDate()
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
    const now = Timestamp.now()
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1 year expiry
    
    const sessionData: FirebaseSessionDoc = {
      sessionId,
      userId: profile.userId,
      profileData: profile,
      createdAt: now,
      expiresAt: Timestamp.fromDate(expiresAt),
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
    await setDoc(doc(firestore, 'user_sessions', sessionId), sessionData)
    
    // Create device mapping
    await setDoc(doc(firestore, 'device_sessions', deviceFingerprint), {
      sessionId,
      deviceType: 'web',
      createdAt: now,
      lastSeen: now
    })
    
    const session: UserSession = {
      session_id: sessionId,
      encrypted_profile_data: JSON.stringify(profile),
      created_at: now.toDate(),
      expires_at: expiresAt,
      device_count: 1,
      last_active: now.toDate()
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
    const sessionDoc = await getDoc(doc(firestore, 'device_sessions', deviceFingerprint))
    
    if (!sessionDoc.exists()) {
      return { session: null, profile: null }
    }
    
    const deviceData = sessionDoc.data()
    const sessionId = deviceData.sessionId
    
    const actualSessionDoc = await getDoc(doc(firestore, 'user_sessions', sessionId))
    
    if (!actualSessionDoc.exists()) {
      return { session: null, profile: null }
    }
    
    const sessionData = actualSessionDoc.data() as FirebaseSessionDoc
    
    const session: UserSession = {
      session_id: sessionData.sessionId,
      encrypted_profile_data: JSON.stringify(sessionData.profileData),
      created_at: sessionData.createdAt.toDate(),
      expires_at: sessionData.expiresAt.toDate(),
      device_count: sessionData.deviceCount,
      last_active: sessionData.lastActive.toDate()
    }
    
    return { session, profile: sessionData.profileData }
    
  } catch (error) {
    console.error('Error in getSessionByDevice:', error)
    return { session: null, profile: null }
  }
}

export async function updateSessionProfile(sessionId: string, updates: Partial<SessionProfile>): Promise<void> {
  try {
    const sessionDoc = await getDoc(doc(firestore, 'user_sessions', sessionId))
    
    if (!sessionDoc.exists()) {
      throw new Error('Session not found')
    }
    
    const sessionData = sessionDoc.data() as FirebaseSessionDoc
    const updatedProfile = { ...sessionData.profileData, ...updates }
    
    await updateDoc(doc(firestore, 'user_sessions', sessionId), {
      profileData: updatedProfile,
      lastActive: Timestamp.now()
    })
    
  } catch (error) {
    console.error('Error in updateSessionProfile:', error)
    throw error
  }
}