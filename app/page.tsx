"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ChatInterface } from "@/components/chat-interface"
import { AuthLanding } from "@/components/auth-landing"
import { SignIn } from "@/components/sign-in"
import { SignUp } from "@/components/sign-up"
import { ProfileStep1 } from "@/components/profile-step1"
import { ProfileStep2 } from "@/components/profile-step2"
import firebaseAuthClient from "@/lib/firebase-auth-client"
import { getCurrentLocation, getZipcodeFromCoordinates } from "@/lib/zipcode-utils"

type AuthState = 'loading' | 'auth_landing' | 'sign_in' | 'sign_up' | 'profile_step1' | 'profile_step2' | 'authenticated'

export default function HomePage() {
  const searchParams = useSearchParams()
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [selectedZipcode, setSelectedZipcode] = useState<string | null>(null)
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Check authentication state on mount
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        console.log('🔄 Waiting for Firebase auth state...')
        
        // Check for post-verification auto-signin first
        const postVerificationHandled = await firebaseAuthClient.checkAndHandlePostVerification()
        
        if (postVerificationHandled) {
          console.log('✅ Post-verification auto-signin completed')
          // Let the auth state change trigger the next check
          return
        }
        
        // Wait for Firebase auth state to be initialized
        const isAuthenticated = await firebaseAuthClient.waitForAuthState()
        
        if (isAuthenticated) {
          console.log('🔄 User is authenticated, loading profile...')
          
          // Get current user and profile
          const currentUser = firebaseAuthClient.getCurrentUser()
          const currentProfile = firebaseAuthClient.getCurrentProfile()
          
          if (currentUser && currentProfile) {
            console.log('👤 User profile loaded:', currentProfile)
            setUserId(currentProfile.userId)
            setSelectedUsername(currentProfile.username)
            setProfile(currentProfile)
            
            if (currentProfile.zipcode && currentProfile.gender && currentProfile.age && currentProfile.username) {
              // Complete profile - go to chat
              setSelectedZipcode(currentProfile.zipcode)
              setAuthState('authenticated')
            } else if (currentProfile.username && currentProfile.gender && currentProfile.age) {
              // Has basic profile, missing location - try auto-detect then go to step 2 if needed
              await tryAutoDetectLocation(currentProfile)
            } else {
              // Missing basic profile - go to step 1
              setAuthState('profile_step1')
            }
          } else {
            // Auth state says authenticated but no profile - go to step 1
            setAuthState('profile_step1')
          }
        } else {
          // Not authenticated - check if coming from email verification
          const verified = searchParams.get('verified')
          if (verified) {
            console.log('✅ User verified email, showing sign in')
            setAuthState('sign_in')
          } else {
            console.log('🔑 User not authenticated, showing auth landing')
            setAuthState('auth_landing')
          }
        }
      } catch (error) {
        console.error('Failed to check auth state:', error)
        setAuthState('auth_landing')
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuthState()
  }, [])

  // Listen for auth state changes (e.g., after post-verification signin)
  useEffect(() => {
    const unsubscribe = firebaseAuthClient.onAuthStateChange(async (user) => {
      if (user && authState === 'loading') {
        console.log('🔄 Auth state changed, checking user profile...')
        
        const currentProfile = firebaseAuthClient.getCurrentProfile()
        if (currentProfile) {
          setUserId(currentProfile.userId)
          setSelectedUsername(currentProfile.username)
          setProfile(currentProfile)
          
          if (currentProfile.zipcode && currentProfile.gender && currentProfile.age && currentProfile.username) {
            setSelectedZipcode(currentProfile.zipcode)
            setAuthState('authenticated')
          } else if (currentProfile.username && currentProfile.gender && currentProfile.age) {
            await tryAutoDetectLocation(currentProfile)
          } else {
            setAuthState('profile_step1')
          }
        } else {
          setAuthState('profile_step1')
        }
        
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [authState])

  // Try to auto-detect location in background
  const tryAutoDetectLocation = async (currentProfile: any) => {
    try {
      console.log('🔍 Trying automatic location detection...')
      const location = await getCurrentLocation()
      
      if (location) {
        const detectedZip = await getZipcodeFromCoordinates(location.latitude, location.longitude)
        
        if (detectedZip) {
          console.log('✅ Auto-detected location:', detectedZip)
          // Save location and go to chat
          await firebaseAuthClient.updateSessionProfile({
            zipcode: detectedZip,
            isLocked: true
          })
          
          setSelectedZipcode(detectedZip)
          setAuthState('authenticated')
          return
        }
      }
      
      console.log('❌ Auto-detection failed, showing step 2')
      setAuthState('profile_step2')
    } catch (error) {
      console.log('❌ Auto-detection error, showing step 2:', error)
      setAuthState('profile_step2')
    }
  }

  const handleAuthSuccess = (session: any, profile: any, isNew: boolean) => {
    setUserId(profile.userId)
    setSelectedUsername(profile.username)
    setProfile(profile)
    
    if (profile.zipcode && profile.gender && profile.age && profile.username) {
      // Complete profile - go to chat
      setSelectedZipcode(profile.zipcode)
      setAuthState('authenticated')
    } else {
      // New user - start with profile step 1
      setAuthState('profile_step1')
    }
  }

  const handleProfileStep1Complete = async (username: string, gender: string, age: string) => {
    try {
      // Save basic profile
      await firebaseAuthClient.updateSessionProfile({
        username,
        gender,
        age
      })
      
      setSelectedUsername(username)
      setProfile({ ...profile, username, gender, age })
      
      // Try auto-detect location
      await tryAutoDetectLocation({ username, gender, age })
    } catch (error) {
      console.error('Failed to save profile step 1:', error)
      throw error
    }
  }

  const handleLocationSet = async (zipcode: string) => {
    try {
      // Save complete profile and lock it
      await firebaseAuthClient.updateSessionProfile({
        zipcode,
        isLocked: true
      })
      
      setSelectedZipcode(zipcode)
      setAuthState('authenticated')
    } catch (error) {
      console.error('Failed to save location:', error)
      throw error
    }
  }


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)'
      }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  // Render based on authentication state
  switch (authState) {
    case 'auth_landing':
      return (
        <AuthLanding 
          onSignInClick={() => setAuthState('sign_in')}
          onSignUpClick={() => setAuthState('sign_up')}
        />
      )
    
    case 'sign_in':
      return (
        <SignIn 
          onAuthSuccess={handleAuthSuccess}
          onBackClick={() => setAuthState('auth_landing')}
          onSignUpClick={() => setAuthState('sign_up')}
        />
      )
    
    case 'sign_up':
      return (
        <SignUp 
          onBackClick={() => setAuthState('auth_landing')}
          onSignInClick={() => setAuthState('sign_in')}
        />
      )
    
    case 'profile_step1':
      return (
        <ProfileStep1 
          onContinue={handleProfileStep1Complete}
          initialUsername={selectedUsername || undefined}
        />
      )
    
    case 'profile_step2':
      return (
        <ProfileStep2 
          onLocationSet={handleLocationSet}
          username={selectedUsername || "User"}
        />
      )
    
    case 'authenticated':
      return (
        <ChatInterface
          zipcode={selectedZipcode!}
          username={selectedUsername!}
          userId={userId!}
        />
      )
    
    default:
      return <EmailInput onAuthSuccess={handleAuthSuccess} />
  }
}
