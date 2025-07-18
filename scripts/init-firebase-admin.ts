#!/usr/bin/env npx tsx

/**
 * Initialize Firebase database structure for dev and staging environments
 * Uses Firebase Admin SDK with service account keys for authentication
 */

import { initializeApp, cert, getApps, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getDatabase } from 'firebase-admin/database'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Environment configurations
const environments = {
  development: {
    projectId: 'lokals-chat-dev',
    databaseURL: 'https://lokals-chat-dev-default-rtdb.firebaseio.com',
    serviceAccountPath: 'firebase-dev-key.json'
  },
  staging: {
    projectId: 'lokals-chat-staging', 
    databaseURL: 'https://lokals-chat-staging-default-rtdb.firebaseio.com',
    serviceAccountPath: 'firebase-staging-key.json'
  }
}

async function initializeFirebaseDatabase(env: 'development' | 'staging') {
  console.log(`\n🚀 Initializing Firebase database for ${env}...`)
  
  try {
    // Clean up any existing apps
    getApps().forEach(app => deleteApp(app))
    
    // Read service account key
    const serviceAccountPath = resolve(process.cwd(), environments[env].serviceAccountPath)
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
    
    // Initialize Firebase Admin
    const app = initializeApp({
      credential: cert(serviceAccount),
      databaseURL: environments[env].databaseURL
    }, `lokals-${env}`)
    
    const firestore = getFirestore(app)
    const database = getDatabase(app)

    console.log(`📦 Setting up Firestore collections for ${env}...`)
    
    // Initialize Firestore Collections with batch operation
    const batch = firestore.batch()
    
    // 1. user_sessions collection
    const userSessionsRef = firestore.collection('user_sessions').doc('_placeholder')
    batch.set(userSessionsRef, {
      _placeholder: true,
      createdAt: new Date(),
      note: 'Placeholder document to initialize collection - will be removed when real users sign up',
      environment: env,
      initialized: new Date().toISOString()
    })
    
    // 2. user_favorites collection
    const userFavoritesRef = firestore.collection('user_favorites').doc('_placeholder') 
    batch.set(userFavoritesRef, {
      _placeholder: true,
      createdAt: new Date(),
      note: 'Placeholder document to initialize collection - will be removed when users add favorites',
      environment: env,
      initialized: new Date().toISOString()
    })
    
    // 3. users collection (for compatibility)
    const usersRef = firestore.collection('users').doc('_placeholder')
    batch.set(usersRef, {
      _placeholder: true,
      createdAt: new Date(),
      note: 'Placeholder document to initialize collection - will be removed when real users join',
      environment: env,
      initialized: new Date().toISOString()
    })
    
    // Commit Firestore batch
    await batch.commit()
    console.log(`✅ Firestore collections initialized for ${env}`)

    console.log(`🔥 Setting up Realtime Database structure for ${env}...`)
    
    // Initialize Realtime Database Structure
    const rtdbStructure = {
      // Database metadata
      _database_info: {
        environment: env,
        initialized: new Date().toISOString(),
        version: '1.0.0',
        note: 'Lokals Chat Application Database'
      },
      
      // Public room messages (organized by zipcode)
      messages: {
        _structure: {
          purpose: 'Public room messages organized by zipcode',
          path_pattern: 'messages/{zipcode}/{messageId}',
          example: 'messages/90210/msg_abc123',
          fields: {
            content: 'string - message text',
            timestamp: 'number - unix timestamp',
            user_id: 'string - user identifier',
            username: 'string - display name',
            zipcode: 'string - room location'
          }
        }
      },
      
      // Private messages between users
      private_messages: {
        _structure: {
          purpose: 'Private messages between users',
          path_pattern: 'private_messages/{conversationId}/{messageId}',
          example: 'private_messages/user1_user2/msg_abc123',
          note: 'conversationId is created by sorting user IDs alphabetically',
          fields: {
            content: 'string - message text',
            timestamp: 'number - unix timestamp',
            sender_id: 'string - message sender',
            sender_username: 'string - sender display name',
            recipient_id: 'string - message recipient'
          }
        }
      },
      
      // Active chats for each user
      active_chats: {
        _structure: {
          purpose: 'Active chat conversations for each user',
          path_pattern: 'active_chats/{userId}/{otherUserId}',
          example: 'active_chats/user123/user456',
          fields: {
            last_message: 'string - preview of last message',
            last_message_time: 'number - unix timestamp',
            unread_count: 'number - unread message count',
            other_username: 'string - other user display name'
          }
        }
      },
      
      // Real-time user presence
      user_presence: {
        _structure: {
          purpose: 'Real-time user presence and online status',
          path_pattern: 'user_presence/{userId}',
          example: 'user_presence/user123',
          fields: {
            online: 'boolean - user online status',
            last_seen: 'number - unix timestamp of last activity',
            current_room: 'string - current zipcode room',
            username: 'string - user display name'
          }
        }
      },
      
      // Active users in each room  
      active_users: {
        _structure: {
          purpose: 'Currently active users in each zipcode room',
          path_pattern: 'active_users/{zipcode}/{userId}',
          example: 'active_users/90210/user123',
          fields: {
            username: 'string - user display name',
            joined_at: 'number - unix timestamp when joined room',
            last_active: 'number - unix timestamp of last activity'
          }
        }
      }
    }

    // Set the structure in Realtime Database
    await database.ref('/').set(rtdbStructure)
    console.log(`✅ Realtime Database structure initialized for ${env}`)
    
    // Clean up
    await deleteApp(app)
    
    console.log(`🎉 Firebase ${env} database initialization complete!`)
    
    // Show what was created
    console.log(`\n📋 Summary for ${env}:`)
    console.log(`   Firestore Collections: user_sessions, user_favorites, users`)
    console.log(`   Realtime Database: messages, private_messages, active_chats, user_presence, active_users`)
    console.log(`   Console: https://console.firebase.google.com/project/${environments[env].projectId}`)
    
    return true
    
  } catch (error: any) {
    console.error(`❌ Error initializing Firebase ${env} database:`, error.message)
    
    // Specific error handling
    if (error.code === 'auth/invalid-key-type') {
      console.error(`\n💡 Fix: Check the service account key file format`)
    } else if (error.message?.includes('ENOENT')) {
      console.error(`\n💡 Fix: Service account key file not found at ${environments[env].serviceAccountPath}`)
      console.error(`   Make sure the file exists in the project root`)
    } else if (error.code === 'auth/insufficient-permissions') {
      console.error(`\n💡 Fix: Service account needs Admin permissions for ${environments[env].projectId}`)
    }
    
    throw error
  }
}

