// Basic Firebase Realtime Database test without authentication
import { initializeApp } from 'firebase/app'
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

async function testFirebaseBasic() {
  console.log('🔧 Testing basic Firebase configuration...')
  
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig)
    const database = getDatabase(app)
    
    console.log('✅ Firebase initialized successfully')
    console.log('📋 Config:', {
      projectId: firebaseConfig.projectId,
      databaseURL: firebaseConfig.databaseURL,
      authDomain: firebaseConfig.authDomain
    })
    
    // Test Realtime Database Write (without auth)
    console.log('\n📊 Testing Realtime Database write...')
    const testRef = ref(database, 'test/basic-connection')
    await set(testRef, {
      timestamp: Date.now(),
      message: 'Basic Firebase connection test',
      status: 'testing'
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
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...')
    await set(testRef, null)
    console.log('✅ Cleanup complete')
    
    console.log('\n🎉 Basic Firebase test passed!')
    console.log('\n📝 Next steps:')
    console.log('1. Enable Anonymous Authentication in Firebase Console')
    console.log('2. Set up Firestore (if needed)')
    console.log('3. Configure security rules')
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
      console.log('💡 Fix: Firebase Realtime Database is in locked mode')
      console.log('   Go to Firebase Console > Realtime Database > Rules')
      console.log('   Temporarily set rules to:')
      console.log('   {')
      console.log('     "rules": {')
      console.log('       ".read": true,')
      console.log('       ".write": true')
      console.log('     }')
      console.log('   }')
    }
    
    process.exit(1)
  }
}

// Run the test
testFirebaseBasic()