"use client"

import { useState, useEffect, useCallback } from "react"
import { type Message, fetchPrivateMessages, sendPrivateMessage } from "@/lib/chat-utils"

export function usePrivateChat(currentUserId: string, recipientId: string | null, currentUsername: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch private messages when recipient changes
  useEffect(() => {
    if (!recipientId) {
      setMessages([])
      return
    }

    const fetchMessages = async () => {
      const privateMessages = await fetchPrivateMessages(currentUserId, recipientId)
      setMessages(privateMessages)
    }

    fetchMessages()
    const interval = setInterval(fetchMessages, 2000)

    return () => clearInterval(interval)
  }, [currentUserId, recipientId])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !recipientId) return

      setIsLoading(true)
      try {
        const message = await sendPrivateMessage(currentUserId, recipientId, content.trim(), currentUsername)
        if (message) {
          setMessages((prev) => [...prev, message])
        }
      } catch (error) {
        console.error("Failed to send private message:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [currentUserId, recipientId, currentUsername],
  )

  return {
    messages,
    sendMessage,
    isLoading,
  }
}
