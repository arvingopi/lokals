// Firebase database operations - maintaining same interface as NeonDB
import { 
  ref, 
  set, 
  get, 
  push, 
  query, 
  orderByChild, 
  limitToLast, 
  onValue, 
  off,
  remove,
  update
} from 'firebase/database'
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query as firestoreQuery, 
  where, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore'
import { database, firestore } from './firebase'

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
  gender?: string
  age?: string
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

// Firebase Real-time Database operations for messaging
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
    messageRef = push(ref(database, `private_messages/${conversationId}`))
    messageId = messageRef.key!
    
    await set(messageRef, {
      ...messageData,
      id: messageId,
      senderId: userId,
      recipientId,
      senderUsername: username
    })
  } else {
    // Public message - store in messages/{zipcode}/{messageId}
    messageRef = push(ref(database, `messages/${zipcode}`))
    messageId = messageRef.key!
    
    await set(messageRef, {
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
  const messagesRef = ref(database, `messages/${zipcode}`)
  const messagesQuery = query(
    messagesRef,
    orderByChild('timestamp'),
    limitToLast(limitCount)
  )
  
  const snapshot = await get(messagesQuery)
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
  const messagesRef = ref(database, `private_messages/${conversationId}`)
  const messagesQuery = query(
    messagesRef,
    orderByChild('timestamp'),
    limitToLast(limitCount)
  )
  
  const snapshot = await get(messagesQuery)
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
  const message = await saveMessage(content, senderId, username, '', true, recipientId, sessionId)
  
  // Update active chats for both users in real-time
  const timestamp = Date.now()
  
  // Update active chat for sender
  await set(ref(database, `active_chats/${senderId}/${recipientId}`), {
    userId: recipientId,
    lastMessageTime: timestamp,
    lastMessageContent: content,
    isSender: true,
    timestamp
  })
  
  // Update active chat for recipient
  await set(ref(database, `active_chats/${recipientId}/${senderId}`), {
    userId: senderId,
    lastMessageTime: timestamp,
    lastMessageContent: content,
    isSender: false,
    timestamp
  })
  
  // Add notification for recipient to ensure they know about new conversation
  await set(ref(database, `notifications/${recipientId}/unread_messages/${senderId}`), {
    from: senderId,
    fromUsername: username,
    timestamp,
    lastMessage: content,
    conversationId: [senderId, recipientId].sort().join('_')
  })
  
  return message
}

// Firestore operations for user data
export async function upsertUser(userId: string, username: string, zipcode: string, sessionId?: string, gender?: string, age?: string): Promise<User> {
  const userRef = doc(firestore, 'users', userId)
  const now = Timestamp.now()
  
  const userData = {
    id: userId,
    username,
    zipcode,
    last_seen: now,
    is_online: true,
    session_id: sessionId || null,
    gender: gender || null,
    age: age || null,
    created_at: now
  }
  
  await setDoc(userRef, userData, { merge: true })
  
  // Also update presence in Realtime Database
  await set(ref(database, `user_presence/${userId}`), {
    isOnline: true,
    lastSeen: Date.now(),
    zipcode,
    username
  })
  
  // Update active users list
  await set(ref(database, `active_users/${zipcode}/${userId}`), {
    username,
    gender: gender || null,
    age: age || null,
    joinedAt: Date.now(),
    lastActivity: Date.now()
  })
  
  return {
    id: userId,
    username,
    zipcode,
    last_seen: now.toDate(),
    is_online: true,
    session_id: sessionId,
    gender,
    age
  }
}

export async function updateUserPresence(userId: string): Promise<void> {
  // Update Firestore
  const userRef = doc(firestore, 'users', userId)
  await updateDoc(userRef, {
    last_seen: Timestamp.now(),
    is_online: true
  })
  
  // Update Realtime Database
  await update(ref(database, `user_presence/${userId}`), {
    isOnline: true,
    lastSeen: Date.now()
  })
}

export async function setUserOffline(userId: string): Promise<void> {
  // Update Firestore
  const userRef = doc(firestore, 'users', userId)
  await updateDoc(userRef, {
    is_online: false,
    last_seen: Timestamp.now()
  })
  
  // Update Realtime Database
  await update(ref(database, `user_presence/${userId}`), {
    isOnline: false,
    lastSeen: Date.now()
  })
}

export async function getActiveUsers(zipcode: string): Promise<User[]> {
  const usersRef = ref(database, `active_users/${zipcode}`)
  const snapshot = await get(usersRef)
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
          session_id: null,
          gender: data.gender || undefined,
          age: data.age || undefined
        })
      }
    }
  }
  
  return users.sort((a, b) => b.last_seen.getTime() - a.last_seen.getTime())
}

