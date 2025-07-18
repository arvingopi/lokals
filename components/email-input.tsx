"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MapPin, Mail, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { signInWithEmail } from "@/lib/firebase-auth-client"

interface EmailInputProps {
  onAuthSuccess: (session: any, profile: any, isNew: boolean) => void
}

export function EmailInput({ onAuthSuccess }: EmailInputProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.trim()) {
      setError("Please enter your email address.")
      return
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.")
      return
    }

    if (!password.trim()) {
      setError("Please enter a password.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    setIsLoading(true)

    try {
      const result = await signInWithEmail(email.toLowerCase().trim(), password)
      onAuthSuccess(result.session, result.profile, result.isNew)
    } catch (error: any) {
      console.error("Authentication failed:", error)
      
      let errorMessage = "Authentication failed. Please try again."
      if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address."
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password must be at least 6 characters long."
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = "An account with this email already exists. Please sign in."
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Incorrect password. Please try again."
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)'
    }}>
      <Card className="w-full max-w-md shadow-2xl" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
              <MapPin className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-black text-white">Lokals</CardTitle>
              <p className="text-emerald-300 font-medium">Chat anonymously</p>
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

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Sign in with Email</h2>
              <p className="text-white/70 text-sm">
                Enter your email and password to sign in or create a new account.
                <span className="block mt-1 text-emerald-300 font-medium">
                  🔒 Your email is never shared with other users
                </span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                disabled={isLoading}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 h-12"
                autoComplete="email"
                autoFocus
              />
            </div>
            
            <div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password (min 6 characters)"
                disabled={isLoading}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 h-12"
                autoComplete="current-password"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || !email || !password}
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white h-12 font-bold shadow-lg disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Sign In / Sign Up
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-white/60 text-xs">
              By continuing, you agree to our terms and that your email will remain private.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}