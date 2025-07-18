// Firebase Authentication wrapper - maintaining same interface as session-manager
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth'
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  Timestamp
} from 'firebase/firestore'
import { auth, firestore } from './firebase'
import { generateUserId, generateUsername } from './user-persistence'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// Types (maintaining compatibility with existing interfaces)
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

// Firebase user session document structure
interface FirebaseUserSession {
  sessionId: string
  userId: string
  firebaseUid: string
  encryptedProfileData: string
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

// Device transfer code structure
interface DeviceTransferCode {
  code: string
  sessionId: string
  createdAt: Timestamp
  expiresAt: Timestamp
  maxUses: number
  usesCount: number
  usedAt?: Timestamp
}

// Encryption functions (keep same as before)
function getEncryptionKey(): string {
  const key = process.env.SESSION_ENCRYPTION_KEY
  if (!key) {
    throw new Error("SESSION_ENCRYPTION_KEY environment variable is required")
  }
  if (key.length !== 64) {
    throw new Error("SESSION_ENCRYPTION_KEY must be exactly 64 characters (32 bytes hex)")
  }
  return key
}

function encryptProfile(profile: SessionProfile): string {
  try {
    const data = JSON.stringify(profile)
    const key = Buffer.from(getEncryptionKey(), 'hex')
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    cipher.setAAD(Buffer.from('lokals-session', 'utf8'))
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
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

function decryptProfile(encryptedData: string): SessionProfile {
  try {
    return decryptProfileNew(encryptedData)
  } catch (_newDecryptError) {
    try {
      return decryptProfileLegacy(encryptedData)
    } catch (_legacyDecryptError) {
      throw new Error('Invalid or corrupted session data')
    }
  }
}

function decryptProfileNew(encryptedData: string): SessionProfile {
  const key = Buffer.from(getEncryptionKey(), 'hex')
  const combined = Buffer.from(encryptedData, 'base64')
  
  if (combined.length < 44) {
    throw new Error('Data too short for new format')
  }
  
  const iv = combined.subarray(0, 12)
  const authTag = combined.subarray(12, 28)
  const encrypted = combined.subarray(28)
  
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAAD(Buffer.from('lokals-session', 'utf8'))
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, undefined, 'utf8')
  decrypted += decipher.final('utf8')
  
  return JSON.parse(decrypted)
}

function decryptProfileLegacy(encryptedData: string): SessionProfile {
  const decrypted = Buffer.from(encryptedData, 'base64').toString('utf8')
  const profile = JSON.parse(decrypted)
  
  if (!profile.userId || !profile.username) {
    throw new Error('Invalid legacy session format')
  }
  
  return profile
}

// Firebase Authentication wrapper
class FirebaseAuthManager {
  private currentUser: FirebaseUser | null = null
  private currentSession: UserSession | null = null
  private currentProfile: SessionProfile | null = null

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user
      if (user) {
        this.loadUserSession(user.uid)
      }
    })
  }

  private async loadUserSession(firebaseUid: string) {
    try {
      const sessionDoc = await getDoc(doc(firestore, 'user_sessions', firebaseUid))
      if (sessionDoc.exists()) {
        const data = sessionDoc.data() as FirebaseUserSession
        this.currentSession = {
          session_id: data.sessionId,
          encrypted_profile_data: data.encryptedProfileData,
          created_at: data.createdAt.toDate(),
          expires_at: data.expiresAt.toDate(),
          device_count: data.deviceCount,
          last_active: data.lastActive.toDate()
        }
        this.currentProfile = decryptProfile(data.encryptedProfileData)
      }
    } catch (error) {
      console.error('Failed to load user session:', error)
    }
  }

  async signInAnonymously(): Promise<{
    session: UserSession
    profile: SessionProfile
    isNew: boolean
  }> {
    try {
      const userCredential = await signInAnonymously(auth)
      const firebaseUser = userCredential.user
      
      // Check if session exists
      const sessionDoc = await getDoc(doc(firestore, 'user_sessions', firebaseUser.uid))
      
      if (sessionDoc.exists()) {
        // Existing session
        const data = sessionDoc.data() as FirebaseUserSession
        const session: UserSession = {
          session_id: data.sessionId,
          encrypted_profile_data: data.encryptedProfileData,
          created_at: data.createdAt.toDate(),
          expires_at: data.expiresAt.toDate(),
          device_count: data.deviceCount,
          last_active: data.lastActive.toDate()
        }
        const profile = decryptProfile(data.encryptedProfileData)
        
        // Update last active
        await updateDoc(doc(firestore, 'user_sessions', firebaseUser.uid), {
          lastActive: Timestamp.now()
        })
        
        return { session, profile, isNew: false }
      } else {
        // New session
        const profile: SessionProfile = {
          userId: generateUserId(),
          username: generateUsername(),
          createdAt: new Date().toISOString()
        }
        
        const session = await this.createSession(profile, firebaseUser.uid)
        return { session, profile, isNew: true }
      }
    } catch (error) {
      console.error('Anonymous sign in failed:', error)
      throw error
    }
  }

  private async createSession(profile: SessionProfile, firebaseUid: string): Promise<UserSession> {
    const now = Timestamp.now()
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1 year expiry
    
    const encryptedData = encryptProfile(profile)
    
    const sessionData: FirebaseUserSession = {
      sessionId: firebaseUid, // Use Firebase UID as session ID
      userId: profile.userId,
      firebaseUid,
      encryptedProfileData: encryptedData,
      createdAt: now,
      expiresAt: Timestamp.fromDate(expiresAt),
      deviceCount: 1,
      lastActive: now,
      devices: {
        'web-device': {
          deviceType: 'web',
          authorizedAt: now,
          lastSeen: now,
          isActive: true
        }
      }
    }
    
    await setDoc(doc(firestore, 'user_sessions', firebaseUid), sessionData)
    
    return {
      session_id: firebaseUid,
      encrypted_profile_data: encryptedData,
      created_at: now.toDate(),
      expires_at: expiresAt,
      device_count: 1,
      last_active: now.toDate()
    }
  }

  async updateSessionProfile(updates: Partial<SessionProfile>): Promise<void> {
    if (!this.currentUser || !this.currentProfile) {
      throw new Error('No active session')
    }
    
    const updatedProfile = { ...this.currentProfile, ...updates }
    const encryptedData = encryptProfile(updatedProfile)
    
    await updateDoc(doc(firestore, 'user_sessions', this.currentUser.uid), {
      encryptedProfileData: encryptedData,
      lastActive: Timestamp.now()
    })
    
    this.currentProfile = updatedProfile
  }

  async linkDeviceToSession(deviceFingerprint: string, deviceType: string = 'web'): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No active session')
    }
    
    const sessionRef = doc(firestore, 'user_sessions', this.currentUser.uid)
    const sessionDoc = await getDoc(sessionRef)
    
    if (sessionDoc.exists()) {
      const data = sessionDoc.data() as FirebaseUserSession
      const devices = data.devices || {}
      
      devices[deviceFingerprint] = {
        deviceType,
        authorizedAt: Timestamp.now(),
        lastSeen: Timestamp.now(),
        isActive: true
      }
      
      await updateDoc(sessionRef, {
        devices,
        deviceCount: Object.keys(devices).length,
        lastActive: Timestamp.now()
      })
    }
  }

  async generateTransferCode(): Promise<string> {
    if (!this.currentUser) {
      throw new Error('No active session')
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const now = Timestamp.now()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 15) // 15 minutes expiry
    
    const transferCodeData: DeviceTransferCode = {
      code,
      sessionId: this.currentUser.uid,
      createdAt: now,
      expiresAt: Timestamp.fromDate(expiresAt),
      maxUses: 1,
      usesCount: 0
    }
    
    await setDoc(doc(firestore, 'device_transfer_codes', code), transferCodeData)
    return code
  }

  async useTransferCode(code: string): Promise<{
    success: boolean
    sessionId?: string
    error?: string
  }> {
    try {
      const codeDoc = await getDoc(doc(firestore, 'device_transfer_codes', code))
      
      if (!codeDoc.exists()) {
        return { success: false, error: 'Invalid code' }
      }
      
      const data = codeDoc.data() as DeviceTransferCode
      
      if (data.expiresAt.toDate() < new Date()) {
        return { success: false, error: 'Code expired' }
      }
      
      if (data.usesCount >= data.maxUses) {
        return { success: false, error: 'Code already used' }
      }
      
      // Sign in to the session
      const sessionDoc = await getDoc(doc(firestore, 'user_sessions', data.sessionId))
      if (sessionDoc.exists()) {
            
        // Add device to session
        await this.linkDeviceToSession('web-device')
        
        // Update transfer code usage
        await updateDoc(doc(firestore, 'device_transfer_codes', code), {
          usesCount: data.usesCount + 1,
          usedAt: Timestamp.now()
        })
        
        return { success: true, sessionId: data.sessionId }
      }
      
      return { success: false, error: 'Session not found' }
    } catch (error) {
      console.error('Transfer code usage failed:', error)
      return { success: false, error: 'Failed to use transfer code' }
    }
  }

  async signOut(): Promise<void> {
    await signOut(auth)
    this.currentUser = null
    this.currentSession = null
    this.currentProfile = null
  }

  getCurrentUser(): FirebaseUser | null {
    return this.currentUser
  }

  getCurrentSession(): UserSession | null {
    return this.currentSession
  }

  getCurrentProfile(): SessionProfile | null {
    return this.currentProfile
  }

  async cleanupExpiredData(): Promise<void> {
    const now = Timestamp.now()
    
    // Clean expired transfer codes
    const codesRef = collection(firestore, 'device_transfer_codes')
    const expiredCodesQuery = query(codesRef, where('expiresAt', '<', now))
    const expiredCodes = await getDocs(expiredCodesQuery)
    
    expiredCodes.forEach(async (doc) => {
      await deleteDoc(doc.ref)
    })
    
    // Clean expired sessions
    const sessionsRef = collection(firestore, 'user_sessions')
    const expiredSessionsQuery = query(sessionsRef, where('expiresAt', '<', now))
    const expiredSessions = await getDocs(expiredSessionsQuery)
    
    expiredSessions.forEach(async (doc) => {
      await deleteDoc(doc.ref)
    })
  }
}

