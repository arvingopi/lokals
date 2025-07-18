import { WebSocketServer } from "ws"
import type { WebSocket } from "ws"
import {
  saveMessage,
  upsertUser,
  updateUserPresence,
  setUserOffline,
  getRoomMessages,
  getActiveUsers,
  getPrivateMessages,
  savePrivateMessage,
} from "./database"

interface WebSocketClient extends WebSocket {
  connectionId?: string
  userId?: string
  username?: string
  zipcode?: string
  sessionId?: string
  isAlive?: boolean
}

interface WebSocketMessage {
  type: "join" | "message" | "private_message" | "get_private_messages" | "presence" | "ping"
  data: any
}

class ChatWebSocketServer {
  private wss: WebSocketServer
  private clients: Map<string, WebSocketClient> = new Map() // connectionId -> WebSocket
  private userConnections: Map<string, Set<string>> = new Map() // userId -> Set of connectionIds

  constructor(port = 8080) {
    this.wss = new WebSocketServer({ port })
    this.setupServer()
    console.log(`🚀 WebSocket server running on port ${port}`)
  }

  private setupServer() {
    this.wss.on("connection", (ws: WebSocketClient) => {
      // Generate unique connection ID
      ws.connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      console.log("📱 New WebSocket connection:", ws.connectionId)

      ws.isAlive = true

      ws.on("pong", () => {
        ws.isAlive = true
      })

      ws.on("message", async (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString())
          await this.handleMessage(ws, message)
        } catch (error) {
          console.error("❌ Error handling WebSocket message:", error)
          ws.send(JSON.stringify({ type: "error", data: { message: "Invalid message format" } }))
        }
      })

      ws.on("close", async () => {
        if (ws.connectionId) {
          console.log("📱 WebSocket connection closed:", ws.connectionId)
          
          // Remove connection from clients map
          this.clients.delete(ws.connectionId)
          
          // Remove connection from user's connection set
          if (ws.userId) {
            const userConnections = this.userConnections.get(ws.userId)
            if (userConnections) {
              userConnections.delete(ws.connectionId)
              
              // If user has no more connections, mark them offline
              if (userConnections.size === 0) {
                await setUserOffline(ws.userId)
                this.userConnections.delete(ws.userId)
                
                // Notify room about user leaving
                if (ws.zipcode) {
                  await this.broadcastToRoom(ws.zipcode, {
                    type: "user_left",
                    data: { userId: ws.userId, username: ws.username },
                  })
                  await this.broadcastUserList(ws.zipcode)
                }
              }
            }
          }
        }
      })

      ws.on("error", (error) => {
        console.error("❌ WebSocket error:", error)
      })
    })

    // Heartbeat to detect broken connections
    setInterval(() => {
      this.wss.clients.forEach((ws: WebSocketClient) => {
        if (!ws.isAlive) {
          ws.terminate()
          return
        }
        ws.isAlive = false
        ws.ping()
      })
    }, 30000) // 30 seconds
  }

  private async handleMessage(ws: WebSocketClient, message: WebSocketMessage) {
    try {
      switch (message.type) {
        case "join":
          await this.handleJoin(ws, message.data)
          break
        case "message":
          await this.handleRoomMessage(ws, message.data)
          break
        case "private_message":
          await this.handlePrivateMessage(ws, message.data)
          break
        case "get_private_messages":
          await this.handleGetPrivateMessages(ws, message.data)
          break
        case "presence":
          await this.handlePresence(ws)
          break
        case "ping":
          ws.send(JSON.stringify({ type: "pong" }))
          break
        default:
          ws.send(JSON.stringify({ type: "error", data: { message: "Unknown message type" } }))
      }
    } catch (error) {
      console.error("❌ Error in handleMessage:", error)
      ws.send(JSON.stringify({ type: "error", data: { message: "Server error" } }))
    }
  }

  private async handleJoin(ws: WebSocketClient, data: { userId: string; username: string; zipcode: string; sessionId?: string }) {
    const { userId, username, zipcode, sessionId } = data

    console.log('🔗 User joining:', { 
      connectionId: ws.connectionId, 
      userId, 
      username, 
      zipcode 
    })

    // Store client info
    ws.userId = userId
    ws.username = username
    ws.zipcode = zipcode
    ws.sessionId = sessionId
    
    // Store connection by connectionId
    if (ws.connectionId) {
      this.clients.set(ws.connectionId, ws)
      
      // Track user connections
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set())
      }
      this.userConnections.get(userId)!.add(ws.connectionId)
      
      console.log('👥 User now has', this.userConnections.get(userId)!.size, 'connections')
    }

    // Update user in database with session info
    await upsertUser(userId, username, zipcode, sessionId)

    // Send initial data
    const [messages, users] = await Promise.all([getRoomMessages(zipcode), getActiveUsers(zipcode)])

    ws.send(
      JSON.stringify({
        type: "joined",
        data: { messages, users },
      }),
    )

    // Notify room about new user and send updated user list
    await this.broadcastToRoom(
      zipcode,
      {
        type: "user_joined",
        data: { userId, username },
      },
      userId,
    )

    await this.broadcastUserList(zipcode)
  }

  private async handleRoomMessage(ws: WebSocketClient, data: { content: string }) {
    if (!ws.userId || !ws.username || !ws.zipcode) {
      ws.send(JSON.stringify({ type: "error", data: { message: "Not joined to a room" } }))
      return
    }

    const message = await saveMessage(data.content, ws.userId, ws.username, ws.zipcode, false, undefined, ws.sessionId)
    console.log('💬 Message saved:', { 
      messageId: message.id.substring(0, 8) + '...', 
      userId: ws.userId, 
      sessionId: ws.sessionId?.substring(0, 8) + '...',
      zipcode: ws.zipcode 
    })

    // Broadcast to all users in the room
    await this.broadcastToRoom(ws.zipcode, {
      type: "new_message",
      data: message,
    })
  }

  private async handlePrivateMessage(ws: WebSocketClient, data: { recipientId: string; content: string }) {
    if (!ws.userId || !ws.username) {
      ws.send(JSON.stringify({ type: "error", data: { message: "User not authenticated" } }))
      return
    }

    const message = await savePrivateMessage(ws.userId, data.recipientId, data.content, ws.username, ws.sessionId)

    // Send to all recipient connections
    const recipientConnections = this.userConnections.get(data.recipientId)
    if (recipientConnections && recipientConnections.size > 0) {
      recipientConnections.forEach((connectionId) => {
        const recipientWs = this.clients.get(connectionId)
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          recipientWs.send(
            JSON.stringify({
              type: "new_private_message",
              data: message,
            }),
          )
        }
      })
    }

    // Send confirmation to sender
    ws.send(
      JSON.stringify({
        type: "private_message_sent",
        data: message,
      }),
    )
  }

  private async handleGetPrivateMessages(ws: WebSocketClient, data: { recipientId: string }) {
    if (!ws.userId) {
      ws.send(JSON.stringify({ type: "error", data: { message: "User not authenticated" } }))
      return
    }

    const messages = await getPrivateMessages(ws.userId, data.recipientId)

    ws.send(
      JSON.stringify({
        type: "private_messages_history",
        data: messages,
      }),
    )
  }

  private async handlePresence(ws: WebSocketClient) {
    if (ws.userId && ws.zipcode) {
      await updateUserPresence(ws.userId)
      await this.broadcastUserList(ws.zipcode)
    }
  }

  private async broadcastToRoom(zipcode: string, message: any, excludeUserId?: string) {
    console.log('📡 Broadcasting to room:', { 
      zipcode, 
      connectedClients: this.clients.size,
      messageType: message.type,
      excludeUserId 
    })

    // Instead of getting users from database, broadcast to all active connections in this room
    const sentToConnections = new Set<string>()
    
    this.clients.forEach((client, connectionId) => {
      if (client.zipcode === zipcode && 
          client.userId !== excludeUserId && 
          client.readyState === WebSocket.OPEN &&
          !sentToConnections.has(connectionId)) {
        
        console.log('✅ Sending to connection:', connectionId, 'for user:', client.userId)
        client.send(JSON.stringify(message))
        sentToConnections.add(connectionId)
      }
    })
    
    console.log('📊 Sent to', sentToConnections.size, 'connections')
  }

  private async broadcastUserList(zipcode: string) {
    const users = await getActiveUsers(zipcode)

    await this.broadcastToRoom(zipcode, {
      type: "users_updated",
      data: users,
    })
  }
}

// Export singleton instance
let wsServer: ChatWebSocketServer | null = null

export function getWebSocketServer(): ChatWebSocketServer {
  if (!wsServer) {
    wsServer = new ChatWebSocketServer()
  }
  return wsServer
}

export { ChatWebSocketServer }
