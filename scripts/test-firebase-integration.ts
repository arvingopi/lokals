// Integration test for Firebase migration
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getDatabase, ref, set, get } from 'firebase/database'
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

async function testFirebaseIntegration() {
  console.log('🧪 Testing Firebase integration...')
  
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const database = getDatabase(app)
    
    // Test 1: Anonymous Authentication
    console.log('\n🔐 Testing Anonymous Authentication...')
    const userCredential = await signInAnonymously(auth)
    const user = userCredential.user
    console.log('✅ Anonymous auth successful:', user.uid)
    
    // Test 2: Message Structure
    console.log('\n💬 Testing message structure...')
    const testMessage = {
      id: `test_${Date.now()}`,
      content: 'Test message from Firebase integration test',
      timestamp: Date.now(),
      userId: user.uid,
      username: 'TestUser',
      zipcode: '10001'
    }
    
    const messagesRef = ref(database, `messages/10001/${testMessage.id}`)
    await set(messagesRef, testMessage)
    
    const messageSnapshot = await get(messagesRef)
    if (messageSnapshot.exists()) {
      console.log('✅ Message write/read successful')
      console.log('📄 Message data:', messageSnapshot.val())
    } else {
      throw new Error('Message not found after writing')
    }
    
    // Test 3: Private Message Structure
    console.log('\n🔒 Testing private message structure...')
    const testPrivateMessage = {
      id: `private_${Date.now()}`,
      content: 'Test private message',
      timestamp: Date.now(),
      senderId: user.uid,
      recipientId: 'test_recipient',
      senderUsername: 'TestUser'
    }
    
    const conversationId = [user.uid, 'test_recipient'].sort().join('_')
    const privateMessagesRef = ref(database, `private_messages/${conversationId}/${testPrivateMessage.id}`)
    await set(privateMessagesRef, testPrivateMessage)
    
    const privateMessageSnapshot = await get(privateMessagesRef)
    if (privateMessageSnapshot.exists()) {
      console.log('✅ Private message write/read successful')
      console.log('📄 Private message data:', privateMessageSnapshot.val())
    } else {
      throw new Error('Private message not found after writing')
    }
    
    // Test 4: Presence System
    console.log('\n👥 Testing presence system...')
    const presenceData = {
      isOnline: true,
      lastSeen: Date.now(),
      zipcode: '10001',
      username: 'TestUser'
    }
    
    const presenceRef = ref(database, `user_presence/${user.uid}`)
    await set(presenceRef, presenceData)
    
    const presenceSnapshot = await get(presenceRef)
    if (presenceSnapshot.exists()) {
      console.log('✅ Presence system successful')
      console.log('📄 Presence data:', presenceSnapshot.val())
    } else {
      throw new Error('Presence data not found after writing')
    }
    
    // Test 5: Active Users
    console.log('\n🏃 Testing active users system...')
    const activeUserData = {
      username: 'TestUser',
      joinedAt: Date.now(),
      lastActivity: Date.now()
    }
    
    const activeUsersRef = ref(database, `active_users/10001/${user.uid}`)
    await set(activeUsersRef, activeUserData)
    
    const activeUserSnapshot = await get(activeUsersRef)
    if (activeUserSnapshot.exists()) {
      console.log('✅ Active users system successful')
      console.log('📄 Active user data:', activeUserSnapshot.val())
    } else {
      throw new Error('Active user data not found after writing')
    }
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    await set(messagesRef, null)
    await set(privateMessagesRef, null)
    await set(presenceRef, null)
    await set(activeUsersRef, null)
    console.log('✅ Cleanup complete')
    
    console.log('\n🎉 All Firebase integration tests passed!')
    console.log('✅ Your Firebase migration is ready!')
    
  } catch (error) {
    console.error('❌ Firebase integration test failed:', error)
    
    if (error.code === 'auth/configuration-not-found') {
      console.log('💡 Fix: Enable Anonymous Authentication in Firebase Console')
    } else if (error.code === 'permission-denied') {
      console.log('💡 Fix: Check your Firebase security rules')
    } else if (error.message.includes('network')) {
      console.log('💡 Fix: Check your internet connection')
    }
    
    process.exit(1)
  }
}

// Run the test
testFirebaseIntegration()