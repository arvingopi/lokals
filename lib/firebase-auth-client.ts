// Firebase Authentication for client-side (browser) use
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth'
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  Timestamp
} from 'firebase/firestore'
import { auth, firestore } from './firebase'
import { getDeviceFingerprint } from './device-fingerprint'
import { generateUserId, generateUsername } from './user-persistence'

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
  email: string
  username: string
  zipcode?: string
  gender?: string
  age?: string
  createdAt: string
  isLocked: boolean // Profile cannot be modified once locked
}

// Firebase user session document structure
interface FirebaseUserSession {
  sessionId: string
  userId: string
  firebaseUid: string
  profileData: SessionProfile // Store unencrypted for simplicity in client
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

// Firebase Authentication wrapper for client-side
class FirebaseAuthClient {
  private currentUser: FirebaseUser | null = null
  private currentSession: UserSession | null = null
  private currentProfile: SessionProfile | null = null
  private initialized = false

  constructor() {
    this.initialize()
  }

  private async initialize() {
    if (this.initialized) return
    
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user
      if (user) {
        await this.loadUserSession(user.uid)
      }
      this.initialized = true
    })
  }

  private async loadUserSession(firebaseUid: string) {
    try {
      const sessionDoc = await getDoc(doc(firestore, 'user_sessions', firebaseUid))
      if (sessionDoc.exists()) {
        const data = sessionDoc.data() as FirebaseUserSession
        this.currentSession = {
          session_id: data.sessionId,
          encrypted_profile_data: JSON.stringify(data.profileData), // Store as JSON string for compatibility
          created_at: data.createdAt.toDate(),
          expires_at: data.expiresAt.toDate(),
          device_count: data.deviceCount,
          last_active: data.lastActive.toDate()
        }
        this.currentProfile = data.profileData
      }
    } catch (error) {
      console.error('Failed to load user session:', error)
    }
  }

  async signInWithEmail(email: string, password: string): Promise<{
    session: UserSession
    profile: SessionProfile
    isNew: boolean
  }> {
    try {
      // Try to sign in first
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user
      
      return await this.getOrCreateUserSession(firebaseUser, email)
    } catch (error: any) {
      // If user doesn't exist, create a new account
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password)
          const firebaseUser = userCredential.user
          
          return await this.getOrCreateUserSession(firebaseUser, email)
        } catch (createError: any) {
          // If account already exists but password was wrong, try again with sign in
          if (createError.code === 'auth/email-already-in-use') {
            throw new Error('An account with this email already exists. Please check your password and try again.')
          }
          console.error('Failed to create user:', createError)
          throw createError
        }
      }
      
      console.error('Sign in failed:', error)
      throw error
    }
  }


  private async getOrCreateUserSession(firebaseUser: FirebaseUser, email: string): Promise<{
    session: UserSession
    profile: SessionProfile
    isNew: boolean
  }> {
    try {
      // Check if session exists
      const sessionDoc = await getDoc(doc(firestore, 'user_sessions', firebaseUser.uid))
      
      if (sessionDoc.exists()) {
        // Existing session
        const data = sessionDoc.data() as FirebaseUserSession
        const session: UserSession = {
          session_id: data.sessionId,
          encrypted_profile_data: JSON.stringify(data.profileData),
          created_at: data.createdAt.toDate(),
          expires_at: data.expiresAt.toDate(),
          device_count: data.deviceCount,
          last_active: data.lastActive.toDate()
        }
        const profile = data.profileData
        
        // Update last active
        await updateDoc(doc(firestore, 'user_sessions', firebaseUser.uid), {
          lastActive: Timestamp.now()
        })
        
        this.currentSession = session
        this.currentProfile = profile
        
        return { session, profile, isNew: false }
      } else {
        // New session - create with email
        const profile: SessionProfile = {
          userId: generateUserId(),
          email: email,
          username: generateUsername(),
          createdAt: new Date().toISOString(),
          isLocked: false
        }
        
        const session = await this.createSession(profile, firebaseUser.uid)
        
        this.currentSession = session
        this.currentProfile = profile
        
        return { session, profile, isNew: true }
      }
    } catch (error) {
      console.error('Failed to get or create user session:', error)
      throw error
    }
  }

  async signInAnonymously(): Promise<{
    session: UserSession
    profile: SessionProfile
    isNew: boolean
  }> {
    throw new Error('Anonymous authentication is no longer supported. Please use email authentication.')
  }

  private async createSession(profile: SessionProfile, firebaseUid: string): Promise<UserSession> {
    const now = Timestamp.now()
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1 year expiry
    
    const deviceFingerprint = await getDeviceFingerprint()
    
    const sessionData: FirebaseUserSession = {
      sessionId: firebaseUid, // Use Firebase UID as session ID
      userId: profile.userId,
      firebaseUid,
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
    
    await setDoc(doc(firestore, 'user_sessions', firebaseUid), sessionData)
    
    return {
      session_id: firebaseUid,
      encrypted_profile_data: JSON.stringify(profile),
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

    // Check if profile is locked and prevent modifications to core fields
    if (this.currentProfile.isLocked) {
      const restrictedFields = ['username', 'gender', 'age', 'zipcode']
      const hasRestrictedUpdate = restrictedFields.some(field => field in updates)
      if (hasRestrictedUpdate) {
        throw new Error('Profile is locked and cannot be modified')
      }
    }
    
    const updatedProfile = { ...this.currentProfile, ...updates }
    
    await updateDoc(doc(firestore, 'user_sessions', this.currentUser.uid), {
      profileData: updatedProfile,
      lastActive: Timestamp.now()
    })
    
    this.currentProfile = updatedProfile
    
    // Update the session object too
    if (this.currentSession) {
      this.currentSession.encrypted_profile_data = JSON.stringify(updatedProfile)
    }
  }

  async lockProfile(): Promise<void> {
    if (!this.currentProfile) {
      throw new Error('No active profile to lock')
    }

    await this.updateSessionProfile({ isLocked: true })
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

  async signOut(): Promise<void> {
    await signOut(auth)
    this.currentUser = null
    this.currentSession = null
    this.currentProfile = null
  }
}

// Export singleton instance
const firebaseAuthClient = new FirebaseAuthClient()

// Email/password authentication functions
export async function signInWithEmail(email: string, password: string): Promise<{
  session: UserSession
  profile: SessionProfile
  isNew: boolean
}> {
  return await firebaseAuthClient.signInWithEmail(email, password)
}

// Legacy compatibility functions for client-side
export async function getOrCreateSession(deviceFingerprint: string): Promise<{
  session: UserSession
  profile: SessionProfile
  isNew: boolean
}> {
  throw new Error('Anonymous authentication is deprecated. Please use email authentication.')
}

export async function getSessionByDevice(deviceFingerprint: string): Promise<{
  session: UserSession | null
  profile: SessionProfile | null
}> {
  const currentSession = firebaseAuthClient.getCurrentSession()
  const currentProfile = firebaseAuthClient.getCurrentProfile()
  
  return {
    session: currentSession,
    profile: currentProfile
  }
}

export async function updateSessionProfile(sessionId: string, updates: Partial<SessionProfile>): Promise<void> {
  await firebaseAuthClient.updateSessionProfile(updates)
}

export default firebaseAuthClient