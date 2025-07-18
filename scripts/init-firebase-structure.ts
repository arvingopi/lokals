#!/usr/bin/env npx tsx

/**
 * Initialize Firebase database structure for dev and staging environments
 * This script creates the necessary collections and database paths
 */

import { initializeApp, cert, getApps, deleteApp, ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getDatabase } from 'firebase-admin/database'

// Project configurations
const projects = {
  development: {
    projectId: 'lokals-chat-dev',
    databaseURL: 'https://lokals-chat-dev-default-rtdb.firebaseio.com'
  },
  staging: {
    projectId: 'lokals-chat-staging', 
    databaseURL: 'https://lokals-chat-staging-default-rtdb.firebaseio.com'
  }
}

async function initializeFirebaseStructure(env: 'development' | 'staging') {
  console.log(`\n🚀 Initializing Firebase structure for ${env}...`)
  
  try {
    // Clean up any existing apps
    getApps().forEach(app => deleteApp(app))
    
    // Initialize Firebase Admin for this environment
    const app = initializeApp({
      projectId: projects[env].projectId,
      databaseURL: projects[env].databaseURL
    }, `lokals-${env}`)
    
    const firestore = getFirestore(app)
    const database = getDatabase(app)

    // Initialize Firestore Collections
    console.log(`📦 Setting up Firestore collections for ${env}...`)
    
    // Create placeholder documents to initialize collections
    const batch = firestore.batch()
    
    // user_sessions collection
    const userSessionsRef = firestore.collection('user_sessions').doc('_init')
    batch.set(userSessionsRef, {
      _placeholder: true,
      createdAt: new Date(),
      note: 'Collection initialized - this document will be removed when real users sign up'
    })
    
    // user_favorites collection
    const userFavoritesRef = firestore.collection('user_favorites').doc('_init') 
    batch.set(userFavoritesRef, {
      _placeholder: true,
      createdAt: new Date(),
      note: 'Collection initialized - this document will be removed when users add favorites'
    })
    
    // users collection
    const usersRef = firestore.collection('users').doc('_init')
    batch.set(usersRef, {
      _placeholder: true,
      createdAt: new Date(),
      note: 'Collection initialized - this document will be removed when real users join'
    })
    
    await batch.commit()
    console.log(`✅ Firestore collections created for ${env}`)

    // Initialize Realtime Database Structure
    console.log(`🔥 Setting up Realtime Database structure for ${env}...`)
    
    const rtdbStructure = {
      // Database structure documentation
      _database_info: {
        initialized: new Date().toISOString(),
        environment: env,
        note: 'Database structure for Lokals chat application'
      },
      
      // Public room messages (organized by zipcode)
      messages: {
        _info: {
          purpose: 'Public room messages organized by zipcode',
          structure: 'messages/{zipcode}/{messageId}',
          example: 'messages/90210/msg_12345'
        }
      },
      
      // Private messages between users
      private_messages: {
        _info: {
          purpose: 'Private messages between users',
          structure: 'private_messages/{conversationId}/{messageId}',
          example: 'private_messages/user1_user2/msg_12345'
        }
      },
      
      // Active chats for each user
      active_chats: {
        _info: {
          purpose: 'Active chat conversations for each user',
          structure: 'active_chats/{userId}/{otherUserId}',
          example: 'active_chats/user123/user456'
        }
      },
      
      // Real-time user presence
      user_presence: {
        _info: {
          purpose: 'Real-time user presence and online status',
          structure: 'user_presence/{userId}',
          example: 'user_presence/user123'
        }
      },
      
      // Active users in each room  
      active_users: {
        _info: {
          purpose: 'Currently active users in each zipcode room',
          structure: 'active_users/{zipcode}/{userId}',
          example: 'active_users/90210/user123'
        }
      }
    }

    await database.ref('/').set(rtdbStructure)
    console.log(`✅ Realtime Database structure created for ${env}`)
    
    // Clean up
    await deleteApp(app)
    
    console.log(`🎉 Firebase ${env} structure initialized successfully!`)
    return true
    
  } catch (error: any) {
    console.error(`❌ Error initializing Firebase ${env} structure:`, error)
    
    // More specific error handling
    if (error?.code === 'app/insufficient-permissions') {
      console.error(`\n💡 Solution: Make sure you have admin permissions for ${projects[env].projectId}`)
      console.error(`   Run: firebase login (and use an account with admin access)`)
    } else if (error?.code === 'app/invalid-credential') {
      console.error(`\n💡 Solution: Check your Firebase credentials`)
      console.error(`   Make sure you're logged in: firebase login`)
    }
    
    throw error
  }
}

async function main() {
  const envArg = process.argv[2]
  
  if (!envArg || !['development', 'staging', 'both'].includes(envArg)) {
    console.log(`
Usage: npx tsx scripts/init-firebase-structure.ts <environment>

Arguments:
  development  - Initialize development environment database structure
  staging      - Initialize staging environment database structure
  both         - Initialize both development and staging environments

Examples:
  npx tsx scripts/init-firebase-structure.ts development
  npx tsx scripts/init-firebase-structure.ts staging  
  npx tsx scripts/init-firebase-structure.ts both

Note: Make sure you're logged into Firebase CLI with admin permissions:
  firebase login
`)
    process.exit(1)
  }

  try {
    console.log('🔥 Firebase Structure Initialization Tool')
    console.log('==========================================')
    
    if (envArg === 'both') {
      await initializeFirebaseStructure('development')
      await initializeFirebaseStructure('staging')
    } else {
      await initializeFirebaseStructure(envArg as 'development' | 'staging')
    }
    
    console.log(`\n✅ Firebase structure initialization complete!`)
    console.log(`\n📝 Next steps:`)
    console.log(`1. Verify structure in Firebase Console`)
    console.log(`2. Deploy security rules if needed`)
    console.log(`3. Test the application with the new environments`)
    
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Failed to initialize Firebase structure:', error)
    process.exit(1)
  }
}

main()