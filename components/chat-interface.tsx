"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, MapPin, ArrowLeft, Wifi, WifiOff } from "lucide-react"
import { useFirebaseChat } from "@/hooks/use-firebase-chat"
import type { Message, User } from "@/lib/firebase-database"
import { formatTime } from "@/lib/chat-utils"
import { isCanadianFSA } from "@/lib/zipcode-utils"
import { RoomInfo } from "@/components/room-info"
import { ActiveUsersSidebar } from "@/components/active-users-sidebar"
import { UserProfileModal } from "@/components/user-profile-modal"
import { loadUser } from "@/lib/user-persistence"
import firebaseAuthClient from "@/lib/firebase-auth-client"

interface ChatInterfaceProps {
  zipcode: string
  username: string
  userId: string
}

export function ChatInterface({ zipcode, username, userId }: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileModalUser, setProfileModalUser] = useState<User | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)

  const {
    messages: roomMessages,
    users,
    privateMessages,
    isConnected,
    isLoading,
    sendMessage: sendRoomMessage,
    sendPrivateMessage,
    getPrivateMessages,
    startPrivateChat,
  } = useFirebaseChat(userId, username, zipcode)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isPrivateChat = selectedUserId !== null
  const messages = isPrivateChat ? privateMessages.get(selectedUserId) || [] : roomMessages

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load current user profile data on mount
  useEffect(() => {
    // Get the full profile from Firebase auth client instead of legacy loadUser
    const profile = firebaseAuthClient.getCurrentProfile()
    setCurrentUserProfile(profile)
  }, [])

  // Load private messages when selecting a user
  useEffect(() => {
    if (selectedUserId && isConnected) {
      getPrivateMessages(selectedUserId)
    }
  }, [selectedUserId, isConnected, getPrivateMessages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !isConnected) return

    if (isPrivateChat && selectedUserId) {
      sendPrivateMessage(selectedUserId, inputMessage)
    } else {
      sendRoomMessage(inputMessage)
    }

    setInputMessage("")
  }

  const handleUserClick = (user: User) => {
    setSelectedUserId(user.id)
    setSelectedUser(user)
    
    // Ensure both users are subscribed to this private conversation
    startPrivateChat(user.id)
    getPrivateMessages(user.id)
  }

  const handleBackToRoom = () => {
    setSelectedUserId(null)
    setSelectedUser(null)
  }

  const handleOpenProfile = (user: User) => {
    setProfileModalUser(user)
    setProfileModalOpen(true)
  }

  const handleCloseProfile = () => {
    setProfileModalOpen(false)
    setProfileModalUser(null)
  }

  const handleOpenCurrentUserProfile = () => {
    // Create a user object for the current user with session data
    const currentUser: User = {
      id: userId,
      username: username,
      zipcode: zipcode,
      last_seen: new Date().toISOString(),
      is_online: true,
      session_id: undefined
    }
    handleOpenProfile(currentUser)
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)'
    }}>
      {/* Active Users Sidebar */}
      <div className="w-64 flex-shrink-0">
        <ActiveUsersSidebar
          users={users}
          currentUserId={userId}
          currentUsername={username}
          selectedUserId={selectedUserId}
          onUserSelect={setSelectedUserId}
          onUserClick={handleUserClick}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}>
        <div className="flex-shrink-0 bg-white/5 py-6 px-6">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-3 text-white text-lg font-bold">
              {isPrivateChat ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleBackToRoom}
                    className="text-white hover:bg-white/20 rounded-xl"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-lg">💬 {selectedUser?.username}</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-lg font-bold">#{zipcode}</span>
                    {isCanadianFSA(zipcode) && (
                      <span className="text-sm font-normal text-white/60">🍁</span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant={isConnected ? "default" : "destructive"} 
                className={`flex items-center gap-1 px-3 py-1 rounded-xl border-0 ${
                  isConnected 
                    ? "bg-emerald-500/20 text-emerald-300" 
                    : "bg-red-500/20 text-red-300"
                }`}
              >
                {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isConnected ? "Online" : "Offline"}
              </Badge>
              <span className="text-sm text-white/80 hidden sm:inline">
                <span 
                  className="font-medium cursor-pointer hover:text-emerald-300 transition-colors" 
                  onClick={handleOpenCurrentUserProfile}
                  title="View Profile"
                >
                  {username}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-0 min-h-0 bg-black/10">

          <ScrollArea className="flex-1 p-4 pt-2 min-h-0">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-white/60 py-12">
                  <div className="text-4xl mb-4">
                    {isPrivateChat ? "💬" : "🚀"}
                  </div>
                  <p className="text-lg">
                    {isPrivateChat
                      ? `Start chatting with ${selectedUser?.username}!`
                      : "Be the first to say hello!"}
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble 
                    key={message.id} 
                    message={message} 
                    isOwn={message.user_id === userId}
                    onUsernameClick={() => {
                      if (message.user_id !== userId) {
                        // Find the user in the users array
                        const user = users.find(u => u.id === message.user_id)
                        if (user) {
                          handleOpenProfile(user)
                        }
                      }
                    }}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-4 flex-shrink-0 bg-white/5">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  !isConnected
                    ? "Connecting..."
                    : isPrivateChat
                      ? `Message ${selectedUser?.username}...`
                      : "Type your message..."
                }
                disabled={isLoading || !isConnected}
                className="flex-1 bg-white/10 border-0 text-white placeholder:text-white/50 focus:bg-white/20 h-12 rounded-xl"
                maxLength={500}
              />
              <Button 
                type="submit" 
                disabled={isLoading || !inputMessage.trim() || !isConnected}
                className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white h-12 px-6 shadow-lg disabled:opacity-50 rounded-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {profileModalUser && (
        <UserProfileModal
          isOpen={profileModalOpen}
          onClose={handleCloseProfile}
          user={{
            id: profileModalUser.id,
            username: profileModalUser.username,
            zipcode: profileModalUser.zipcode,
            gender: profileModalUser.id === userId ? currentUserProfile?.gender : undefined,
            age: profileModalUser.id === userId ? currentUserProfile?.age : undefined,
            joinDate: profileModalUser.id === userId ? currentUserProfile?.createdAt : profileModalUser.last_seen,
            isCurrentUser: profileModalUser.id === userId
          }}
        />
      )}
    </div>
  )
}

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  onUsernameClick?: () => void
}

function MessageBubble({ message, isOwn, onUsernameClick }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[70%] min-w-0 ${isOwn ? "order-2" : "order-1"}`}>
        <div className={`rounded-2xl px-4 py-3 break-words shadow-lg ${
          isOwn 
            ? "bg-gradient-to-r from-emerald-500 to-blue-500 text-white" 
            : "bg-white/20 backdrop-blur-sm text-white border border-white/30"
        }`}>
          <p className="text-sm break-words overflow-wrap-anywhere font-medium">{message.content}</p>
        </div>
        <div
          className={`flex items-center gap-2 mt-2 text-xs text-white/60 ${
            isOwn ? "justify-end" : "justify-start"
          }`}
        >
          <span 
            className={`truncate font-medium ${
              !isOwn && onUsernameClick ? "cursor-pointer hover:text-emerald-300 transition-colors" : ""
            }`}
            onClick={!isOwn && onUsernameClick ? onUsernameClick : undefined}
          >
            {isOwn ? "You" : message.username}
          </span>
          <span>•</span>
          <span className="whitespace-nowrap">{formatTime(new Date(message.timestamp).getTime())}</span>
        </div>
      </div>
    </div>
  )
}
