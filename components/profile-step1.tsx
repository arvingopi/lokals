"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MapPin, User, Shuffle, Check, ArrowRight, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { generateAnonymousUsername } from "@/lib/chat-utils"

interface ProfileStep1Props {
  onContinue: (username: string, gender: string, age: string) => void
  initialUsername?: string
}

export function ProfileStep1({ onContinue, initialUsername }: ProfileStep1Props) {
  const [username, setUsername] = useState(initialUsername || "")
  const [gender, setGender] = useState("")
  const [age, setAge] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleGenerateUsername = () => {
    const generated = generateAnonymousUsername()
    setUsername(generated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate username
    if (!username.trim()) {
      setError("Please enter a username or generate one.")
      return
    }

    if (username.length < 3 || username.length > 20) {
      setError("Username must be between 3 and 20 characters.")
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores.")
      return
    }

    if (!gender) {
      setError("Please select your gender.")
      return
    }

    if (!age) {
      setError("Please select your age range.")
      return
    }

    setIsSubmitting(true)
    try {
      await onContinue(username.trim(), gender, age)
    } catch (error) {
      console.error("Failed to save profile:", error)
      setError("Failed to save profile. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)'
    }}>
      <Card className="w-full max-w-lg shadow-2xl" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-black text-white">Lokals</CardTitle>
              <p className="text-emerald-300 font-medium">Tell us about yourself</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <span className="text-emerald-300 font-medium">Profile</span>
            </div>
            <div className="w-8 h-0.5 bg-white/20"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 text-white/60 rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <span className="text-white/60 font-medium">Location</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="bg-red-500/20 border-red-500/50 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Section */}
            <div className="space-y-3">
              <p className="text-white/80 text-sm font-medium">Username</p>
              <div className="flex gap-2">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your username"
                  disabled={isSubmitting}
                  maxLength={20}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateUsername}
                  disabled={isSubmitting}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Gender Selection */}
            <div className="space-y-3">
              <p className="text-white/80 text-sm font-medium">Gender</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'male', label: '♂️ Male' },
                  { value: 'female', label: '♀️ Female' },
                  { value: 'non-binary', label: '⚥ Non-binary' },
                  { value: 'prefer-not-to-say', label: '🤐 Private' }
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={gender === option.value ? "default" : "outline"}
                    onClick={() => setGender(option.value)}
                    disabled={isSubmitting}
                    className={`h-12 text-sm font-medium transition-all ${
                      gender === option.value 
                        ? "bg-emerald-500 text-white shadow-lg scale-105" 
                        : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20 hover:scale-105"
                    }`}
                  >
                    {gender === option.value && <Check className="h-4 w-4 mr-2" />}
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Age Selection */}
            <div className="space-y-3">
              <p className="text-white/80 text-sm font-medium">Age</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: '18-24', label: '18-24' },
                  { value: '25-34', label: '25-34' },
                  { value: '35-44', label: '35-44' },
                  { value: '45-54', label: '45-54' },
                  { value: '55-64', label: '55-64' },
                  { value: '65+', label: '65+' }
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={age === option.value ? "default" : "outline"}
                    onClick={() => setAge(option.value)}
                    disabled={isSubmitting}
                    className={`h-12 text-sm font-medium transition-all ${
                      age === option.value 
                        ? "bg-blue-500 text-white shadow-lg scale-105" 
                        : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20 hover:scale-105"
                    }`}
                  >
                    {age === option.value && <Check className="h-4 w-4 mr-2" />}
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting || !username || !gender || !age} 
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white h-12 font-bold shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                "Saving..."
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}