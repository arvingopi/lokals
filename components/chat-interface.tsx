"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, MapPin, ArrowLeft, Wifi, WifiOff, Heart, HeartOff } from "lucide-react"
import { useFirebaseChat } from "@/hooks/use-firebase-chat"
import type { Message, User, FavouriteUser } from "@/lib/firebase-database"
import { formatTime } from "@/lib/chat-utils"
import { isCanadianFSA } from "@/lib/zipcode-utils"
import { ActiveUsersSidebar } from "@/components/active-users-sidebar"
import { UserProfileModal } from "@/components/user-profile-modal"
import firebaseAuthClient from "@/lib/firebase-auth-client"
import type { SessionProfile } from "@/lib/firebase-auth-client"

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
  const [currentUserProfile, setCurrentUserProfile] = useState<SessionProfile | null>(null)
  const [favouriteUserIds, setFavouriteUserIds] = useState<Set<string>>(new Set())
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0)

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
  const messages = useMemo(() => {
    return isPrivateChat ? privateMessages.get(selectedUserId) || [] : roomMessages
  }, [isPrivateChat, privateMessages, selectedUserId, roomMessages])

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
      last_seen: new Date(),
      is_online: true,
      session_id: undefined
    }
    handleOpenProfile(currentUser)
  }

  // Fetch favorites on component mount
  useEffect(() => {
    const fetchFavourites = async () => {
      try {
        const response = await fetch(`/api/favourites?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          const favoriteIds = new Set<string>(data.favourites.map((fav: FavouriteUser) => fav.favourite_user_id))
          setFavouriteUserIds(favoriteIds)
        }
      } catch (error) {
        console.error("Error fetching favourites:", error)
      }
    }
    
    if (userId) {
      fetchFavourites()
    }
  }, [userId])

  const toggleFavourite = async (user: User) => {
    const isFavourite = favouriteUserIds.has(user.id)
    
    try {
      if (isFavourite) {
        // Remove from favourites
        const response = await fetch(`/api/favourites?userId=${userId}&favouriteUserId=${user.id}`, {
          method: "DELETE"
        })
        if (response.ok) {
          setFavouriteUserIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(user.id)
            return newSet
          })
          setSidebarRefreshTrigger(prev => prev + 1) // Trigger sidebar refresh
        }
      } else {
        // Add to favourites
        const response = await fetch(`/api/favourites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userId,
            favouriteUserId: user.id,
            favouriteUsername: user.username
          })
        })
        if (response.ok) {
          setFavouriteUserIds(prev => new Set(prev).add(user.id))
          setSidebarRefreshTrigger(prev => prev + 1) // Trigger sidebar refresh
        }
      }
    } catch (error) {
      console.error("Error toggling favourite:", error)
    }
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
          refreshTrigger={sidebarRefreshTrigger}
          zipcode={zipcode}
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
                  <div className="flex items-center gap-3">
                    <span className="text-lg">💬 {selectedUser?.username}</span>
                    {selectedUser?.age && (
                      <span className="text-sm text-white/70 bg-white/10 px-2 py-1 rounded-lg">
                        {selectedUser.age}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (selectedUser) {
                          toggleFavourite(selectedUser)
                        }
                      }}
                      className="text-white hover:bg-white/20 rounded-xl"
                      title={favouriteUserIds.has(selectedUser?.id || '') ? "Remove from favorites" : "Add to favorites"}
                    >
                      {favouriteUserIds.has(selectedUser?.id || '') ? (
                        <Heart className="h-4 w-4 text-red-400 fill-current" />
                      ) : (
                        <HeartOff className="h-4 w-4 text-white/60" />
                      )}
                    </Button>
                  </div>
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
            joinDate: profileModalUser.id === userId ? currentUserProfile?.createdAt : profileModalUser.last_seen?.toISOString(),
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