// Favourite users operations
export async function addFavouriteUser(userId: string, favouriteUserId: string, favouriteUsername: string): Promise<FavouriteUser> {
  const favouriteRef = doc(collection(firestore, 'user_favorites'))
  const now = Timestamp.now()
  
  const favouriteData = {
    userId,
    favoriteUserId: favouriteUserId,
    favoriteUsername: favouriteUsername,
    createdAt: now
  }
  
  await setDoc(favouriteRef, favouriteData)
  
  return {
    id: favouriteRef.id,
    user_id: userId,
    favourite_user_id: favouriteUserId,
    favourite_username: favouriteUsername,
    created_at: now.toDate()
  }
}

export async function removeFavouriteUser(userId: string, favouriteUserId: string): Promise<void> {
  const favouritesRef = collection(firestore, 'user_favorites')
  const q = firestoreQuery(favouritesRef, where('userId', '==', userId), where('favoriteUserId', '==', favouriteUserId))
  
  const querySnapshot = await getDocs(q)
  querySnapshot.forEach(async (doc) => {
    await deleteDoc(doc.ref)
  })
}

export async function getFavouriteUsers(userId: string): Promise<FavouriteUser[]> {
  const favouritesRef = collection(firestore, 'user_favorites')
  const q = firestoreQuery(favouritesRef, where('userId', '==', userId), orderBy('createdAt', 'desc'))
  
  const querySnapshot = await getDocs(q)
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
  const favouritesRef = collection(firestore, 'user_favorites')
  const q = firestoreQuery(favouritesRef, where('userId', '==', userId), where('favoriteUserId', '==', favouriteUserId), limit(1))
  
  const querySnapshot = await getDocs(q)
  return !querySnapshot.empty
}

// Active chats operations
export async function getActiveChats(userId: string, limitCount = 10): Promise<ActiveChatUser[]> {
  const activeChats: ActiveChatUser[] = []
  const conversationsRef = ref(database, 'private_messages')
  const snapshot = await get(conversationsRef)
  
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

// Cleanup functions
export async function cleanupOldData(): Promise<void> {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
  
  // Clean up old presence data
  const presenceRef = ref(database, 'user_presence')
  const presenceSnapshot = await get(presenceRef)
  
  if (presenceSnapshot.exists()) {
    const presenceData = presenceSnapshot.val()
    for (const [userId, userData] of Object.entries(presenceData)) {
      const data = userData as any
      if (data.lastSeen < fiveMinutesAgo) {
        await update(ref(database, `user_presence/${userId}`), {
          isOnline: false
        })
      }
    }
  }
  
  // Clean up old active users
  const activeUsersRef = ref(database, 'active_users')
  const activeUsersSnapshot = await get(activeUsersRef)
  
  if (activeUsersSnapshot.exists()) {
    const activeUsersData = activeUsersSnapshot.val()
    for (const [zipcode, users] of Object.entries(activeUsersData)) {
      const usersData = users as any
      for (const [userId, userData] of Object.entries(usersData)) {
        const data = userData as any
        if (data.lastActivity < fiveMinutesAgo) {
          await remove(ref(database, `active_users/${zipcode}/${userId}`))
        }
      }
    }
  }
  
  // Clean up old users in Firestore (mark offline)
  const usersRef = collection(firestore, 'users')
  const fiveMinutesAgoTimestamp = Timestamp.fromDate(new Date(fiveMinutesAgo))
  const oldUsersQuery = firestoreQuery(usersRef, where('last_seen', '<', fiveMinutesAgoTimestamp))
  
  const oldUsersSnapshot = await getDocs(oldUsersQuery)
  oldUsersSnapshot.forEach(async (userDoc) => {
    await updateDoc(userDoc.ref, {
      is_online: false
    })
  })
}

// Real-time listeners
export function subscribeToRoomMessages(zipcode: string, callback: (messages: Message[]) => void): () => void {
  const messagesRef = ref(database, `messages/${zipcode}`)
  const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(50))
  
  const unsubscribe = onValue(messagesQuery, (snapshot) => {
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
    callback(messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()))
  })
  
  return () => off(messagesRef, 'value', unsubscribe)
}

