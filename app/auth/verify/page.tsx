"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Loader2, CheckCircle, XCircle } from "lucide-react"
import { applyActionCode } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function EmailVerificationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const actionCode = searchParams.get('oobCode')
        const mode = searchParams.get('mode')
        const apiKey = searchParams.get('apiKey')
        
        console.log('Verification URL parameters:', { actionCode, mode, apiKey })
        
        if (!actionCode) {
          setError('Invalid verification link. Missing action code.')
          setStatus('error')
          return
        }

        // Apply the email verification
        await applyActionCode(auth, actionCode)
        
        console.log('✅ Email verified successfully')
        
        // Get the email from the URL
        const email = searchParams.get('email')
        
        if (email) {
          // Store verified email in sessionStorage for auto-signin
          sessionStorage.setItem('verified_email', email)
        }
        
        setStatus('success')
        
        // Redirect to home where auto-signin will happen
        setTimeout(() => {
          router.push('/')
        }, 2000)
        
      } catch (error: any) {
        console.error('Email verification failed:', error)
        
        let errorMessage = 'Email verification failed.'
        if (error.code === 'auth/invalid-action-code') {
          errorMessage = 'Invalid or expired verification link.'
        } else if (error.code === 'auth/expired-action-code') {
          errorMessage = 'Verification link has expired.'
        }
        
        setError(errorMessage)
        setStatus('error')
      }
    }

    verifyEmail()
  }, [searchParams, router])

  const handleRetry = () => {
    router.push('/')
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
                  <p className="text-emerald-300 text-sm mt-2">
                    Redirecting you to sign in...
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

          {status === 'error' && (
            <Button 
              onClick={handleRetry}
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