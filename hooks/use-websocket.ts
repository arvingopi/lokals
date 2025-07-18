"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Message, User } from "@/lib/database"
import { loadUser } from "@/lib/user-persistence"

interface WebSocketMessage {
  type: string
  data: any
}

export function useWebSocket(userId: string, username: string, zipcode: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [privateMessages, setPrivateMessages] = useState<Map<string, Message[]>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttempts = useRef(0)

  const connect = useCallback(async () => {
    if (ws.current?.readyState === WebSocket.OPEN) return

    try {
      // Ensure WebSocket server is initialized
      await fetch('/api/websocket')
      
      // Use the correct WebSocket URL for your environment
      const wsUrl = process.env.NODE_ENV === "production" ? "wss://your-domain.com:8080" : "ws://localhost:8080"

      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        console.log("🔗 WebSocket connected")
        setIsConnected(true)
        reconnectAttempts.current = 0

        // Join the room with session info
        const user = loadUser()
        ws.current?.send(
          JSON.stringify({
            type: "join",
            data: { userId, username, zipcode, sessionId: user?.sessionId },
          }),
        )
      }

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error)
        }
      }

      ws.current.onclose = () => {
        console.log("📱 WebSocket disconnected")
        setIsConnected(false)

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < 5) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000
          console.log(`🔄 Reconnecting in ${delay}ms...`)
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, delay)
        }
      }

      ws.current.onerror = (error) => {
        console.error("❌ WebSocket error:", error)
        console.error("WebSocket URL:", wsUrl)
        console.error("WebSocket readyState:", ws.current?.readyState)
      }
    } catch (error) {
      console.error("❌ Error connecting to WebSocket:", error)
    }
  }, [userId, username, zipcode])

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case "joined":
        setMessages(message.data.messages || [])
        setUsers(message.data.users || [])
        break
      case "new_message":
        setMessages((prev) => {
          // Check if message already exists to prevent duplicates
          const messageExists = prev.some(msg => msg.id === message.data.id)
          if (messageExists) {
            console.log('🚫 Duplicate message detected, skipping:', message.data.id)
            return prev
          }
          console.log('✅ Adding new message:', message.data.id)
          return [...prev, message.data]
        })
        break
      case "new_private_message":
      case "private_message_sent":
        const senderId = message.data.user_id
        const recipientId = message.data.recipient_id
        const conversationId = senderId === userId ? recipientId : senderId

        setPrivateMessages((prev) => {
          const newMap = new Map(prev)
          const existing = newMap.get(conversationId) || []
          
          // Check if message already exists to prevent duplicates
          const messageExists = existing.some(msg => msg.id === message.data.id)
          if (messageExists) {
            console.log('🚫 Duplicate private message detected, skipping:', message.data.id)
            return prev
          }
          
          console.log('✅ Adding new private message:', message.data.id)
          newMap.set(conversationId, [...existing, message.data])
          return newMap
        })
        break
      case "private_messages_history":
        const historyRecipientId =
          message.data[0]?.recipient_id === userId ? message.data[0]?.user_id : message.data[0]?.recipient_id

        if (historyRecipientId) {
          setPrivateMessages((prev) => {
            const newMap = new Map(prev)
            newMap.set(historyRecipientId, message.data)
            return newMap
          })
        }
        break
      case "users_updated":
        setUsers(message.data)
        break
      case "user_joined":
      case "user_left":
        // User list will be updated via users_updated message
        break
      case "error":
        console.error("❌ WebSocket error:", message.data.message)
        break
      case "pong":
        // Heartbeat response
        break
    }
  }

  const sendMessage = useCallback((content: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      setIsLoading(true)
      ws.current.send(
        JSON.stringify({
          type: "message",
          data: { content },
        }),
      )
      setIsLoading(false)
    }
  }, [])

  const sendPrivateMessage = useCallback((recipientId: string, content: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      setIsLoading(true)
      ws.current.send(
        JSON.stringify({
          type: "private_message",
          data: { recipientId, content },
        }),
      )
      setIsLoading(false)
    }
  }, [])

  const getPrivateMessages = useCallback((recipientId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: "get_private_messages",
          data: { recipientId },
        }),
      )
    }
  }, [])

  const updatePresence = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: "presence",
        }),
      )
    }
  }, [])

  // Connect on mount
  useEffect(() => {
    connect()

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [connect])

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
    updatePresence,
  }
}