export function subscribeToPrivateMessages(userId1: string, userId2: string, callback: (messages: Message[]) => void): () => void {
  const conversationId = [userId1, userId2].sort().join('_')
  const messagesRef = ref(database, `private_messages/${conversationId}`)
  const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(50))
  
  const unsubscribe = onValue(messagesQuery, (snapshot) => {
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
    callback(messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()))
  })
  
  return () => off(messagesRef, 'value', unsubscribe)
}

export function subscribeToActiveUsers(zipcode: string, callback: (users: User[]) => void): () => void {
  const usersRef = ref(database, `active_users/${zipcode}`)
  
  const unsubscribe = onValue(usersRef, (snapshot) => {
    const users: User[] = []
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
    
    if (snapshot.exists()) {
      const activeUsers = snapshot.val()
      for (const [userId, userData] of Object.entries(activeUsers)) {
        const data = userData as any
        if (data.lastActivity > fiveMinutesAgo) {
          users.push({
            id: userId,
            username: data.username,
            last_seen: new Date(data.lastActivity),
            zipcode,
            is_online: true,
            session_id: null,
            gender: data.gender || undefined,
            age: data.age || undefined
          })
        }
      }
    }
    
    callback(users.sort((a, b) => b.last_seen.getTime() - a.last_seen.getTime()))
  })
  
  return () => off(usersRef, 'value', unsubscribe)
}

export function subscribeToActiveChats(userId: string, callback: (chats: ActiveChatUser[]) => void): () => void {
  const activeChatsRef = ref(database, `active_chats/${userId}`)
  
  const unsubscribe = onValue(activeChatsRef, async (snapshot) => {
    const chats: ActiveChatUser[] = []
    
    if (snapshot.exists()) {
      const chatData = snapshot.val()
      
      // Get usernames for all chat participants
      for (const [otherUserId, chatInfo] of Object.entries(chatData)) {
        const data = chatInfo as any
        
        // Get username from users collection
        try {
          const userRef = doc(firestore, 'users', otherUserId)
          const userDoc = await getDoc(userRef)
          const username = userDoc.exists() ? userDoc.data().username : otherUserId
          
          chats.push({
            user_id: otherUserId,
            username,
            last_message_time: new Date(data.lastMessageTime),
            last_message_content: data.lastMessageContent,
            is_sender: data.isSender
          })
        } catch (error) {
          console.error('Failed to get username for user:', otherUserId, error)
          chats.push({
            user_id: otherUserId,
            username: otherUserId,
            last_message_time: new Date(data.lastMessageTime),
            last_message_content: data.lastMessageContent,
            is_sender: data.isSender
          })
        }
      }
    }
    
    // Sort by most recent first
    chats.sort((a, b) => b.last_message_time.getTime() - a.last_message_time.getTime())
    callback(chats)
  })
  
  return () => off(activeChatsRef, 'value', unsubscribe)
}

export function subscribeToNotifications(userId: string, callback: (notifications: any) => void): () => void {
  const notificationsRef = ref(database, `notifications/${userId}`)
  
  const unsubscribe = onValue(notificationsRef, (snapshot) => {
    const notifications = snapshot.val() || {}
    callback(notifications)
  })
  
  return () => off(notificationsRef, 'value', unsubscribe)
}

export async function markNotificationAsRead(userId: string, notificationType: string = 'new_message'): Promise<void> {
  await remove(ref(database, `notifications/${userId}/${notificationType}`))
}

export async function markMessagesAsRead(userId: string, fromUserId: string): Promise<void> {
  await remove(ref(database, `notifications/${userId}/unread_messages/${fromUserId}`))
}

// Legacy compatibility functions
export const getMessages = getRoomMessages
export const initializeDatabase = async () => {
  console.log('Firebase database initialized')
}