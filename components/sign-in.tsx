"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MapPin, Mail, Loader2, AlertCircle, ArrowLeft, LogIn } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import firebaseAuthClient from "@/lib/firebase-auth-client"

interface SignInProps {
  onAuthSuccess: (session: any, profile: any, isNew: boolean) => void
  onBackClick: () => void
  onSignUpClick: () => void
}

export function SignIn({ onAuthSuccess, onBackClick, onSignUpClick }: SignInProps) {
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

    setIsLoading(true)

    try {
      const result = await firebaseAuthClient.signInWithEmail(email.toLowerCase().trim(), password)
      onAuthSuccess(result.session, result.profile, result.isNew)
    } catch (error: any) {
      console.error("Sign in failed:", error)
      
      let errorMessage = "Sign in failed. Please try again."
      if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address."
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email. Please sign up first."
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Incorrect password. Please try again."
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later."
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
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onBackClick}
              className="text-white hover:bg-white/20 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-xl font-black text-white">Lokals</CardTitle>
            </div>
            <div className="w-8" /> {/* Spacer for centering */}
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
              <LogIn className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-white/70 text-sm">
                Sign in to your account to continue chatting.
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
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                autoFocus
              />
            </div>
            
            <div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 h-12"
                autoComplete="new-password"
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
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-white/60 text-sm">
              Don't have an account?{" "}
              <button 
                onClick={onSignUpClick}
                className="text-emerald-300 hover:text-emerald-200 font-medium underline"
              >
                Create one here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}