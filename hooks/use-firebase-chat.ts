"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { 
  subscribeToRoomMessages, 
  subscribeToPrivateMessages, 
  subscribeToActiveUsers,
  saveMessage,
  savePrivateMessage,
  updateUserPresence,
  upsertUser,
  type Message, 
  type User 
} from "@/lib/firebase-database"
import firebaseAuthClient from "@/lib/firebase-auth-client"
import { loadUser } from "@/lib/user-persistence"

interface FirebaseChatHook {
  messages: Message[]
  users: User[]
  privateMessages: Map<string, Message[]>
  isConnected: boolean
  isLoading: boolean
  sendMessage: (content: string) => Promise<void>
  sendPrivateMessage: (recipientId: string, content: string) => Promise<void>
  getPrivateMessages: (recipientId: string) => void
  updatePresence: () => Promise<void>
}

export function useFirebaseChat(userId: string, username: string, zipcode: string): FirebaseChatHook {
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [privateMessages, setPrivateMessages] = useState<Map<string, Message[]>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const unsubscribeRefs = useRef<{
    roomMessages?: () => void
    activeUsers?: () => void
    privateChats: Map<string, () => void>
  }>({
    privateChats: new Map()
  })

  const isInitialized = useRef(false)

  // Initialize user and connect to Firebase
  const initializeUser = useCallback(async () => {
    if (isInitialized.current) return

    try {
      setIsLoading(true)
      
      // User is already authenticated via email/password, just get current profile
      const currentUser = firebaseAuthClient.getCurrentUser()
      const currentProfile = firebaseAuthClient.getCurrentProfile()
      
      if (!currentUser || !currentProfile) {
        throw new Error("User must be authenticated before using chat")
      }

      // Upsert user in database with the authenticated profile
      await upsertUser(userId, username, zipcode, currentProfile.userId)
      
      setIsConnected(true)
      isInitialized.current = true
      
    } catch (error) {
      console.error("❌ Error initializing Firebase user:", error)
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [userId, username, zipcode])

  // Subscribe to room messages
  const subscribeToRoom = useCallback(() => {
    if (!zipcode || unsubscribeRefs.current.roomMessages) return

    console.log("📡 Subscribing to room messages for zipcode:", zipcode)
    
    const unsubscribe = subscribeToRoomMessages(zipcode, (newMessages) => {
      setMessages(newMessages)
    })
    
    unsubscribeRefs.current.roomMessages = unsubscribe
  }, [zipcode])

  // Subscribe to active users
  const subscribeToUsers = useCallback(() => {
    if (!zipcode || unsubscribeRefs.current.activeUsers) return

    console.log("👥 Subscribing to active users for zipcode:", zipcode)
    
    const unsubscribe = subscribeToActiveUsers(zipcode, (activeUsers) => {
      setUsers(activeUsers)
    })
    
    unsubscribeRefs.current.activeUsers = unsubscribe
  }, [zipcode])

  // Subscribe to private messages with a specific user
  const subscribeToPrivateChat = useCallback((recipientId: string) => {
    if (unsubscribeRefs.current.privateChats.has(recipientId)) return

    console.log("💬 Subscribing to private messages with:", recipientId)
    
    const unsubscribe = subscribeToPrivateMessages(userId, recipientId, (newMessages) => {
      setPrivateMessages((prev) => {
        const newMap = new Map(prev)
        newMap.set(recipientId, newMessages)
        return newMap
      })
    })
    
    unsubscribeRefs.current.privateChats.set(recipientId, unsubscribe)
  }, [userId])

  // Send a message to the room
  const sendMessage = useCallback(async (content: string) => {
    if (!isConnected || isLoading) return

    const tempId = `temp_${Date.now()}_${Math.random()}`
    const optimisticMessage: Message = {
      id: tempId,
      content,
      timestamp: new Date(),
      user_id: userId,
      username,
      zipcode,
      is_private: false,
      session_id: undefined
    }

    // Optimistic update
    setMessages(prev => [...prev, optimisticMessage])

    try {
      setIsLoading(true)
      
      const user = loadUser()
      const savedMessage = await saveMessage(content, userId, username, zipcode, false, undefined, user?.sessionId)
      
      // Remove optimistic message and let real-time listener handle the real one
      setMessages(prev => prev.filter(m => m.id !== tempId))
      
      console.log("✅ Message sent successfully")
    } catch (error) {
      console.error("❌ Error sending message:", error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setIsLoading(false)
    }
  }, [userId, username, zipcode, isConnected, isLoading])

  // Send a private message
  const sendPrivateMessage = useCallback(async (recipientId: string, content: string) => {
    if (!isConnected || isLoading) return

    const tempId = `temp_private_${Date.now()}_${Math.random()}`
    const optimisticMessage: Message = {
      id: tempId,
      content,
      timestamp: new Date(),
      user_id: userId,
      username,
      zipcode: '',
      is_private: true,
      recipient_id: recipientId,
      session_id: undefined
    }

    // Optimistic update for sender
    setPrivateMessages(prev => {
      const newMap = new Map(prev)
      const existingMessages = newMap.get(recipientId) || []
      newMap.set(recipientId, [...existingMessages, optimisticMessage])
      return newMap
    })

    try {
      setIsLoading(true)
      
      const user = loadUser()
      await savePrivateMessage(userId, recipientId, content, username, user?.sessionId)
      
      // Ensure we're subscribed to this private chat
      subscribeToPrivateChat(recipientId)
      
      // Remove optimistic message - real-time listener will handle the real one
      setPrivateMessages(prev => {
        const newMap = new Map(prev)
        const messages = newMap.get(recipientId) || []
        newMap.set(recipientId, messages.filter(m => m.id !== tempId))
        return newMap
      })
      
      console.log("✅ Private message sent successfully")
    } catch (error) {
      console.error("❌ Error sending private message:", error)
      
      // Remove optimistic message on error
      setPrivateMessages(prev => {
        const newMap = new Map(prev)
        const messages = newMap.get(recipientId) || []
        newMap.set(recipientId, messages.filter(m => m.id !== tempId))
        return newMap
      })
    } finally {
      setIsLoading(false)
    }
  }, [userId, username, isConnected, isLoading, subscribeToPrivateChat])

  // Get private messages (subscribe to them)
  const getPrivateMessages = useCallback((recipientId: string) => {
    // Always ensure we're subscribed when accessing private messages
    subscribeToPrivateChat(recipientId)
    return privateMessages.get(recipientId) || []
  }, [subscribeToPrivateChat, privateMessages])

  // Start a private chat (ensures subscription)
  const startPrivateChat = useCallback((recipientId: string) => {
    // Immediately subscribe to ensure real-time updates
    subscribeToPrivateChat(recipientId)
    
    // Initialize empty conversation if it doesn't exist
    if (!privateMessages.has(recipientId)) {
      setPrivateMessages(prev => {
        const newMap = new Map(prev)
        newMap.set(recipientId, [])
        return newMap
      })
    }
  }, [subscribeToPrivateChat, privateMessages])

  // Update user presence
  const updatePresence = useCallback(async () => {
    if (!isConnected) return

    try {
      await updateUserPresence(userId)
    } catch (error) {
      console.error("❌ Error updating presence:", error)
    }
  }, [userId, isConnected])

  // Initialize on mount
  useEffect(() => {
    initializeUser()
    
    // Cleanup on unmount
    return () => {
      // Clean up all subscriptions
      if (unsubscribeRefs.current.roomMessages) {
        unsubscribeRefs.current.roomMessages()
      }
      if (unsubscribeRefs.current.activeUsers) {
        unsubscribeRefs.current.activeUsers()
      }
      unsubscribeRefs.current.privateChats.forEach((unsubscribe) => {
        unsubscribe()
      })
      unsubscribeRefs.current.privateChats.clear()
    }
  }, [initializeUser])

  // Set up subscriptions when connected
  useEffect(() => {
    if (isConnected) {
      subscribeToRoom()
      subscribeToUsers()
    }
  }, [isConnected, subscribeToRoom, subscribeToUsers])

  // Send presence updates every 30 seconds
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(updatePresence, 30000)
    return () => clearInterval(interval)
  }, [isConnected, updatePresence])

  return {
    messages,
    users,
    privateMessages,
    isConnected,
    isLoading,
    sendMessage,
    sendPrivateMessage,
    getPrivateMessages,
    startPrivateChat,
    updatePresence,
  }
}

// Legacy compatibility export
export const useWebSocket = useFirebaseChat