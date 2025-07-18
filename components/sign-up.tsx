"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MapPin, Mail, Loader2, AlertCircle, ArrowLeft, UserPlus, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import firebaseAuthClient from "@/lib/firebase-auth-client"

interface SignUpProps {
  onBackClick: () => void
  onSignInClick: () => void
}

export function SignUp({ onBackClick, onSignInClick }: SignUpProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [emailSent, setEmailSent] = useState(false)

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

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsLoading(true)

    try {
      await firebaseAuthClient.signUpWithEmailVerification(email.toLowerCase().trim(), password)
      setEmailSent(true)
    } catch (error: any) {
      console.error("Sign up failed:", error)
      
      let errorMessage = "Sign up failed. Please try again."
      if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address."
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password must be at least 6 characters long."
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = "An account with this email already exists. Please sign in instead."
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
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
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-xl font-black text-white">Lokals</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Check Your Email</h2>
                <p className="text-white/70 text-sm">
                  We've sent a verification link to:
                  <span className="block mt-1 font-medium text-emerald-300">{email}</span>
                </p>
                <p className="text-white/60 text-xs mt-3">
                  Click the link in the email to verify your account and complete setup.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={onSignInClick}
                className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white h-12 font-bold shadow-lg"
              >
                Go to Sign In
              </Button>

              <Button 
                onClick={onBackClick}
                variant="outline"
                className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 h-12"
              >
                Back
              </Button>
            </div>

            <div className="text-center">
              <p className="text-white/60 text-xs">
                Didn't receive the email? Check your spam folder or try again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Create Account</h2>
              <p className="text-white/70 text-sm">
                Join Lokals to start chatting with people in your area.
                <span className="block mt-1 text-emerald-300 font-medium">
                  🔒 Your email stays private
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
                placeholder="Create a password (min 6 characters)"
                disabled={isLoading}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 h-12"
                autoComplete="new-password"
              />
            </div>

            <div>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={isLoading}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 h-12"
                autoComplete="new-password"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || !email || !password || !confirmPassword}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-12 font-bold shadow-lg disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-white/60 text-sm">
              Already have an account?{" "}
              <button 
                onClick={onSignInClick}
                className="text-emerald-300 hover:text-emerald-200 font-medium underline"
              >
                Sign in here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}