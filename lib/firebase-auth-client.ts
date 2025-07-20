// Firebase Authentication for client-side (browser) use
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut,
  sendEmailVerification
} from 'firebase/auth'
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  Timestamp
} from 'firebase/firestore'
import { auth, firestore } from './firebase'
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
  private authStateResolve: ((value: boolean) => void) | null = null
  private authStatePromise: Promise<boolean>
  
  private readonly SESSION_STORAGE_KEY = 'firebase_user_session'
  private readonly PROFILE_STORAGE_KEY = 'firebase_user_profile'

  constructor() {
    this.authStatePromise = new Promise((resolve) => {
      this.authStateResolve = resolve
    })
    this.initialize()
  }

  // Save session and profile to localStorage
  private saveToLocalStorage() {
    if (typeof window === 'undefined') return
    
    try {
      if (this.currentSession) {
        localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(this.currentSession))
      }
      if (this.currentProfile) {
        localStorage.setItem(this.PROFILE_STORAGE_KEY, JSON.stringify(this.currentProfile))
      }
    } catch (error) {
      console.error('Failed to save auth data to localStorage:', error)
    }
  }

  // Load session and profile from localStorage
  private loadFromLocalStorage() {
    if (typeof window === 'undefined') return
    
    try {
      const sessionData = localStorage.getItem(this.SESSION_STORAGE_KEY)
      if (sessionData && !this.currentSession) {
        const parsedSession = JSON.parse(sessionData)
        // Validate session data structure
        if (parsedSession && parsedSession.session_id) {
          this.currentSession = parsedSession
          console.log('✅ Session restored from localStorage')
        } else {
          console.warn('⚠️ Invalid session data in localStorage, clearing...')
          localStorage.removeItem(this.SESSION_STORAGE_KEY)
        }
      }
      
      const profileData = localStorage.getItem(this.PROFILE_STORAGE_KEY)
      if (profileData && !this.currentProfile) {
        const parsedProfile = JSON.parse(profileData)
        // Validate profile data structure
        if (parsedProfile && parsedProfile.userId && parsedProfile.username) {
          this.currentProfile = parsedProfile
          console.log('✅ Profile restored from localStorage:', parsedProfile.username)
        } else {
          console.warn('⚠️ Invalid profile data in localStorage, clearing...')
          localStorage.removeItem(this.PROFILE_STORAGE_KEY)
        }
      }
    } catch (error) {
      console.error('❌ Failed to load auth data from localStorage:', error)
      // Clear corrupted data
      this.clearLocalStorage()
    }
  }

  // Clear localStorage data
  private clearLocalStorage() {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(this.SESSION_STORAGE_KEY)
      localStorage.removeItem(this.PROFILE_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear auth data from localStorage:', error)
    }
  }

  private async initialize() {
    if (this.initialized) return
    
    // Load cached data from localStorage first
    this.loadFromLocalStorage()
    
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user
      if (user) {
        console.log('🔄 Auth state changed - user authenticated:', user.uid, 'verified:', user.emailVerified)
        
        // Wait a moment for the Firebase Auth token to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // If we don't have profile data in memory, try to load from Firestore
        if (!this.currentProfile) {
          console.log('🔄 Loading user session for authenticated user...')
          await this.loadUserSession(user.uid)
          
          // If still no profile after loading, this might indicate a data issue
          if (!this.currentProfile) {
            console.warn('⚠️ No profile found for authenticated user. This may indicate a sync issue.')
          }
        } else {
          console.log('✅ User profile already loaded:', this.currentProfile.username)
        }
      } else {
        // User signed out, clear data
        console.log('🔓 User signed out, clearing session data')
        this.currentSession = null
        this.currentProfile = null
        this.clearLocalStorage()
      }
      this.initialized = true
      if (this.authStateResolve) {
        this.authStateResolve(!!user)
        this.authStateResolve = null
      }
    })
  }

  // Wait for auth state to be initialized
  async waitForAuthState(): Promise<boolean> {
    if (this.initialized) {
      return !!this.currentUser
    }
    return this.authStatePromise
  }

  private async loadUserSession(firebaseUid: string) {
    try {
      console.log('🔍 Loading user session for UID:', firebaseUid)
      console.log('🔍 Current auth user:', this.currentUser?.uid, 'verified:', this.currentUser?.emailVerified)
      
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
        
        // Save to localStorage for persistence
        this.saveToLocalStorage()
        console.log('✅ User session loaded and saved to localStorage')
      } else {
        console.log('⚠️ No user session document found for UID:', firebaseUid)
      }
    } catch (error) {
      console.error('❌ Failed to load user session:', error)
      if (error instanceof Error && 'code' in error) {
        const firebaseError = error as { code: string; message: string }
        console.error('🔍 Firebase error code:', firebaseError.code)
        console.error('🔍 Firebase error message:', firebaseError.message)
      }
    }
  }

  async signInWithEmail(email: string, password: string, skipVerificationCheck = false): Promise<{
    session: UserSession
    profile: SessionProfile
    isNew: boolean
  }> {
    try {
      // Sign in with existing account
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user
      
      // Check if email is verified (unless we're doing post-verification signin)
      if (!skipVerificationCheck && !firebaseUser.emailVerified) {
        throw new Error('Please verify your email before signing in. Check your inbox for the verification link.')
      }
      
      // If user has verified email but the token doesn't reflect it yet, reload user
      if (firebaseUser.emailVerified) {
        console.log('🔄 Reloading user to ensure fresh auth token with email verification...')
        await firebaseUser.reload()
        
        // Force refresh the ID token to include email_verified claim
        await firebaseUser.getIdToken(true)
        console.log('✅ User reloaded and token refreshed')
      }
      
      return await this.getOrCreateUserSession(firebaseUser, email)
    } catch (error: unknown) {
      console.error('Sign in failed:', error)
      throw error
    }
  }

  async signUpWithEmailVerification(email: string, password: string): Promise<void> {
    try {
      // Create new account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user
      
      // Send verification email using Firebase's default handling
      // The verification link will include the oobCode parameter automatically
      await sendEmailVerification(firebaseUser)
      
      // Sign out immediately so user must verify email first
      await signOut(auth)
      
      console.log('✅ Verification email sent successfully')
    } catch (error: unknown) {
      console.error('Sign up failed:', error)
      throw error
    }
  }


  private async getOrCreateUserSession(firebaseUser: FirebaseUser, email: string): Promise<{
    session: UserSession
    profile: SessionProfile
    isNew: boolean
  }> {
    try {
      console.log('🔍 Getting or creating user session for:', firebaseUser.uid)
      console.log('🔍 User verified:', firebaseUser.emailVerified)
      
      // Wait for auth token to be ready
      console.log('🔍 Waiting for Firebase ID token...')
      const idToken = await firebaseUser.getIdToken(true) // Force refresh
      console.log('🔍 ID token obtained, length:', idToken.length)
      
      // Check if session exists
      console.log('🔍 Attempting to read user session document...')
      let sessionDoc
      try {
        sessionDoc = await getDoc(doc(firestore, 'user_sessions', firebaseUser.uid))
        console.log('✅ Successfully read session document, exists:', sessionDoc.exists())
      } catch (readError) {
        console.error('❌ Failed to read session document:', readError)
        if (readError instanceof Error && 'code' in readError) {
          const firebaseError = readError as { code: string; message: string }
          console.error('🔍 Read error code:', firebaseError.code)
          console.error('🔍 Read error message:', firebaseError.message)
        }
        throw readError
      }
      
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
        
        // Save to localStorage for persistence
        this.saveToLocalStorage()
        
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
        
        // Save to localStorage for persistence
        this.saveToLocalStorage()
        
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
        ['web-device']: {
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
    
    // Save to localStorage for persistence
    this.saveToLocalStorage()
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
    // If profile is not in memory, try to load from localStorage
    if (!this.currentProfile) {
      this.loadFromLocalStorage()
      
      // If still no profile but we have a Firebase user, try to reload from Firestore
      if (!this.currentProfile && this.currentUser) {
        console.warn('⚠️ Profile missing but Firebase user exists, attempting reload...')
        this.loadUserSession(this.currentUser.uid).catch(error => {
          console.error('❌ Failed to reload user session:', error)
        })
      }
    }
    return this.currentProfile
  }

  async checkAndHandlePostVerification(): Promise<boolean> {
    try {
      // Check if we have a verified email and temporary password
      const verifiedEmail = sessionStorage.getItem('verified_email')
      const tempPassword = sessionStorage.getItem('temp_auth_pwd')
      
      if (verifiedEmail && tempPassword) {
        console.log('🔄 Post-verification auto-signin detected...')
        
        // Clear temporary storage
        sessionStorage.removeItem('verified_email')
        sessionStorage.removeItem('temp_auth_pwd')
        
        // Sign in with the credentials, skipping verification check since we just verified
        await this.signInWithEmail(verifiedEmail, tempPassword, true)
        
        console.log('✅ Auto-signin successful after email verification')
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Post-verification auto-signin failed:', error)
      // Clear any remaining temp data
      sessionStorage.removeItem('verified_email')
      sessionStorage.removeItem('temp_auth_pwd')
      return false
    }
  }

  async signOut(): Promise<void> {
    await signOut(auth)
    this.currentUser = null
    this.currentSession = null
    this.currentProfile = null
    this.clearLocalStorage()
  }

  onAuthStateChange(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback)
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
  console.log('Device fingerprint:', deviceFingerprint)
  throw new Error('Anonymous authentication is deprecated. Please use email authentication.')
}

export async function getSessionByDevice(deviceFingerprint: string): Promise<{
  session: UserSession | null
  profile: SessionProfile | null
}> {
  console.log('Device fingerprint:', deviceFingerprint)
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