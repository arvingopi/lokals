// Test Firebase configuration and connectivity
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getDatabase, ref, set, get, push } from 'firebase/database'
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

async function testFirebase() {
  console.log('🔧 Testing Firebase configuration...')
  
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const database = getDatabase(app)
    
    console.log('✅ Firebase initialized successfully')
    console.log('📋 Config:', {
      projectId: firebaseConfig.projectId,
      databaseURL: firebaseConfig.databaseURL,
      authDomain: firebaseConfig.authDomain
    })
    
    // Test Anonymous Authentication
    console.log('\n🔐 Testing Anonymous Authentication...')
    const userCredential = await signInAnonymously(auth)
    const user = userCredential.user
    console.log('✅ Anonymous auth successful')
    console.log('👤 User ID:', user.uid)
    console.log('🔒 Anonymous:', user.isAnonymous)
    
    // Test Realtime Database Write
    console.log('\n📊 Testing Realtime Database write...')
    const testRef = ref(database, 'test/connection')
    await set(testRef, {
      timestamp: Date.now(),
      message: 'Firebase connection test',
      userId: user.uid
    })
    console.log('✅ Database write successful')
    
    // Test Realtime Database Read
    console.log('\n📖 Testing Realtime Database read...')
    const snapshot = await get(testRef)
    if (snapshot.exists()) {
      console.log('✅ Database read successful')
      console.log('📄 Data:', snapshot.val())
    } else {
      console.log('❌ No data found')
    }
    
    // Test message structure
    console.log('\n💬 Testing message structure...')
    const messagesRef = ref(database, 'messages/10001')
    const newMessageRef = push(messagesRef)
    await set(newMessageRef, {
      id: newMessageRef.key,
      content: 'Test message from Firebase test',
      timestamp: Date.now(),
      userId: user.uid,
      username: 'TestUser',
      zipcode: '10001'
    })
    console.log('✅ Message structure test successful')
    
    // Test presence
    console.log('\n👥 Testing presence system...')
    const presenceRef = ref(database, `user_presence/${user.uid}`)
    await set(presenceRef, {
      isOnline: true,
      lastSeen: Date.now(),
      zipcode: '10001',
      username: 'TestUser'
    })
    console.log('✅ Presence test successful')
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...')
    await set(ref(database, 'test'), null)
    await set(ref(database, 'messages/10001'), null)
    await set(ref(database, `user_presence/${user.uid}`), null)
    console.log('✅ Cleanup complete')
    
    console.log('\n🎉 All Firebase tests passed!')
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error)
    
    if (error.code === 'auth/api-key-not-valid') {
      console.log('💡 Fix: Check your Firebase API key in .env.local')
    } else if (error.code === 'permission-denied') {
      console.log('💡 Fix: Check your Firebase security rules')
    } else if (error.message.includes('network')) {
      console.log('💡 Fix: Check your internet connection')
    }
    
    process.exit(1)
  }
}

// Run the test
testFirebase()