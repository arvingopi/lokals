// Firebase Admin SDK database operations for server-side API routes
import { adminDatabase(), adminFirestore() } from './firebase-admin'
import { generateUserId, generateUsername } from './user-persistence'

// Legacy interfaces for compatibility
export interface Message {
  id: string
  content: string
  timestamp: Date
  user_id: string
  username: string
  zipcode: string
  is_private: boolean
  recipient_id?: string
  session_id?: string
}

export interface User {
  id: string
  username: string
  last_seen: Date
  zipcode: string
  is_online: boolean
  session_id?: string
}

export interface FavouriteUser {
  id: string
  user_id: string
  favourite_user_id: string
  favourite_username: string
  created_at: Date
}

export interface ActiveChatUser {
  user_id: string
  username: string
  last_message_time: Date
  last_message_content: string
  is_sender: boolean
}

// Firebase Admin Real-time Database operations for messaging
export async function saveMessage(
  content: string,
  userId: string,
  username: string,
  zipcode: string,
  isPrivate = false,
  recipientId?: string,
  sessionId?: string
): Promise<Message> {
  const timestamp = Date.now()
  const messageData = {
    content,
    timestamp,
    userId,
    username,
    zipcode,
    sessionId: sessionId || null
  }

  let messageRef
  let messageId: string

  if (isPrivate && recipientId) {
    // Private message - store in private_messages/{conversationId}/{messageId}
    const conversationId = [userId, recipientId].sort().join('_')
    messageRef = adminDatabase().ref(`private_messages/${conversationId}`).push()
    messageId = messageRef.key!
    
    await messageRef.set({
      ...messageData,
      id: messageId,
      senderId: userId,
      recipientId,
      senderUsername: username
    })
  } else {
    // Public message - store in messages/{zipcode}/{messageId}
    messageRef = adminDatabase().ref(`messages/${zipcode}`).push()
    messageId = messageRef.key!
    
    await messageRef.set({
      ...messageData,
      id: messageId
    })
  }

  // Convert to legacy format for compatibility
  return {
    id: messageId,
    content,
    timestamp: new Date(timestamp),
    user_id: userId,
    username,
    zipcode,
    is_private: isPrivate,
    recipient_id: recipientId,
    session_id: sessionId
  }
}

export async function getRoomMessages(zipcode: string, limitCount = 50): Promise<Message[]> {
  const messagesRef = adminDatabase().ref(`messages/${zipcode}`)
  const messagesQuery = messagesRef.orderByChild('timestamp').limitToLast(limitCount)
  
  const snapshot = await messagesQuery.once('value')
  const messages: Message[] = []
  
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val()
    messages.push({
      id: data.id,
      content: data.content,
      timestamp: new Date(data.timestamp),
      user_id: data.userId,
      username: data.username,
      zipcode: data.zipcode,
      is_private: false,
      session_id: data.sessionId
    })
  })
  
  return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

