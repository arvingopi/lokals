"use client"

import { useState, useEffect, useCallback } from "react"
import {
  type Message,
  type User,
  fetchRoomData,
  sendRoomMessage,
  updatePresence,
  generateUserId,
} from "@/lib/chat-utils"

export function useChat(zipcode: string, username: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [userId] = useState(() => generateUserId())
  const [isLoading, setIsLoading] = useState(false)

  // Fetch room data and update presence
  useEffect(() => {
    if (!zipcode || !username) return

    const fetchData = async () => {
      const data = await fetchRoomData(zipcode)
      setMessages(data.messages)
      setUsers(data.users)
    }

    const updateUserPresence = async () => {
      await updatePresence(zipcode, userId, username)
    }

    // Initial fetch and presence update
    fetchData()
    updateUserPresence()

    // Set up intervals
    const fetchInterval = setInterval(fetchData, 2000) // Fetch every 2 seconds
    const presenceInterval = setInterval(updateUserPresence, 10000) // Update presence every 10 seconds

    return () => {
      clearInterval(fetchInterval)
      clearInterval(presenceInterval)
    }
  }, [zipcode, username, userId])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !zipcode) return

      setIsLoading(true)
      try {
        const message = await sendRoomMessage(zipcode, content.trim(), userId, username)
        if (message) {
          // Immediately add to local state for instant feedback
          setMessages((prev) => [...prev, message])
        }
      } catch (error) {
        console.error("Failed to send message:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [zipcode, userId, username],
  )

  return {
    messages,
    users,
    sendMessage,
    isLoading,
    userId,
  }
}
