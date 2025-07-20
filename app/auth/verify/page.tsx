"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Loader2, CheckCircle, XCircle } from "lucide-react"
import { applyActionCode } from "firebase/auth"
import { auth } from "@/lib/firebase"

function EmailVerificationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Check for Firebase's standard verification URL parameters
        const actionCode = searchParams.get('oobCode') || searchParams.get('actionCode')
        const mode = searchParams.get('mode')
        const apiKey = searchParams.get('apiKey')
        const continueUrl = searchParams.get('continueUrl')
        
        console.log('Verification URL parameters:', { actionCode, mode, apiKey, continueUrl })
        
        // If no action code, check if this is a continue URL from Firebase
        if (!actionCode) {
          // Check if this is coming from a Firebase action URL redirect
          const urlParams = new URLSearchParams(window.location.search)
          const allParams = Object.fromEntries(urlParams.entries())
          console.log('All URL parameters:', allParams)
          
          // If we only have email parameter, this might be a misconfigured verification link
          const email = searchParams.get('email')
          if (email && Object.keys(allParams).length === 1) {
            setError('Invalid verification link. This may be due to Firebase configuration. Please check your Firebase Console Action URLs settings.')
            setStatus('error')
            return
          }
          
          setError('Invalid verification link. Missing action code.')
          setStatus('error')
          return
        }

        // Apply the email verification
        await applyActionCode(auth, actionCode)
        
        console.log('✅ Email verified successfully')
        setStatus('success')
        
      } catch (error) {
        console.error('Email verification failed:', error)
        
        let errorMessage = 'Email verification failed.'
        if (error instanceof Error && 'code' in error) {
          const firebaseError = error as { code: string; message: string }
          if (firebaseError.code === 'auth/invalid-action-code') {
            errorMessage = 'Invalid or expired verification link.'
          } else if (firebaseError.code === 'auth/expired-action-code') {
            errorMessage = 'Verification link has expired.'
          }
        }
        
        setError(errorMessage)
        setStatus('error')
      }
    }

    verifyEmail()
  }, [searchParams, router])

  const handleContinue = () => {
    // Redirect to home with verified flag to show sign-in
    router.push('/?verified=true')
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
          <div className="text-center space-y-4">
            {status === 'loading' && (
              <>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Verifying Email</h2>
                  <p className="text-white/70 text-sm">
                    Please wait while we verify your email address...
                  </p>
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Email Verified!</h2>
                  <p className="text-white/70 text-sm">
                    Your email has been successfully verified. You can now sign in to complete your profile setup.
                  </p>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
                  <p className="text-white/70 text-sm">
                    {error}
                  </p>
                  <p className="text-white/60 text-xs mt-3">
                    You may need to request a new verification email.
                  </p>
                </div>
              </>
            )}
          </div>

          {status === 'success' && (
            <Button 
              onClick={handleContinue}
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white h-12 font-bold shadow-lg"
            >
              Continue to Sign In
            </Button>
          )}

          {status === 'error' && (
            <Button 
              onClick={handleContinue}
              className="w-full bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white h-12 font-bold shadow-lg"
            >
              Back to Sign Up
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function EmailVerificationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)'
      }}>
        <Card className="w-full max-w-md shadow-2xl" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Loading...</h2>
            <p className="text-white/70 text-sm">
              Please wait while we load the verification page...
            </p>
          </CardContent>
        </Card>
      </div>
    }>
      <EmailVerificationContent />
    </Suspense>
  )
}