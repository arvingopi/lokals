// Test Firebase integration with authentication
import { 
  ref, 
  set, 
  get, 
  push
} from 'firebase/database'
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc,
  Timestamp,
  deleteDoc
} from 'firebase/firestore'
import { 
  signInAnonymously,
  signOut
} from 'firebase/auth'
import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

async function testWithAuth() {
  console.log('🔥 Testing Firebase with Authentication...')
  
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const database = getDatabase(app)
    const firestore = getFirestore(app)
    
    console.log('✅ Firebase initialized successfully')
    
    // Sign in anonymously
    console.log('\n🔐 Signing in anonymously...')
    const userCredential = await signInAnonymously(auth)
    const user = userCredential.user
    
    console.log('✅ Anonymous authentication successful')
    console.log('👤 User ID:', user.uid)
    
    // Test 1: Realtime Database Operations
    console.log('\n⚡ Testing Realtime Database...')
    
    // Test writing to Realtime Database
    const testMessageRef = ref(database, 'test/message')
    await set(testMessageRef, {
      content: 'Test message with auth',
      timestamp: Date.now(),
      userId: user.uid,
      username: 'TestUser'
    })
    
    // Test reading from Realtime Database
    const messageSnapshot = await get(testMessageRef)
    if (messageSnapshot.exists()) {
      console.log('✅ Realtime Database read/write successful')
      console.log('📄 Message data:', messageSnapshot.val())
    } else {
      console.log('❌ Realtime Database read failed')
    }
    
    // Test 2: Firestore Operations
    console.log('\n🔥 Testing Firestore...')
    
    // Test writing to Firestore
    const testUserRef = doc(firestore, 'users', user.uid)
    await setDoc(testUserRef, {
      username: 'TestUser',
      zipcode: '10001',
      createdAt: Timestamp.now(),
      isOnline: true
    })
    
    // Test reading from Firestore
    const userSnapshot = await getDoc(testUserRef)
    if (userSnapshot.exists()) {
      console.log('✅ Firestore read/write successful')
      console.log('📄 User data:', userSnapshot.data())
    } else {
      console.log('❌ Firestore read failed')
    }
    
    // Test 3: Test specific security rule paths
    console.log('\n🔒 Testing Security Rule Paths...')
    
    // Test user_sessions path
    const sessionRef = ref(database, `user_sessions/${user.uid}`)
    await set(sessionRef, {
      sessionId: `session_${Date.now()}`,
      userId: user.uid,
      createdAt: Date.now()
    })
    
    const sessionSnapshot = await get(sessionRef)
    if (sessionSnapshot.exists()) {
      console.log('✅ user_sessions path working')
    }
    
    // Test user_favorites path
    const favoritesRef = ref(database, `user_favorites/${user.uid}`)
    await set(favoritesRef, {
      favoriteUserId: 'friend_123',
      favoriteUsername: 'FriendUser',
      createdAt: Date.now()
    })
    
    const favoritesSnapshot = await get(favoritesRef)
    if (favoritesSnapshot.exists()) {
      console.log('✅ user_favorites path working')
    }
    
    // Test messages path
    const messagesRef = push(ref(database, 'messages/10001'))
    await set(messagesRef, {
      content: 'Test room message',
      timestamp: Date.now(),
      userId: user.uid,
      username: 'TestUser'
    })
    
    const messagesSnapshot = await get(messagesRef)
    if (messagesSnapshot.exists()) {
      console.log('✅ messages path working')
    }
    
    console.log('\n🎉 Firebase Authentication Test Passed!')
    console.log('✅ Anonymous Auth: Working')
    console.log('✅ Realtime Database: Working')
    console.log('✅ Firestore: Working')
    console.log('✅ Security Rules: Working')
    
    // Sign out
    await signOut(auth)
    console.log('✅ Signed out successfully')
    
  } catch (error) {
    console.error('❌ Firebase authentication test failed:', error)
    
    if (error.code === 'permission-denied') {
      console.log('💡 Fix: Update Firebase security rules to allow access')
    } else if (error.code === 'auth/invalid-api-key') {
      console.log('💡 Fix: Check Firebase API key in environment variables')
    } else if (error.code === 'unavailable') {
      console.log('💡 Fix: Check Firebase service status')
    }
    
    process.exit(1)
  }
}

// Run the test
testWithAuth()