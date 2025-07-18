"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Message } from "@/lib/database"

export function usePrivateWebSocket(userId: string, recipientId: string | null, username: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const ws = useRef<WebSocket | null>(null)

  // Connect to WebSocket if not already connected
  const connect = useCallback(() => {
    if (!recipientId || ws.current?.readyState === WebSocket.OPEN) return

    try {
      ws.current = new WebSocket("ws://localhost:8080")

      ws.current.onopen = () => {
        // Request private message history
        ws.current?.send(
          JSON.stringify({
            type: "get_private_messages",
            data: { recipientId },
          }),
        )
      }

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)

          if (message.type === "new_private_message" || message.type === "private_message_sent") {
            // Only add if it's for this conversation
            if (
              message.data.user_id === userId ||
              message.data.user_id === recipientId ||
              message.data.recipient_id === userId ||
              message.data.recipient_id === recipientId
            ) {
              setMessages((prev) => [...prev, message.data])
            }
          } else if (message.type === "private_messages_history") {
            setMessages(message.data)
          }
        } catch (error) {
          console.error("Error parsing private WebSocket message:", error)
        }
      }
    } catch (error) {
      console.error("Error connecting to private WebSocket:", error)
    }
  }, [userId, recipientId])

  const sendMessage = useCallback(
    (content: string) => {
      if (ws.current?.readyState === WebSocket.OPEN && recipientId) {
        setIsLoading(true)
        ws.current.send(
          JSON.stringify({
            type: "private_message",
            data: { recipientId, content },
          }),
        )
        setIsLoading(false)
      }
    },
    [recipientId],
  )

  useEffect(() => {
    if (recipientId) {
      connect()
    } else {
      setMessages([])
    }

    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [connect, recipientId])

  return {
    messages,
    sendMessage,
    isLoading,
  }
}