async function main() {
  const envArg = process.argv[2]
  
  if (!envArg || !['development', 'staging', 'both'].includes(envArg)) {
    console.log(`
🔥 Firebase Database Initialization Tool

Usage: npx tsx scripts/init-firebase-admin.ts <environment>

Arguments:
  development  - Initialize development environment (lokals-chat-dev)
  staging      - Initialize staging environment (lokals-chat-staging)
  both         - Initialize both development and staging environments

Examples:
  npx tsx scripts/init-firebase-admin.ts development
  npx tsx scripts/init-firebase-admin.ts staging  
  npx tsx scripts/init-firebase-admin.ts both

Prerequisites:
  ✅ Service account keys in project root:
     - firebase-dev-key.json (for development)
     - firebase-staging-key.json (for staging)
  ✅ Firebase projects created with Firestore and Realtime Database enabled
`)
    process.exit(1)
  }

  try {
    console.log('🔥 Firebase Database Initialization')
    console.log('==================================')
    
    if (envArg === 'both') {
      await initializeFirebaseDatabase('development')
      await initializeFirebaseDatabase('staging')
    } else {
      await initializeFirebaseDatabase(envArg as 'development' | 'staging')
    }
    
    console.log(`\n✅ Database initialization complete!`)
    console.log(`\n📝 Next Steps:`)
    console.log(`1. Verify structure in Firebase Console`)
    console.log(`2. Test application with initialized databases`)
    console.log(`3. Deploy security rules if needed`)
    console.log(`4. Remove placeholder documents when real data is added`)
    
    process.exit(0)
    
  } catch (error: any) {
    console.error('\n❌ Database initialization failed:', error.message)
    process.exit(1)
  }
}

main()