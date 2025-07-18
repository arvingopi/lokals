"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, User, MapPin, Calendar, Heart } from "lucide-react"

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: string
    username: string
    gender?: string
    age?: string
    zipcode?: string
    joinDate?: string
    isCurrentUser?: boolean
  }
}

export function UserProfileModal({ isOpen, onClose, user }: UserProfileModalProps) {
  if (!isOpen) return null

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    } catch {
      return "Unknown"
    }
  }

  const getGenderEmoji = (gender?: string) => {
    switch (gender?.toLowerCase()) {
      case "male": return "♂️"
      case "female": return "♀️"
      case "non-binary": return "⚥"
      case "prefer-not-to-say": return "🤐"
      default: return "👤"
    }
  }

  const getAgeDisplay = (age?: string) => {
    if (!age) return "Unknown"
    return `${age} years old`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <Card 
        className="relative w-full max-w-md shadow-2xl"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-white">
              {user.isCurrentUser ? "Your Profile" : "User Profile"}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-xl"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Avatar and Username */}
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <User className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{user.username}</h3>
            {user.isCurrentUser && (
              <div className="flex items-center justify-center gap-2 text-emerald-300">
                <Heart className="h-4 w-4" />
                <span className="text-sm">This is you!</span>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getGenderEmoji(user.gender)}</span>
                <div>
                  <p className="text-white font-medium">Gender</p>
                  <p className="text-white/80 text-sm capitalize">
                    {user.gender?.replace("-", " ") || "Not specified"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎂</span>
                <div>
                  <p className="text-white font-medium">Age Range</p>
                  <p className="text-white/80 text-sm">
                    {user.age || "Not specified"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Location</p>
                  <p className="text-white/80 text-sm">
                    {user.zipcode || "Not specified"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium">Joined</p>
                  <p className="text-white/80 text-sm">
                    {formatDate(user.joinDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="text-center p-3 bg-blue-500/20 rounded-xl">
            <p className="text-blue-200 text-sm">
              🔒 Profile locked to this device. No personal information collected.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}