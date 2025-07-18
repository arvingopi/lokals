"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Loader2, CheckCircle, XCircle } from "lucide-react"
import { signInWithMagicLink } from "@/lib/firebase-auth-client"

export default function AuthVerifyPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const verifyMagicLink = async () => {
      try {
        const result = await signInWithMagicLink()
        
        if (result.isNew) {
          // New user - redirect to profile setup
          setStatus('success')
          setTimeout(() => {
            router.push('/?setup=true')
          }, 2000)
        } else {
          // Existing user - redirect to app
          setStatus('success')
          setTimeout(() => {
            router.push('/')
          }, 2000)
        }
      } catch (error) {
        console.error('Magic link verification failed:', error)
        setStatus('error')
        if (error instanceof Error) {
          setError(error.message)
        } else {
          setError('Authentication failed. Please try again.')
        }
      }
    }

    verifyMagicLink()
  }, [router])

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
            {status === 'verifying' && (
              <>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Verifying...</h2>
                  <p className="text-white/70 text-sm">
                    Please wait while we verify your magic link.
                  </p>
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">Success!</h2>
                  <p className="text-white/70 text-sm">
                    You've been signed in successfully. Redirecting...
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
                  <h2 className="text-xl font-bold text-white mb-2">Authentication Failed</h2>
                  <p className="text-white/70 text-sm mb-4">
                    {error || 'Something went wrong with your magic link.'}
                  </p>
                  <button
                    onClick={handleRetry}
                    className="text-emerald-300 hover:text-emerald-200 underline text-sm"
                  >
                    Try signing in again
                  </button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}