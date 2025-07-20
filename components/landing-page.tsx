"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, MessageSquare, Shield, Users, ArrowRight } from "lucide-react"

interface LandingPageProps {
  onGetStarted: () => void
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)'
    }}>
      <div className="w-full max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          {/* Logo */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-3xl flex items-center justify-center shadow-2xl">
              <MapPin className="h-10 w-10 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-5xl font-black text-white tracking-tight">Lokals</h1>
              <p className="text-emerald-300 font-medium text-lg">Connect with your community</p>
            </div>
          </div>

          {/* Main Tagline */}
          <div className="space-y-4 mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Anonymous chat with people <br />
              <span className="text-emerald-300">in your neighborhood</span>
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Join location-based chat rooms and connect with locals anonymously. 
              No personal info required, just genuine conversations.
            </p>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={onGetStarted}
            size="lg"
            className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white h-14 px-8 font-bold shadow-xl text-lg"
          >
            Get Started
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="text-center p-6 shadow-xl" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <CardContent className="space-y-4 p-0">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Local Chat Rooms</h3>
              <p className="text-white/70 text-sm">
                Join conversations with people in your zip code area
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 shadow-xl" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <CardContent className="space-y-4 p-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Anonymous & Safe</h3>
              <p className="text-white/70 text-sm">
                Your email stays private. No personal information shared
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 shadow-xl" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <CardContent className="space-y-4 p-0">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Real Connections</h3>
              <p className="text-white/70 text-sm">
                Meet genuine people and build community relationships
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-white/50 text-sm">
            Simple, private, local conversations
          </p>
        </div>
      </div>
    </div>
  )
}