export async function getPrivateMessages(userId1: string, userId2: string, limitCount = 50): Promise<Message[]> {
  const conversationId = [userId1, userId2].sort().join('_')
  const messagesRef = adminDatabase().ref(`private_messages/${conversationId}`)
  const messagesQuery = messagesRef.orderByChild('timestamp').limitToLast(limitCount)
  
  const snapshot = await messagesQuery.once('value')
  const messages: Message[] = []
  
  snapshot.forEach((childSnapshot) => {
    const data = childSnapshot.val()
    messages.push({
      id: data.id,
      content: data.content,
      timestamp: new Date(data.timestamp),
      user_id: data.senderId,
      username: data.senderUsername,
      zipcode: '',
      is_private: true,
      recipient_id: data.recipientId,
      session_id: data.sessionId
    })
  })
  
  return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

export async function savePrivateMessage(
  senderId: string,
  recipientId: string,
  content: string,
  username: string,
  sessionId?: string
): Promise<Message> {
  return saveMessage(content, senderId, username, '', true, recipientId, sessionId)
}

// Firebase Admin Firestore operations for user data
export async function upsertUser(userId: string, username: string, zipcode: string, sessionId?: string): Promise<User> {
  const userRef = adminFirestore().collection('users').doc(userId)
  const now = new Date()
  
  const userData = {
    id: userId,
    username,
    zipcode,
    last_seen: now,
    is_online: true,
    session_id: sessionId || null,
    created_at: now
  }
  
  await userRef.set(userData, { merge: true })
  
  // Also update presence in Realtime Database
  await adminDatabase().ref(`user_presence/${userId}`).set({
    isOnline: true,
    lastSeen: Date.now(),
    zipcode,
    username
  })
  
  // Update active users list
  await adminDatabase().ref(`active_users/${zipcode}/${userId}`).set({
    username,
    joinedAt: Date.now(),
    lastActivity: Date.now()
  })
  
  return {
    id: userId,
    username,
    zipcode,
    last_seen: now,
    is_online: true,
    session_id: sessionId
  }
}

export async function updateUserPresence(userId: string): Promise<void> {
  // Update Firestore
  const userRef = adminFirestore().collection('users').doc(userId)
  await userRef.update({
    last_seen: new Date(),
    is_online: true
  })
  
  // Update Realtime Database
  await adminDatabase().ref(`user_presence/${userId}`).update({
    isOnline: true,
    lastSeen: Date.now()
  })
}

export async function setUserOffline(userId: string): Promise<void> {
  // Update Firestore
  const userRef = adminFirestore().collection('users').doc(userId)
  await userRef.update({
    is_online: false,
    last_seen: new Date()
  })
  
  // Update Realtime Database
  await adminDatabase().ref(`user_presence/${userId}`).update({
    isOnline: false,
    lastSeen: Date.now()
  })
}

export async function getActiveUsers(zipcode: string): Promise<User[]> {
  const usersRef = adminDatabase().ref(`active_users/${zipcode}`)
  const snapshot = await usersRef.once('value')
  const users: User[] = []
  
  if (snapshot.exists()) {
    const activeUsers = snapshot.val()
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
    
    for (const [userId, userData] of Object.entries(activeUsers)) {
      const data = userData as any
      if (data.lastActivity > fiveMinutesAgo) {
        users.push({
          id: userId,
          username: data.username,
          last_seen: new Date(data.lastActivity),
          zipcode,
          is_online: true,
          session_id: undefined
        })
      }
    }
  }
  
  return users.sort((a, b) => b.last_seen.getTime() - a.last_seen.getTime())
}

// Favourite users operations
export async function addFavouriteUser(userId: string, favouriteUserId: string, favouriteUsername: string): Promise<FavouriteUser> {
  const favouriteRef = adminFirestore().collection('user_favorites').doc()
  const now = new Date()
  
  const favouriteData = {
    userId,
    favoriteUserId: favouriteUserId,
    favoriteUsername: favouriteUsername,
    createdAt: now
  }
  
  await favouriteRef.set(favouriteData)
  
  return {
    id: favouriteRef.id,
    user_id: userId,
    favourite_user_id: favouriteUserId,
    favourite_username: favouriteUsername,
    created_at: now
  }
}

export async function removeFavouriteUser(userId: string, favouriteUserId: string): Promise<void> {
  const favouritesRef = adminFirestore().collection('user_favorites')
  const querySnapshot = await favouritesRef
    .where('userId', '==', userId)
    .where('favoriteUserId', '==', favouriteUserId)
    .get()
  
  const batch = adminFirestore().batch()
  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref)
  })
  
  await batch.commit()
}

export async function getFavouriteUsers(userId: string): Promise<FavouriteUser[]> {
  const favouritesRef = adminFirestore().collection('user_favorites')
  const querySnapshot = await favouritesRef
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get()
  
  const favourites: FavouriteUser[] = []
  
  querySnapshot.forEach((doc) => {
    const data = doc.data()
    favourites.push({
      id: doc.id,
      user_id: data.userId,
      favourite_user_id: data.favoriteUserId,
      favourite_username: data.favoriteUsername,
      created_at: data.createdAt.toDate()
    })
  })
  
  return favourites
}

export async function isFavouriteUser(userId: string, favouriteUserId: string): Promise<boolean> {
  const favouritesRef = adminFirestore().collection('user_favorites')
  const querySnapshot = await favouritesRef
    .where('userId', '==', userId)
    .where('favoriteUserId', '==', favouriteUserId)
    .limit(1)
    .get()
  
  return !querySnapshot.empty
}

// Active chats operations
export async function getActiveChats(userId: string, limitCount = 10): Promise<ActiveChatUser[]> {
  const activeChats: ActiveChatUser[] = []
  const conversationsRef = adminDatabase().ref('private_messages')
  const snapshot = await conversationsRef.once('value')
  
  if (snapshot.exists()) {
    const conversations = snapshot.val()
    
    for (const [conversationId, messages] of Object.entries(conversations)) {
      if (conversationId.includes(userId)) {
        const messagesList = Object.values(messages as any)
        const lastMessage = messagesList[messagesList.length - 1] as any
        
        if (lastMessage && lastMessage.timestamp > Date.now() - (7 * 24 * 60 * 60 * 1000)) {
          const otherUserId = conversationId.split('_').find(id => id !== userId)
          if (otherUserId) {
            activeChats.push({
              user_id: otherUserId,
              username: lastMessage.senderId === userId ? lastMessage.senderUsername : lastMessage.senderUsername,
              last_message_time: new Date(lastMessage.timestamp),
              last_message_content: lastMessage.content,
              is_sender: lastMessage.senderId === userId
            })
          }
        }
      }
    }
  }
  
  return activeChats
    .sort((a, b) => b.last_message_time.getTime() - a.last_message_time.getTime())
    .slice(0, limitCount)
}