// Export singleton instance
const firebaseAuthManager = new FirebaseAuthManager()

// Legacy compatibility functions
export async function createSession(_profile: SessionProfile, _deviceFingerprint: string): Promise<UserSession> {
  const result = await firebaseAuthManager.signInAnonymously()
  return result.session
}

export async function getOrCreateSession(_deviceFingerprint: string): Promise<{
  session: UserSession
  profile: SessionProfile
  isNew: boolean
}> {
  return await firebaseAuthManager.signInAnonymously()
}

export async function getSessionByDevice(_deviceFingerprint: string): Promise<{
  session: UserSession | null
  profile: SessionProfile | null
}> {
  const currentSession = firebaseAuthManager.getCurrentSession()
  const currentProfile = firebaseAuthManager.getCurrentProfile()
  
  return {
    session: currentSession,
    profile: currentProfile
  }
}

export async function updateSessionProfile(sessionId: string, updates: Partial<SessionProfile>): Promise<void> {
  await firebaseAuthManager.updateSessionProfile(updates)
}

export async function linkDeviceToSession(sessionId: string, deviceFingerprint: string, deviceType: string = 'web'): Promise<void> {
  await firebaseAuthManager.linkDeviceToSession(deviceFingerprint, deviceType)
}

export async function generateTransferCode(_sessionId: string): Promise<string> {
  return await firebaseAuthManager.generateTransferCode()
}

export async function useTransferCode(code: string, _deviceFingerprint: string): Promise<{
  success: boolean
  sessionId?: string
  error?: string
}> {
  return await firebaseAuthManager.useTransferCode(code)
}

export async function cleanupExpiredData(): Promise<void> {
  await firebaseAuthManager.cleanupExpiredData()
}

// Export the manager for direct use
export default firebaseAuthManager