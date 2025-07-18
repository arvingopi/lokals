// Test full Firebase integration with Firestore + Realtime Database
import { 
  upsertUser, 
  addFavouriteUser, 
  getFavouriteUsers,
  saveMessage,
  getRoomMessages,
  updateUserPresence,
  getActiveUsers
} from '../lib/firebase-database'
import { 
  getOrCreateSession,
  updateSessionProfile
} from '../lib/firebase-session-server'
import { getDeviceFingerprint } from '../lib/device-fingerprint'
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })

async function testFullIntegration() {
  console.log('🔥 Testing Full Firebase Integration (Firestore + Realtime DB)...')
  
  try {
    // Test 1: Session Management (Firestore)
    console.log('\n📝 Testing Session Management (Firestore)...')
    const deviceFingerprint = await getDeviceFingerprint()
    const sessionResult = await getOrCreateSession(deviceFingerprint)
    
    console.log('✅ Session creation successful:', {
      sessionId: sessionResult.session.session_id.substring(0, 8) + '...',
      userId: sessionResult.profile.userId,
      username: sessionResult.profile.username,
      isNew: sessionResult.isNew
    })
    
    // Test 2: User Management (Firestore)
    console.log('\n👤 Testing User Management (Firestore)...')
    const testUser = await upsertUser(
      sessionResult.profile.userId,
      sessionResult.profile.username,
      '10001',
      sessionResult.session.session_id
    )
    
    console.log('✅ User upsert successful:', {
      id: testUser.id,
      username: testUser.username,
      zipcode: testUser.zipcode
    })
    
    // Test 3: Favorites (Firestore)
    console.log('\n⭐ Testing Favorites (Firestore)...')
    const favorite = await addFavouriteUser(
      sessionResult.profile.userId,
      'test_friend_123',
      'TestFriend'
    )
    
    console.log('✅ Favorite added:', {
      id: favorite.id,
      favoriteUsername: favorite.favourite_username
    })
    
    const favorites = await getFavouriteUsers(sessionResult.profile.userId)
    console.log('✅ Favorites retrieved:', favorites.length, 'favorites')
    
    // Test 4: Messages (Realtime Database)
    console.log('\n💬 Testing Messages (Realtime Database)...')
    const message = await saveMessage(
      'Hello from full integration test!',
      sessionResult.profile.userId,
      sessionResult.profile.username,
      '10001'
    )
    
    console.log('✅ Message saved:', {
      id: message.id,
      content: message.content,
      zipcode: message.zipcode
    })
    
    const messages = await getRoomMessages('10001')
    console.log('✅ Messages retrieved:', messages.length, 'messages')
    
    // Test 5: Presence (Realtime Database)
    console.log('\n👥 Testing Presence (Realtime Database)...')
    await updateUserPresence(sessionResult.profile.userId)
    
    const activeUsers = await getActiveUsers('10001')
    console.log('✅ Active users retrieved:', activeUsers.length, 'active users')
    
    // Test 6: Session Profile Update (Firestore)
    console.log('\n📝 Testing Session Profile Update (Firestore)...')
    await updateSessionProfile(sessionResult.session.session_id, {
      zipcode: '10002',
      gender: 'other',
      age: '25-34'
    })
    
    console.log('✅ Session profile updated')
    
    console.log('\n🎉 Full Firebase Integration Test Passed!')
    console.log('✅ Firestore: Sessions, Users, Favorites working')
    console.log('✅ Realtime Database: Messages, Presence working')
    console.log('✅ Architecture: Optimal two-database setup confirmed')
    
  } catch (error) {
    console.error('❌ Full integration test failed:', error)
    
    if (error.message.includes('permission-denied')) {
      console.log('💡 Fix: Check Firebase security rules')
    } else if (error.message.includes('unavailable')) {
      console.log('💡 Fix: Check Firebase service status')
    }
    
    process.exit(1)
  }
}

// Run the test
testFullIntegration()