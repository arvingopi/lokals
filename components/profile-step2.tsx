"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MapPin, Loader2, AlertCircle, Check, ArrowRight } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { isValidZipcode, normalizeZipcode, getCurrentLocation, getZipcodeFromCoordinates } from "@/lib/zipcode-utils"

interface ProfileStep2Props {
  onLocationSet: (zipcode: string) => void
  username: string
}

export function ProfileStep2({ onLocationSet, username }: ProfileStep2Props) {
  const [zipcode, setZipcode] = useState("")
  const [manualZipcode, setManualZipcode] = useState("")
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState("")
  const [detectedZipcode, setDetectedZipcode] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAutoDetect = async () => {
    setIsDetecting(true)
    setError("")
    setShowSuccess(false)

    try {
      const location = await getCurrentLocation()
      
      if (location) {
        const detectedZip = await getZipcodeFromCoordinates(location.latitude, location.longitude)
        
        if (detectedZip) {
          setDetectedZipcode(detectedZip)
          setZipcode(detectedZip)
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
        } else {
          setError("Unable to determine your zipcode from location.")
          setShowManualInput(true)
        }
      } else {
        setError("Location access failed. Please enter your zipcode manually.")
        setShowManualInput(true)
      }
    } catch (err) {
      setError("Location detection failed. Please enter your zipcode manually.")
      setShowManualInput(true)
    } finally {
      setIsDetecting(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!manualZipcode.trim()) {
      setError("Please enter your zipcode.")
      return
    }

    // Validate the original input first (before normalization)
    if (!isValidZipcode(manualZipcode)) {
      setError("Please enter a valid US zipcode (12345) or Canadian postal code (A1A 1A1).")
      return
    }

    // Then normalize for storage (extracts FSA for Canadian codes)
    const normalizedZipcode = normalizeZipcode(manualZipcode)

    setZipcode(normalizedZipcode)
    setDetectedZipcode(normalizedZipcode)
    setShowSuccess(true)
    setShowManualInput(false)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const handleContinue = async () => {
    if (!zipcode) {
      setError("Please detect your location or enter your zipcode manually.")
      return
    }

    setIsSubmitting(true)
    try {
      await onLocationSet(zipcode)
    } catch (error) {
      console.error("Failed to save location:", error)
      setError("Failed to save location. Please try again.")
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
              <MapPin className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-black text-white">Lokals</CardTitle>
              <p className="text-emerald-300 font-medium">We need your location</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                <Check className="h-4 w-4" />
              </div>
              <span className="text-emerald-300 font-medium">Profile</span>
            </div>
            <div className="w-8 h-0.5 bg-emerald-500"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <span className="text-blue-300 font-medium">Location</span>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-white/70 text-sm">
              Hello <span className="text-emerald-300 font-medium">{username}</span>! 
              <br />We need your location to connect you with people nearby.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="bg-red-500/20 border-red-500/50 text-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {showSuccess && (
            <Alert className="bg-green-500/20 border-green-500/50 text-green-200">
              <Check className="h-4 w-4" />
              <AlertDescription>✅ Location detected successfully! Zipcode: {detectedZipcode}</AlertDescription>
            </Alert>
          )}

          {/* Location Status */}
          <div className="space-y-3">
            <p className="text-white/80 text-sm font-medium">Location</p>
            {zipcode ? (
              <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-3 text-center">
                <p className="text-emerald-200 font-medium">📍 {zipcode}</p>
                <p className="text-emerald-300 text-xs mt-1">Location set successfully</p>
              </div>
            ) : (
              <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3 text-center">
                <p className="text-orange-200 font-medium">📍 Location Required</p>
                <p className="text-orange-300 text-xs mt-1">We need your location to find nearby people</p>
              </div>
            )}
          </div>

          {/* Auto-detect Section */}
          {!zipcode && !showManualInput && (
            <div className="space-y-3">
              <Button
                type="button"
                onClick={handleAutoDetect}
                disabled={isDetecting}
                className="w-full bg-blue-500/20 border-blue-500/50 text-blue-200 hover:bg-blue-500/30 h-12 font-medium border"
              >
                {isDetecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Detecting Location...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Auto-Detect Location
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  className="text-white/60 text-sm underline hover:text-white/80"
                >
                  Enter zipcode manually instead
                </button>
              </div>
            </div>
          )}

          {/* Manual Input Section */}
          {showManualInput && !zipcode && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <Input
                  value={manualZipcode}
                  onChange={(e) => setManualZipcode(e.target.value)}
                  placeholder="Enter your zipcode (e.g., 10001 or A1A 1A1)"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 h-12"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white h-12 font-medium"
                >
                  Set Location
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowManualInput(false)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Back
                </Button>
              </div>
            </form>
          )}

          {/* Continue Button */}
          {zipcode && (
            <Button 
              onClick={handleContinue}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white h-12 font-bold shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                "Starting Chat..."
              ) : (
                <>
                  Join Chat Room
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}