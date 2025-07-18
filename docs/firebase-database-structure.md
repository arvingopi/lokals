# Firebase Database Structure for Lokals.chat

## Overview
This document outlines the migration from NeonDB to Firebase, using both Firestore (for user data/metadata) and Realtime Database (for live messaging).

## Current NeonDB Schema → Firebase Migration

### Firestore Collections (for user data and metadata)

#### 1. `users` collection
```typescript
// Document ID: userId
{
  id: string,           // Same as document ID
  username: string,
  zipcode: string,
  lastSeen: Timestamp,
  isOnline: boolean,
  createdAt: Timestamp,
  sessionId?: string,
  
  // New fields for Firebase
  deviceFingerprint: string,
  profileComplete: boolean,
  gender?: string,
  age?: string
}
```

#### 2. `user_sessions` collection
```typescript
// Document ID: sessionId
{
  sessionId: string,           // Same as document ID
  userId: string,              // Reference to users collection
  encryptedProfileData: string, // AES-256-GCM encrypted profile
  createdAt: Timestamp,
  expiresAt: Timestamp,
  deviceCount: number,
  lastActive: Timestamp,
  
  // Device management
  devices: {
    [deviceFingerprint: string]: {
      deviceType: string,
      deviceName?: string,
      authorizedAt: Timestamp,
      lastSeen: Timestamp,
      isActive: boolean
    }
  }
}
```

#### 3. `user_favorites` collection
```typescript
// Document ID: auto-generated
{
  userId: string,              // Who favorited
  favoriteUserId: string,      // Who was favorited  
  favoriteUsername: string,
  createdAt: Timestamp
}
```

#### 4. `rooms` collection
```typescript
// Document ID: zipcode
{
  zipcode: string,             // Same as document ID
  displayName: string,         // e.g., "New York, NY 10001"
  userCount: number,
  lastActivity: Timestamp,
  createdAt: Timestamp,
  
  // Room metadata
  isActive: boolean,
  moderators?: string[]        // Future feature
}
```

#### 5. `device_transfer_codes` collection
```typescript
// Document ID: code
{
  code: string,                // 6-digit code
  sessionId: string,
  createdAt: Timestamp,
  expiresAt: Timestamp,
  maxUses: number,
  usesCount: number,
  usedAt?: Timestamp
}
```

### Realtime Database Structure (for live messaging)

#### 1. Public Room Messages
```
messages/
  {zipcode}/
    {messageId}/
      id: string
      content: string
      timestamp: number
      userId: string
      username: string
      zipcode: string
      sessionId?: string
```

#### 2. Private Messages
```
private_messages/
  {conversationId}/           // Format: "userId1_userId2" (sorted)
    {messageId}/
      id: string
      content: string
      timestamp: number
      senderId: string
      recipientId: string
      senderUsername: string
      sessionId?: string
```

#### 3. User Presence
```
user_presence/
  {userId}/
    isOnline: boolean
    lastSeen: number
    zipcode: string
    username: string
    connectionCount: number
```

#### 4. Active Users by Room
```
active_users/
  {zipcode}/
    {userId}/
      username: string
      joinedAt: number
      lastActivity: number
```

#### 5. Typing Indicators
```
typing_indicators/
  {zipcode}/
    {userId}/
      username: string
      isTyping: boolean
      timestamp: number
```

## Data Flow Changes

### Current Flow (NeonDB + WebSocket)
1. Client connects to WebSocket server
2. Server queries NeonDB for user data
3. Server broadcasts messages via WebSocket
4. Client receives real-time updates

### New Flow (Firebase)
1. Client authenticates with Firebase Auth (Anonymous)
2. Client subscribes to Firestore collections for user data
3. Client subscribes to Realtime Database for live messaging
4. Firebase handles real-time synchronization automatically

## Migration Strategy

### Phase 1: Setup
- ✅ Install Firebase SDK
- ✅ Configure Firebase project
- ✅ Set up security rules
- ✅ Create database structure

### Phase 2: Data Layer
- Replace database operations with Firebase Admin SDK
- Implement Firestore queries for user data
- Implement Realtime Database operations for messages

### Phase 3: Real-time Layer
- Replace WebSocket server with Firebase Realtime Database
- Update client hooks to use Firebase SDK
- Implement presence detection with Firebase

### Phase 4: Authentication
- Migrate from device fingerprinting to Firebase Anonymous Auth
- Maintain session persistence across devices
- Implement device linking with Firebase

## Security Considerations

### Firestore Security Rules
- Users can only read/write their own data
- Room metadata is readable by authenticated users
- Favorites are private to each user

### Realtime Database Security Rules
- Messages are readable by authenticated users in the same room
- Private messages are only accessible to participants
- Presence data is readable by all, writable by owner

## Performance Optimizations

### Firestore
- Use composite indexes for complex queries
- Implement pagination for large datasets
- Cache frequently accessed data

### Realtime Database
- Use shallow queries for large message lists
- Implement message pagination
- Use presence detection for connection management

## Monitoring & Analytics

### Firebase Analytics
- Track user engagement
- Monitor message volume
- Analyze room activity

### Performance Monitoring
- Track database response times
- Monitor real-time connection quality
- Alert on security rule violations

## Cost Optimization

### Firestore
- Use transactions for atomic operations
- Minimize document reads with caching
- Implement efficient query patterns

### Realtime Database
- Use connection pooling
- Implement message cleanup for old data
- Monitor bandwidth usage

## Testing Strategy

### Unit Tests
- Test Firebase operations
- Test security rules
- Test data transformations

### Integration Tests
- Test real-time messaging
- Test cross-device synchronization
- Test presence detection

### Load Testing
- Test concurrent user limits
- Test message throughput
- Test database scaling