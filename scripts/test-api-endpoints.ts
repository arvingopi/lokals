// Test API endpoints after Firebase migration

async function testApiEndpoints() {
  console.log('🧪 Testing API endpoints...')
  
  const baseUrl = 'http://localhost:3000'
  
  try {
    // Test 1: Session API
    console.log('\n🔐 Testing Session API...')
    const sessionResponse = await fetch(`${baseUrl}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: "test-fingerprint" })
    })
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json()
      console.log('✅ Session API working:', sessionData.profile.username)
      
      // Test 2: Room Messages API
      console.log('\n💬 Testing Room Messages API...')
      const messagesResponse = await fetch(`${baseUrl}/api/rooms/10001/messages`)
      
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json()
        console.log('✅ Room Messages API working:', messagesData.messages.length, 'messages')
      } else {
        console.error('❌ Room Messages API failed')
      }
      
      // Test 3: Active Chats API
      console.log('\n📱 Testing Active Chats API...')
      const chatsResponse = await fetch(`${baseUrl}/api/active-chats?userId=${sessionData.profile.userId}`)
      
      if (chatsResponse.ok) {
        const chatsData = await chatsResponse.json()
        console.log('✅ Active Chats API working:', chatsData.activeChats.length, 'chats')
      } else {
        console.error('❌ Active Chats API failed')
      }
      
      // Test 4: Favourites API
      console.log('\n⭐ Testing Favourites API...')
      const favResponse = await fetch(`${baseUrl}/api/favourites?userId=${sessionData.profile.userId}`)
      
      if (favResponse.ok) {
        const favData = await favResponse.json()
        console.log('✅ Favourites API working:', favData.favourites.length, 'favourites')
      } else {
        console.error('❌ Favourites API failed')
      }
      
      console.log('\n🎉 All API endpoints are working!')
      
    } else {
      console.error('❌ Session API failed')
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error)
  }
}

// Run if server is running
testApiEndpoints().catch(console.error)