// Firebase Admin SDK configuration for server-side operations
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getDatabase } from 'firebase-admin/database'

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    // For development, we'll use a simple approach with just the project config
    // The Admin SDK will use the same project as the client SDK
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      // For local development, we can use the service account key from environment
      // For production, use Application Default Credentials
      ...(process.env.FIREBASE_SERVICE_ACCOUNT_KEY && {
        credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
      })
    })
  }
}

// Initialize the admin app
initializeFirebaseAdmin()

// Export services
export const adminAuth = getAuth()
export const adminFirestore = getFirestore()
export const adminDatabase = getDatabase()

export default initializeFirebaseAdmin