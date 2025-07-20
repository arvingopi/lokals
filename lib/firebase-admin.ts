// Firebase Admin SDK configuration for server-side operations
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getDatabase } from 'firebase-admin/database'
import path from 'path'
import fs from 'fs'

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  // Skip initialization during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Skipping Firebase Admin initialization during build')
    return
  }

  if (getApps().length === 0) {
    const config: any = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    }

    // Try to get credentials in order of preference
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Production: Use environment variable with service account JSON
      try {
        config.credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
        console.log('Firebase Admin: Using service account from environment variable')
      } catch (error) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error)
        throw error
      }
    } else {
      // Local development: Use service account file
      const serviceAccountPath = path.join(process.cwd(), 'firebase-admin-key.json')
      
      if (fs.existsSync(serviceAccountPath)) {
        try {
          config.credential = cert(serviceAccountPath)
          console.log('Firebase Admin: Using service account from local file')
        } catch (error) {
          console.error('Failed to load service account from file:', error)
          throw error
        }
      } else {
        console.warn('Firebase Admin credentials not found - skipping initialization')
        return
      }
    }

    initializeApp(config)
  }
}

// Try to initialize (will be skipped during build)
initializeFirebaseAdmin()

// Export services with runtime checks
export const adminAuth = getApps().length > 0 ? getAuth() : null as any
export const adminFirestore = getApps().length > 0 ? getFirestore() : null as any  
export const adminDatabase = getApps().length > 0 ? getDatabase() : null as any

export default initializeFirebaseAdmin