// Session management
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
  username: string
  zipcode: string
  gender: string
  age: string
  createdAt: Date
  isComplete: boolean
}

export async function getOrCreateSession(deviceFingerprint: string): Promise<{
  session: UserSession
  profile: SessionProfile
  isNew: boolean
}> {
  // Check if device session exists
  const deviceSessionRef = adminFirestore().collection('device_sessions').doc(deviceFingerprint)
  const deviceSessionDoc = await deviceSessionRef.get()
  
  if (deviceSessionDoc.exists) {
    const deviceData = deviceSessionDoc.data()!
    const sessionRef = adminFirestore().collection('user_sessions').doc(deviceData.sessionId)
    const sessionDoc = await sessionRef.get()
    
    if (sessionDoc.exists) {
      const sessionData = sessionDoc.data()!
      
      // Update last active
      await sessionRef.update({
        last_active: new Date()
      })
      
      const session: UserSession = {
        session_id: sessionDoc.id,
        encrypted_profile_data: sessionData.encrypted_profile_data,
        created_at: sessionData.created_at.toDate(),
        expires_at: sessionData.expires_at.toDate(),
        device_count: sessionData.device_count,
        last_active: new Date()
      }
      
      const profile: SessionProfile = {
        userId: sessionData.userId,
        username: sessionData.username,
        zipcode: sessionData.zipcode || '',
        gender: sessionData.gender || '',
        age: sessionData.age || '',
        createdAt: sessionData.created_at.toDate(),
        isComplete: !!(sessionData.zipcode && sessionData.gender && sessionData.age)
      }
      
      return { session, profile, isNew: false }
    }
  }
  
  // Create new session
  const userId = generateUserId()
  const username = generateUsername()
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`
  
  const now = new Date()
  const expiresAt = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)) // 1 year
  
  const sessionData = {
    userId,
    username,
    created_at: now,
    expires_at: expiresAt,
    device_count: 1,
    last_active: now,
    encrypted_profile_data: '',
    zipcode: '',
    gender: '',
    age: ''
  }
  
  // Create session document
  await adminFirestore().collection('user_sessions').doc(sessionId).set(sessionData)
  
  // Create device session link
  await deviceSessionRef.set({
    sessionId,
    userId,
    deviceFingerprint,
    created_at: now,
    last_active: now
  })
  
  const session: UserSession = {
    session_id: sessionId,
    encrypted_profile_data: '',
    created_at: now,
    expires_at: expiresAt,
    device_count: 1,
    last_active: now
  }
  
  const profile: SessionProfile = {
    userId,
    username,
    zipcode: '',
    gender: '',
    age: '',
    createdAt: now,
    isComplete: false
  }
  
  return { session, profile, isNew: true }
}

export async function updateSessionProfile(sessionId: string, updates: Partial<SessionProfile>): Promise<void> {
  const sessionRef = adminFirestore().collection('user_sessions').doc(sessionId)
  await sessionRef.update({
    ...updates,
    last_active: new Date()
  })
}

// Cleanup functions
export async function cleanupOldData(): Promise<void> {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
  
  // Clean up old presence data
  const presenceRef = adminDatabase().ref('user_presence')
  const presenceSnapshot = await presenceRef.once('value')
  
  if (presenceSnapshot.exists()) {
    const presenceData = presenceSnapshot.val()
    for (const [userId, userData] of Object.entries(presenceData)) {
      const data = userData as any
      if (data.lastSeen < fiveMinutesAgo) {
        await adminDatabase().ref(`user_presence/${userId}`).update({
          isOnline: false
        })
      }
    }
  }
  
  // Clean up old active users
  const activeUsersRef = adminDatabase().ref('active_users')
  const activeUsersSnapshot = await activeUsersRef.once('value')
  
  if (activeUsersSnapshot.exists()) {
    const activeUsersData = activeUsersSnapshot.val()
    for (const [zipcode, users] of Object.entries(activeUsersData)) {
      const usersData = users as any
      for (const [userId, userData] of Object.entries(usersData)) {
        const data = userData as any
        if (data.lastActivity < fiveMinutesAgo) {
          await adminDatabase().ref(`active_users/${zipcode}/${userId}`).remove()
        }
      }
    }
  }
  
  // Clean up old users in Firestore (mark offline)
  const usersRef = adminFirestore().collection('users')
  const fiveMinutesAgoDate = new Date(fiveMinutesAgo)
  const oldUsersQuery = await usersRef.where('last_seen', '<', fiveMinutesAgoDate).get()
  
  const batch = adminFirestore().batch()
  oldUsersQuery.forEach((userDoc) => {
    batch.update(userDoc.ref, {
      is_online: false
    })
  })
  
  await batch.commit()
}

// Legacy compatibility functions
export const getMessages = getRoomMessages
export const initializeDatabase = async () => {
  console.log('Firebase Admin database initialized')
}