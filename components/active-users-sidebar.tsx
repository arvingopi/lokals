"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Users, MessageCircle, Hash, Heart, HeartOff, Star, ChevronDown, ChevronRight, MapPin, Clock } from "lucide-react"
import type { User } from "@/lib/chat-utils"
import type { FavouriteUser, ActiveChatUser } from "@/lib/database"
import { subscribeToActiveChats } from "@/lib/firebase-database"
import { useState, useEffect } from "react"

interface ActiveUsersSidebarProps {
  users: User[]
  currentUserId: string
  currentUsername: string
  selectedUserId: string | null
  onUserSelect: (userId: string | null) => void
  onUserClick: (user: User) => void
}

// Helper function to get gender emoji
const getGenderEmoji = (gender?: string) => {
  switch (gender?.toLowerCase()) {
    case "male": return "♂️"
    case "female": return "♀️"
    case "non-binary": return "⚥"
    case "prefer-not-to-say": return "🤐"
    default: return "👤"
  }
}

export function ActiveUsersSidebar({
  users,
  currentUserId,
  currentUsername,
  selectedUserId,
  onUserSelect,
  onUserClick,
}: ActiveUsersSidebarProps) {
  const [favouriteUsers, setFavouriteUsers] = useState<FavouriteUser[]>([])
  const [favouriteUserIds, setFavouriteUserIds] = useState<Set<string>>(new Set())
  const [activeChats, setActiveChats] = useState<ActiveChatUser[]>([])
  const [isRoomExpanded, setIsRoomExpanded] = useState(true)
  
  const otherUsers = users.filter((user) => user.id !== currentUserId)
  
  // Get the current room's zipcode (from any user since they're all in the same room)
  const currentZipcode = users.length > 0 ? users[0].zipcode : ""
  const displayZipcode = currentZipcode.length >= 3 ? currentZipcode.substring(0, 3) : currentZipcode

  // Fetch data on component mount and when messages change
  useEffect(() => {
    fetchFavouriteUsers()
    
    // Subscribe to real-time active chats instead of API polling
    const unsubscribeActiveChats = subscribeToActiveChats(currentUserId, (chats) => {
      setActiveChats(chats)
    })
    
    return () => {
      unsubscribeActiveChats()
    }
  }, [currentUserId])

  const fetchFavouriteUsers = async () => {
    try {
      const response = await fetch(`/api/favourites?userId=${currentUserId}`)
      if (response.ok) {
        const data = await response.json()
        setFavouriteUsers(data.favourites)
        setFavouriteUserIds(new Set(data.favourites.map((fav: FavouriteUser) => fav.favourite_user_id)))
      }
    } catch (error) {
      console.error("Error fetching favourite users:", error)
    }
  }


  const toggleFavourite = async (user: User) => {
    const isFavourite = favouriteUserIds.has(user.id)
    
    try {
      if (isFavourite) {
        // Remove from favourites
        const response = await fetch(`/api/favourites?userId=${currentUserId}&favouriteUserId=${user.id}`, {
          method: "DELETE"
        })
        if (response.ok) {
          setFavouriteUsers(prev => prev.filter(fav => fav.favourite_user_id !== user.id))
          setFavouriteUserIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(user.id)
            return newSet
          })
        }
      } else {
        // Add to favourites
        const response = await fetch(`/api/favourites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUserId,
            favouriteUserId: user.id,
            favouriteUsername: user.username
          })
        })
        if (response.ok) {
          await fetchFavouriteUsers() // Refresh the list
        }
      }
    } catch (error) {
      console.error("Error toggling favourite:", error)
    }
  }

  // Helper function to convert ActiveChatUser to User for compatibility
  const createUserFromActiveChat = (activeChat: ActiveChatUser): User => ({
    id: activeChat.user_id,
    username: activeChat.username,
    last_seen: activeChat.last_message_time,
    zipcode: currentZipcode,
    is_online: users.some(u => u.id === activeChat.user_id), // Check if user is currently online
    session_id: undefined
  })

  // Real-time active chats are now handled via subscription, no manual refresh needed

  // Get favourite users that are currently online
  const onlineFavouriteUsers = favouriteUsers
    .map(fav => users.find(user => user.id === fav.favourite_user_id))
    .filter((user): user is User => user !== undefined)

  return (
    <div className="w-full h-screen flex flex-col" style={{
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)'
    }}>
      <div className="flex-1 p-0 flex flex-col">
        {/* Rooms Section - Top Third */}
        <div className="flex-1 flex flex-col">
          {/* Room Header */}
          <div className="py-4 px-6 bg-white/5">
            <div className="flex items-center justify-between h-full">
              <Button
                variant={selectedUserId === null ? "default" : "ghost"}
                onClick={() => onUserSelect(null)}
                className={`flex-1 justify-start p-2 h-auto mr-2 ${
                  selectedUserId === null 
                    ? "bg-gradient-to-r from-emerald-500 to-blue-500 text-white" 
                    : "text-white hover:bg-white/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <Hash className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-bold text-lg">{displayZipcode}</span>
                  <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                    {users.length}
                  </Badge>
                </div>
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsRoomExpanded(!isRoomExpanded)}
                className="h-8 w-8 p-0 flex-shrink-0 text-white hover:bg-white/20"
              >
                {isRoomExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Room Users - Expandable */}
          {isRoomExpanded && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-3 py-2">
                <div className="text-xs font-medium text-white/60">
                  🟢 Online Now
                </div>
              </div>
              <ScrollArea className="flex-1 px-3 pb-3">
                <div className="space-y-2">
                  {otherUsers.length === 0 ? (
                    <div className="text-center text-white/60 text-sm py-4">
                      <p>No other users online</p>
                    </div>
                  ) : (
                    otherUsers.map((user) => (
                      <UserItem
                        key={user.id}
                        user={user}
                        isSelected={selectedUserId === user.id}
                        onClick={() => onUserClick(user)}
                        isFavourite={favouriteUserIds.has(user.id)}
                        onToggleFavourite={() => toggleFavourite(user)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Active Chats Section - Middle Third */}
        <div className="flex-1 flex flex-col">
          {/* Active Chats Header */}
          <div className="py-4 px-6 bg-white/5">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-blue-400" />
              <span className="font-bold text-lg text-white">Active Chats</span>
              <Badge variant="outline" className="ml-auto text-xs bg-white/10 text-white border-0">
                {activeChats.length}
              </Badge>
            </div>
          </div>

          {/* Active Chats List */}
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                {activeChats.length === 0 ? (
                  <div className="text-center text-white/60 text-sm py-4">
                    <p>No recent chats</p>
                  </div>
                ) : (
                  activeChats.map((activeChat) => {
                    const user = createUserFromActiveChat(activeChat)
                    return (
                      <ActiveChatItem
                        key={`active-${activeChat.user_id}`}
                        activeChat={activeChat}
                        user={user}
                        isSelected={selectedUserId === activeChat.user_id}
                        onClick={() => onUserClick(user)}
                        isFavourite={favouriteUserIds.has(activeChat.user_id)}
                        onToggleFavourite={() => toggleFavourite(user)}
                      />
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Favourites Section - Bottom Third */}
        <div className="flex-1 flex flex-col">
          {/* Favourites Header */}
          <div className="py-4 px-6 bg-white/5">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="font-bold text-lg text-white">Favourites</span>
              <Badge variant="outline" className="ml-auto text-xs bg-white/10 text-white border-0">
                {onlineFavouriteUsers.length}
              </Badge>
            </div>
          </div>

          {/* Favourites List */}
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                {onlineFavouriteUsers.length === 0 ? (
                  <div className="text-center text-white/60 text-sm py-4">
                    <p>No favourite users online</p>
                  </div>
                ) : (
                  onlineFavouriteUsers.map((user) => (
                    <UserItem
                      key={`fav-${user.id}`}
                      user={user}
                      isSelected={selectedUserId === user.id}
                      onClick={() => onUserClick(user)}
                      isFavourite={true}
                      onToggleFavourite={() => toggleFavourite(user)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}

interface UserItemProps {
  user: User
  isSelected: boolean
  onClick: () => void
  isFavourite?: boolean
  onToggleFavourite?: () => void
}

function UserItem({ user, isSelected, onClick, isFavourite = false, onToggleFavourite }: UserItemProps) {
  return (
    <div className="flex items-center gap-1">
      <Button 
        variant={isSelected ? "default" : "ghost"} 
        size="sm" 
        onClick={onClick} 
        className={`flex-1 justify-start rounded-xl ${
          isSelected 
            ? "bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg" 
            : "text-white hover:bg-white/20"
        }`}
      >
        <div className="flex items-center gap-3 w-full">
          <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0 animate-pulse"></div>
          <span className="text-base mr-1">👤</span>
          <span className="truncate flex-1 text-left font-medium">{user.username}</span>
          <MessageCircle className="h-3 w-3 flex-shrink-0 opacity-60" />
        </div>
      </Button>
      {onToggleFavourite && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavourite()
          }}
          className="h-8 w-8 p-0 flex-shrink-0 text-white hover:bg-white/20 rounded-xl"
        >
          {isFavourite ? (
            <Heart className="h-3 w-3 text-red-400 fill-current" />
          ) : (
            <HeartOff className="h-3 w-3 text-white/40" />
          )}
        </Button>
      )}
    </div>
  )
}

interface ActiveChatItemProps {
  activeChat: ActiveChatUser
  user: User
  isSelected: boolean
  onClick: () => void
  isFavourite?: boolean
  onToggleFavourite?: () => void
}

function ActiveChatItem({ activeChat, user, isSelected, onClick, isFavourite = false, onToggleFavourite }: ActiveChatItemProps) {
  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "now"
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return new Date(date).toLocaleDateString()
  }

  const truncateMessage = (message: string, maxLength = 25) => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + "..."
  }

  return (
    <div className="flex items-center gap-1">
      <Button 
        variant={isSelected ? "default" : "ghost"} 
        size="sm" 
        onClick={onClick} 
        className={`flex-1 justify-start p-2 h-auto rounded-xl ${
          isSelected 
            ? "bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg" 
            : "text-white hover:bg-white/20"
        }`}
      >
        <div className="flex flex-col gap-1 w-full min-w-0">
          <div className="flex items-center gap-2 w-full">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${user.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-sm mr-1">👤</span>
            <span className="truncate flex-1 text-left font-medium text-sm">{activeChat.username}</span>
            <span className="text-xs text-white/60 flex-shrink-0">{formatTime(activeChat.last_message_time)}</span>
          </div>
          <div className="text-xs text-white/60 text-left truncate w-full pl-4">
            {activeChat.is_sender ? "You: " : ""}{truncateMessage(activeChat.last_message_content)}
          </div>
        </div>
      </Button>
      {onToggleFavourite && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavourite()
          }}
          className="h-8 w-8 p-0 flex-shrink-0 text-white hover:bg-white/20 rounded-xl"
        >
          {isFavourite ? (
            <Heart className="h-3 w-3 text-red-400 fill-current" />
          ) : (
            <HeartOff className="h-3 w-3 text-white/40" />
          )}
        </Button>
      )}
    </div>
  )
}
