// Test database operations without authentication
import { 
  ref, 
  set, 
  get, 
  push,
  remove
} from 'firebase/database'
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc,
  getDocs,
  Timestamp,
  deleteDoc
} from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getFirestore } from 'firebase/firestore'
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

async function testDatabaseOnly() {
  console.log('🔥 Testing Database Operations (No Auth)...')
  
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const database = getDatabase(app)
    const firestore = getFirestore(app)
    
    console.log('✅ Firebase initialized successfully')
    
    // Test 1: Realtime Database Operations
    console.log('\n⚡ Testing Realtime Database...')
    
    // Test writing to Realtime Database
    const testMessageRef = ref(database, 'test_messages/test_room/test_message')
    await set(testMessageRef, {
      content: 'Test message for database test',
      timestamp: Date.now(),
      userId: 'test_user_123',
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
    const testUserRef = doc(firestore, 'test_users', 'test_user_123')
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
    
    // Test 3: Firestore Collection Operations
    console.log('\n📚 Testing Firestore Collections...')
    
    // Test adding to collection
    const testFavoritesRef = collection(firestore, 'test_favorites')
    const favoriteDoc = await addDoc(testFavoritesRef, {
      userId: 'test_user_123',
      favoriteUserId: 'test_friend_456',
      favoriteUsername: 'TestFriend',
      createdAt: Timestamp.now()
    })
    
    console.log('✅ Firestore collection add successful, doc ID:', favoriteDoc.id)
    
    // Test querying collection
    const favoritesSnapshot = await getDocs(testFavoritesRef)
    console.log('✅ Firestore collection query successful,', favoritesSnapshot.size, 'documents')
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    await remove(testMessageRef)
    await deleteDoc(testUserRef)
    await deleteDoc(favoriteDoc)
    
    console.log('✅ Cleanup complete')
    
    console.log('\n🎉 Database Operations Test Passed!')
    console.log('✅ Realtime Database: Working')
    console.log('✅ Firestore: Working')
    console.log('✅ Both databases are ready for your app!')
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
    
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'permission-denied') {
        console.log('💡 Fix: Update Firebase security rules to allow access')
      } else if (error.code === 'unavailable') {
        console.log('💡 Fix: Check Firebase service status')
      } else if (error.code === 'auth/invalid-api-key') {
        console.log('💡 Fix: Check Firebase API key in environment variables')
      }
    }
    
    process.exit(1)
  }
}

// Run the test
testDatabaseOnly()