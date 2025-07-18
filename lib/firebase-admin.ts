// Firebase Admin SDK configuration for server-side operations
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getDatabase } from 'firebase-admin/database'
import path from 'path'
import fs from 'fs'

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
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
        throw new Error('Firebase Admin credentials not found. Please ensure firebase-admin-key.json exists or set FIREBASE_SERVICE_ACCOUNT_KEY environment variable.')
      }
    }

    initializeApp(config)
  }
}

// Initialize the admin app
initializeFirebaseAdmin()

// Export services
export const adminAuth = getAuth()
export const adminFirestore = getFirestore()
export const adminDatabase = getDatabase()

export default initializeFirebaseAdmin