// Anonymous user persistence utilities with session support

export interface PersistedUser {
  userId: string
  username: string
  zipcode?: string
  gender?: string
  age?: string
  sessionId?: string
}

const STORAGE_KEY = 'lokals_anonymous_user'

// Generate a unique anonymous user ID
export function generateUserId(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 9)
  return `user_${timestamp}_${randomStr}`
}

// Generate a fun anonymous username with much larger pool
export function generateUsername(): string {
  const adjectives = [
    'Happy', 'Clever', 'Friendly', 'Curious', 'Swift', 'Bright', 'Calm', 'Eager', 'Gentle', 'Jolly',
    'Kind', 'Lively', 'Merry', 'Noble', 'Proud', 'Quick', 'Brave', 'Wise', 'Witty', 'Zesty',
    'Amazing', 'Awesome', 'Bold', 'Cool', 'Daring', 'Epic', 'Fierce', 'Graceful', 'Heroic', 'Incredible',
    'Joyful', 'Legendary', 'Mighty', 'Natural', 'Outstanding', 'Peaceful', 'Radiant', 'Strong', 'Talented', 'Unique',
    'Vibrant', 'Wonderful', 'Excellent', 'Youthful', 'Zealous', 'Active', 'Brilliant', 'Creative', 'Dynamic', 'Energetic',
    'Fantastic', 'Generous', 'Honest', 'Inspiring', 'Jaunty', 'Keen', 'Lucky', 'Magical', 'Nimble', 'Optimistic',
    'Perfect', 'Quiet', 'Reliable', 'Sparkling', 'Trustworthy', 'Upbeat', 'Vivacious', 'Warm', 'Exciting', 'Yummy'
  ]
  
  const nouns = [
    'Panda', 'Eagle', 'Tiger', 'Dolphin', 'Phoenix', 'Dragon', 'Wolf', 'Fox', 'Bear', 'Lion',
    'Owl', 'Hawk', 'Raven', 'Falcon', 'Leopard', 'Panther', 'Lynx', 'Otter', 'Seal', 'Whale',
    'Butterfly', 'Unicorn', 'Shark', 'Penguin', 'Koala', 'Rabbit', 'Turtle', 'Deer', 'Cat', 'Dog',
    'Horse', 'Elephant', 'Giraffe', 'Zebra', 'Monkey', 'Kangaroo', 'Flamingo', 'Peacock', 'Swan', 'Robin',
    'Sparrow', 'Hummingbird', 'Cardinal', 'BlueBird', 'Wren', 'Finch', 'Parrot', 'Toucan', 'Pelican', 'Seagull',
    'Starfish', 'Seahorse', 'Jellyfish', 'Octopus', 'Squid', 'Crab', 'Lobster', 'Shrimp', 'Clam', 'Oyster',
    'Salmon', 'Tuna', 'Marlin', 'Swordfish', 'Manta', 'Stingray', 'Barracuda', 'Angelfish', 'Clownfish', 'Goldfish'
  ]
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  
  // Use a much larger number range (1000-9999) for 4-digit numbers
  // This gives us 60 × 70 × 9000 = 37.8 million combinations
  const number = Math.floor(Math.random() * 9000) + 1000
  
  return `${adjective}${noun}${number}`
}

// Save user data to localStorage
export function saveUser(user: PersistedUser): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  }
}

// Load user data from localStorage
export function loadUser(): PersistedUser | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error loading user data:', error)
  }
  
  return null
}

// Create or restore user session (now with device fingerprinting)
export async function getOrCreateUser(): Promise<PersistedUser> {
  // First check localStorage
  const existingUser = loadUser()
  
  try {
    // Try to get session from API
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    
    if (!response.ok) {
      throw new Error('Failed to get session')
    }
    
    const { session, profile, isNew } = await response.json()
    console.log('📝 Session info:', { 
      sessionId: session.session_id.substring(0, 8) + '...', 
      userId: profile.userId, 
      username: profile.username,
      isNew 
    })
    
    // If we have a localStorage user but different from session, use session
    if (!isNew && existingUser && existingUser.userId !== profile.userId) {
      console.log('⚠️ Device has different session, using session from database')
    }
    
    const user: PersistedUser = {
      userId: profile.userId,
      username: profile.username,
      zipcode: profile.zipcode,
      gender: profile.gender,
      age: profile.age,
      sessionId: session.session_id
    }
    
    // Save to localStorage for quick access
    saveUser(user)
    
    return user
  } catch (error) {
    console.error('Failed to get session from API:', error)
    
    // Fallback to localStorage only
    if (existingUser) {
      return existingUser
    }
    
    const newUser: PersistedUser = {
      userId: generateUserId(),
      username: generateUsername()
    }
    
    saveUser(newUser)
    return newUser
  }
}

// Update user profile (also updates session)
export async function updateUserProfile(updates: Partial<Pick<PersistedUser, 'zipcode' | 'gender' | 'age'>>): Promise<void> {
  const user = loadUser()
  if (user) {
    // Update local user object
    Object.assign(user, updates)
    saveUser(user)
    console.log('💾 Saved profile updates to localStorage:', updates)
    
    // Update session if we have one
    if (user.sessionId) {
      try {
        const response = await fetch('/api/session/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId: user.sessionId, 
            updates 
          })
        })
        
        if (response.ok) {
          console.log('✅ Profile synced to session')
        } else {
          console.error('❌ Failed to sync profile to session')
        }
      } catch (error) {
        console.error('Failed to update session profile:', error)
      }
    }
  }
}

// Update user zipcode (also updates session) - backwards compatibility
export async function updateUserZipcode(zipcode: string): Promise<void> {
  await updateUserProfile({ zipcode })
}

// Clear user data (for logout/reset)
export function clearUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
    // Note: We don't delete the session from database
    // This allows users to recover their session if they change their mind
  }
}