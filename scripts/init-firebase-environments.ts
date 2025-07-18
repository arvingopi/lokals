#!/usr/bin/env npx tsx

import { initializeApp, getApps, deleteApp } from 'firebase/app'
import { getFirestore, doc, setDoc, collection } from 'firebase/firestore'
import { getDatabase, ref, set } from 'firebase/database'
import { config } from 'dotenv'
import { resolve } from 'path'

// Firebase configurations for each environment
const firebaseConfigs = {
  development: {
    apiKey: "your_dev_api_key_here",
    authDomain: "lokals-chat-dev.firebaseapp.com",
    databaseURL: "https://lokals-chat-dev-default-rtdb.firebaseio.com",
    projectId: "lokals-chat-dev",
    storageBucket: "lokals-chat-dev.appspot.com",
    messagingSenderId: "your_dev_sender_id_here",
    appId: "your_dev_app_id_here"
  },
  staging: {
    apiKey: "your_staging_api_key_here", 
    authDomain: "lokals-chat-staging.firebaseapp.com",
    databaseURL: "https://lokals-chat-staging-default-rtdb.firebaseio.com",
    projectId: "lokals-chat-staging",
    storageBucket: "lokals-chat-staging.appspot.com",
    messagingSenderId: "your_staging_sender_id_here",
    appId: "your_staging_app_id_here"
  }
}

async function initializeFirebaseEnvironment(env: 'development' | 'staging') {
  console.log(`\n🚀 Initializing Firebase ${env} environment...`)
  
  // Clean up any existing apps
  getApps().forEach(app => deleteApp(app))
  
  // Initialize Firebase app for this environment
  const app = initializeApp(firebaseConfigs[env], `lokals-${env}`)
  const firestore = getFirestore(app)
  const database = getDatabase(app)

  try {
    // Initialize Firestore Collections
    console.log(`📦 Setting up Firestore collections for ${env}...`)
    
    // Create initial documents for each collection to ensure they exist
    
    // 1. user_sessions collection
    await setDoc(doc(firestore, 'user_sessions', '_placeholder'), {
      createdAt: new Date(),
      note: 'Placeholder document to initialize collection - will be removed when real users sign up'
    })
    
    // 2. user_favorites collection  
    await setDoc(doc(firestore, 'user_favorites', '_placeholder'), {
      createdAt: new Date(),
      note: 'Placeholder document to initialize collection - will be removed when users add favorites'
    })
    
    // 3. users collection
    await setDoc(doc(firestore, 'users', '_placeholder'), {
      createdAt: new Date(),
      note: 'Placeholder document to initialize collection - will be removed when real users join'
    })

    console.log(`✅ Firestore collections created for ${env}`)

    // Initialize Realtime Database Structure
    console.log(`🔥 Setting up Realtime Database structure for ${env}...`)
    
    // Create base structure for Realtime Database
    const rtdbStructure = {
      // Public room messages organized by zipcode
      messages: {
        '_structure_info': {
          note: 'Public room messages organized by zipcode',
          example: 'messages/90210/messageId',
          createdAt: new Date().toISOString()
        }
      },
      
      // Private messages between users
      private_messages: {
        '_structure_info': {
          note: 'Private messages between users, organized by conversation ID',
          example: 'private_messages/user1_user2/messageId',
          createdAt: new Date().toISOString()
        }
      },
      
      // Active chats for each user
      active_chats: {
        '_structure_info': {
          note: 'Active chat conversations for each user',
          example: 'active_chats/userId/chatWithUserId',
          createdAt: new Date().toISOString()
        }
      },
      
      // User presence tracking
      user_presence: {
        '_structure_info': {
          note: 'Real-time user presence and online status',
          example: 'user_presence/userId',
          createdAt: new Date().toISOString()
        }
      },
      
      // Active users in each room
      active_users: {
        '_structure_info': {
          note: 'Currently active users in each zipcode room',
          example: 'active_users/90210/userId',
          createdAt: new Date().toISOString()
        }
      }
    }

    // Set the structure in Realtime Database
    await set(ref(database, '/'), rtdbStructure)
    
    console.log(`✅ Realtime Database structure created for ${env}`)
    console.log(`🎉 Firebase ${env} environment initialized successfully!`)
    
    return true
    
  } catch (error) {
    console.error(`❌ Error initializing Firebase ${env} environment:`, error)
    throw error
  } finally {
    // Clean up the app
    await deleteApp(app)
  }
}

async function main() {
  const envArg = process.argv[2]
  
  if (!envArg || !['development', 'staging', 'both'].includes(envArg)) {
    console.log(`
Usage: npx tsx scripts/init-firebase-environments.ts <environment>

Arguments:
  development  - Initialize development environment only
  staging      - Initialize staging environment only  
  both         - Initialize both development and staging environments

Examples:
  npx tsx scripts/init-firebase-environments.ts development
  npx tsx scripts/init-firebase-environments.ts staging
  npx tsx scripts/init-firebase-environments.ts both
`)
    process.exit(1)
  }

  try {
    if (envArg === 'both') {
      await initializeFirebaseEnvironment('development')
      await initializeFirebaseEnvironment('staging')
    } else {
      await initializeFirebaseEnvironment(envArg as 'development' | 'staging')
    }
    
    console.log(`\n✅ All requested Firebase environments initialized successfully!`)
    console.log(`\n📝 Next steps:`)
    console.log(`1. Replace placeholder API keys in firebaseConfigs with real values`)
    console.log(`2. Deploy security rules: firebase deploy --only firestore:rules,database:rules`)
    console.log(`3. Test the setup by running the application`)
    
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Failed to initialize Firebase environments:', error)
    process.exit(1)
  }
}

main()