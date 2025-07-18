// TypeScript interfaces for Firebase data structures

import { Timestamp } from 'firebase/firestore'

// Firestore Document Interfaces

export interface FirebaseUser {
  id: string
  username: string
  zipcode: string
  lastSeen: Timestamp
  isOnline: boolean
  createdAt: Timestamp
  sessionId?: string
  deviceFingerprint: string
  profileComplete: boolean
  gender?: string
  age?: string
}

export interface FirebaseUserSession {
  sessionId: string
  userId: string
  encryptedProfileData: string
  createdAt: Timestamp
  expiresAt: Timestamp
  deviceCount: number
  lastActive: Timestamp
  devices: {
    [deviceFingerprint: string]: {
      deviceType: string
      deviceName?: string
      authorizedAt: Timestamp
      lastSeen: Timestamp
      isActive: boolean
    }
  }
}

export interface FirebaseUserFavorite {
  userId: string
  favoriteUserId: string
  favoriteUsername: string
  createdAt: Timestamp
}

export interface FirebaseRoom {
  zipcode: string
  displayName: string
  userCount: number
  lastActivity: Timestamp
  createdAt: Timestamp
  isActive: boolean
  moderators?: string[]
}

export interface FirebaseDeviceTransferCode {
  code: string
  sessionId: string
  createdAt: Timestamp
  expiresAt: Timestamp
  maxUses: number
  usesCount: number
  usedAt?: Timestamp
}

// Realtime Database Interfaces

export interface RealtimeMessage {
  id: string
  content: string
  timestamp: number
  userId: string
  username: string
  zipcode: string
  sessionId?: string
}

export interface RealtimePrivateMessage {
  id: string
  content: string
  timestamp: number
  senderId: string
  recipientId: string
  senderUsername: string
  sessionId?: string
}

export interface RealtimeUserPresence {
  isOnline: boolean
  lastSeen: number
  zipcode: string
  username: string
  connectionCount: number
}

export interface RealtimeActiveUser {
  username: string
  joinedAt: number
  lastActivity: number
}

export interface RealtimeTypingIndicator {
  username: string
  isTyping: boolean
  timestamp: number
}

// Legacy compatibility interfaces (for migration)

export interface LegacyMessage {
  id: string
  content: string
  timestamp: Date
  user_id: string
  username: string
  zipcode: string
  is_private: boolean
  recipient_id?: string
  session_id?: string
}

export interface LegacyUser {
  id: string
  username: string
  last_seen: Date
  zipcode: string
  is_online: boolean
  session_id?: string
}

export interface LegacyFavouriteUser {
  id: string
  user_id: string
  favourite_user_id: string
  favourite_username: string
  created_at: Date
}

export interface LegacyActiveChatUser {
  user_id: string
  username: string
  last_message_time: Date
  last_message_content: string
  is_sender: boolean
}

// Session Profile interface (for encryption/decryption)
export interface SessionProfile {
  userId: string
  username: string
  zipcode?: string
  gender?: string
  age?: string
  createdAt: string
}

// Conversion utilities type definitions

export type FirebaseToLegacyConverter<T, U> = (firebaseData: T) => U
export type LegacyToFirebaseConverter<T, U> = (legacyData: T) => U

// Database operation response types

export interface FirebaseOperationResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface BatchOperationResult {
  success: boolean
  results: FirebaseOperationResult<any>[]
  errors: string[]
}

// Real-time listener types

export interface RealtimeListenerConfig {
  path: string
  eventType: 'value' | 'child_added' | 'child_changed' | 'child_removed'
  callback: (snapshot: any) => void
  errorCallback?: (error: Error) => void
}

export interface FirestoreListenerConfig {
  collection: string
  query?: any
  callback: (snapshot: any) => void
  errorCallback?: (error: Error) => void
}

// Authentication types

export interface AnonymousAuthResult {
  user: {
    uid: string
    isAnonymous: boolean
    metadata: {
      creationTime: string
      lastSignInTime: string
    }
  }
  additionalUserInfo?: {
    isNewUser: boolean
  }
}

// Migration utility types

export interface MigrationProgress {
  phase: string
  step: string
  progress: number
  totalSteps: number
  errors: string[]
  warnings: string[]
}

export interface MigrationResult {
  success: boolean
  migratedRecords: number
  failedRecords: number
  errors: string[]
  duration: number
}