"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, LogIn, UserPlus } from "lucide-react"

interface AuthLandingProps {
  onSignInClick: () => void
  onSignUpClick: () => void
}

export function AuthLanding({ onSignInClick, onSignUpClick }: AuthLandingProps) {
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
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-white">Welcome to Lokals</h2>
            <p className="text-white/70 text-sm">
              Connect with people in your area through anonymous chat rooms organized by location.
              <span className="block mt-2 text-emerald-300 font-medium">
                🔒 Your email stays private • No personal info shared
              </span>
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={onSignInClick}
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white h-12 font-bold shadow-lg"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>

            <Button 
              onClick={onSignUpClick}
              variant="outline"
              className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 h-12 font-bold"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create Account
            </Button>
          </div>

          <div className="text-center">
            <p className="text-white/60 text-xs">
              By continuing, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}