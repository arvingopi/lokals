# Firebase Setup Guide for Lokals.chat

## Current Status
✅ **Firebase Project Created**: lokals-chat  
✅ **Web App Created**: lokals-chat-web  
✅ **Configuration Added**: Environment variables set  
✅ **Firebase CLI Connected**: Project linked locally  

## Required Manual Steps in Firebase Console

### 1. Enable Firebase Services
Visit the Firebase Console: https://console.firebase.google.com/project/lokals-chat

#### A. Enable Authentication
1. Go to **Authentication** > **Sign-in method**
2. Enable **Anonymous** authentication
3. Click **Save**

#### B. Enable Firestore Database
1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (we'll update security rules later)
4. Select location: **us-central** (recommended for US users)
5. Click **Done**

#### C. Enable Realtime Database
1. Go to **Realtime Database**
2. Click **Create Database**
3. Choose **Start in test mode**
4. Select location: **us-central1**
5. Click **Done**

#### D. Enable App Check (Recommended for Security)
1. Go to **App Check**
2. Register your web app
3. Choose **reCAPTCHA v3** as provider
4. Click **Save**

### 2. Update Security Rules

#### Firestore Security Rules
1. Go to **Firestore Database** > **Rules**
2. Replace the default rules with our custom rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - authenticated users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User sessions - authenticated users can read/write their own sessions
    match /user_sessions/{sessionId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        resource.data.userId == request.auth.uid;
    }
    
    // Chat rooms metadata - authenticated users can read room info
    match /rooms/{zipcode} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid));
    }
    
    // User favorites - authenticated users can manage their own favorites
    match /user_favorites/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Device sessions - authenticated users can manage their own devices
    match /device_sessions/{deviceId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        resource.data.userId == request.auth.uid;
    }
  }
}
```

#### Realtime Database Security Rules
1. Go to **Realtime Database** > **Rules**
2. Replace the default rules with:
```json
{
  "rules": {
    "messages": {
      "$zipcode": {
        ".read": "auth != null",
        ".write": "auth != null",
        "$messageId": {
          ".validate": "newData.hasChildren(['content', 'timestamp', 'userId', 'username']) && newData.child('userId').val() == auth.uid"
        }
      }
    },
    "private_messages": {
      "$conversationId": {
        ".read": "auth != null && ($conversationId.contains(auth.uid))",
        ".write": "auth != null && ($conversationId.contains(auth.uid))",
        "$messageId": {
          ".validate": "newData.hasChildren(['content', 'timestamp', 'senderId', 'recipientId']) && (newData.child('senderId').val() == auth.uid || newData.child('recipientId').val() == auth.uid)"
        }
      }
    },
    "user_presence": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && $userId == auth.uid"
      }
    },
    "active_users": {
      "$zipcode": {
        ".read": "auth != null",
        "$userId": {
          ".write": "auth != null && $userId == auth.uid"
        }
      }
    },
    "typing_indicators": {
      "$zipcode": {
        ".read": "auth != null",
        "$userId": {
          ".write": "auth != null && $userId == auth.uid"
        }
      }
    }
  }
}
```

### 3. Verify Configuration

After completing the manual steps, run these commands to verify:

```bash
# Check if Firestore is accessible
firebase firestore:databases:list

# Check if Realtime Database is accessible  
firebase database:get /

# Test authentication (this will be done in code)
```

### 4. Next Steps

Once you've completed these manual steps:

1. **Test Firebase Connection**: We'll create a simple test to verify all services work
2. **Begin Migration**: Start replacing NeonDB operations with Firebase
3. **Update Client Code**: Replace WebSocket with Firebase Realtime Database
4. **Test Features**: Validate all existing features work with Firebase

## Important Notes

### Security Considerations
- Anonymous authentication users will be automatically assigned UIDs
- We'll maintain device fingerprinting for cross-device persistence
- Session data will remain encrypted even in Firebase

### Migration Strategy
- We'll run both NeonDB and Firebase in parallel initially
- Gradually migrate features one by one
- Keep the existing database as backup during transition

### Performance Considerations
- Firebase Realtime Database is optimized for real-time messaging
- Firestore is optimized for complex queries and user data
- Both services auto-scale based on usage

## Troubleshooting

### Common Issues
1. **Database not accessible**: Ensure services are enabled in console
2. **Authentication fails**: Check Anonymous auth is enabled
3. **Rules too restrictive**: Start with test mode, then tighten security
4. **API not enabled**: Some services require API enablement in Google Cloud Console

### Getting Help
- Firebase Console: https://console.firebase.google.com/project/lokals-chat
- Firebase Documentation: https://firebase.google.com/docs
- Local testing: Use Firebase emulators for development

---

**Ready to proceed?** Once you've completed the manual setup steps in the Firebase Console, let me know and we'll continue with the migration implementation.