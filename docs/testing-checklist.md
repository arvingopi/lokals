# Firebase Migration Testing Checklist

## 🚀 **Pre-Testing Setup**
- [ ] Firebase services enabled (Auth, Realtime DB, Firestore)
- [ ] Environment variables configured in `.env.local`
- [ ] Development server running (`npm run dev`)
- [ ] Firebase integration test passed

## 🧪 **Core Functionality Tests**

### **Authentication & Session Management**
- [ ] Anonymous user creation works
- [ ] Session persistence across browser restart
- [ ] Device fingerprinting working
- [ ] Transfer codes for device linking
- [ ] Session encryption maintained

### **Public Room Messaging**
- [ ] Messages send successfully
- [ ] Messages appear in real-time
- [ ] Message history loads correctly
- [ ] Cross-tab synchronization works
- [ ] User presence updates
- [ ] Active users list updates

### **Private Messaging**
- [ ] Private messages send successfully
- [ ] Private messages appear in real-time
- [ ] Private message history loads
- [ ] Cross-tab private message sync
- [ ] Active chats list updates

### **User Management**
- [ ] User profiles creation
- [ ] Profile updates (zip code, etc.)
- [ ] Favorites system working
- [ ] Add/remove favorites
- [ ] User profile modals

## 🔄 **Real-time Features**

### **Multi-Tab Testing**
- [ ] Open app in 2+ browser tabs
- [ ] Send message in Tab 1
- [ ] Verify instant appearance in Tab 2
- [ ] Test private messages across tabs
- [ ] Verify user presence across tabs

### **Multi-Device Testing**
- [ ] Open app on 2+ devices/browsers
- [ ] Complete onboarding on both
- [ ] Test real-time messaging between devices
- [ ] Test private messaging between devices
- [ ] Test session transfer between devices

## 📱 **API Endpoints Testing**

### **Session Management**
- [ ] `POST /api/session` - Create/get session
- [ ] `GET /api/session` - Retrieve session
- [ ] `PUT /api/session/update` - Update session

### **Messaging APIs**
- [ ] `GET /api/rooms/[zipcode]/messages` - Get room messages
- [ ] `POST /api/rooms/[zipcode]/messages` - Send message
- [ ] `GET /api/private-messages` - Get private messages
- [ ] `POST /api/private-messages` - Send private message

### **User Management**
- [ ] `GET /api/favourites` - Get user favorites
- [ ] `POST /api/favourites` - Add favorite
- [ ] `DELETE /api/favourites` - Remove favorite
- [ ] `GET /api/active-chats` - Get active chats

### **System APIs**
- [ ] `POST /api/cleanup` - System cleanup
- [ ] `POST /api/rooms/[zipcode]/presence` - Update presence

## 🔍 **Firebase Console Verification**

### **Realtime Database**
- [ ] Messages appearing in `messages/{zipcode}/`
- [ ] Private messages in `private_messages/{conversationId}/`
- [ ] User presence in `user_presence/{userId}/`
- [ ] Active users in `active_users/{zipcode}/`

### **Firestore**
- [ ] User profiles in `users` collection
- [ ] User sessions in `user_sessions` collection
- [ ] Favorites in `user_favorites` collection
- [ ] Transfer codes in `device_transfer_codes` collection

### **Authentication**
- [ ] Anonymous users appearing in Auth tab
- [ ] User UIDs matching database entries

## 🌐 **Cross-Browser Testing**
- [ ] Chrome - Full functionality
- [ ] Safari - Full functionality
- [ ] Firefox - Full functionality
- [ ] Edge - Full functionality
- [ ] Mobile browsers - Basic functionality

## 📊 **Performance Testing**
- [ ] Page load times reasonable
- [ ] Real-time message latency < 1 second
- [ ] Large message volumes handling
- [ ] Multiple concurrent users

## 🔒 **Security Testing**
- [ ] Security rules preventing unauthorized access
- [ ] Session data encrypted
- [ ] User can only access own data
- [ ] Private messages only accessible to participants

## 🚨 **Error Handling**
- [ ] Network disconnection handling
- [ ] Firebase reconnection working
- [ ] Graceful degradation when offline
- [ ] Error messages user-friendly

## 📈 **Monitoring & Logging**
- [ ] Console logs helpful for debugging
- [ ] Firebase usage metrics tracking
- [ ] Error reporting functional
- [ ] Performance metrics available

## ✅ **Final Validation**
- [ ] All original features working
- [ ] No breaking changes introduced
- [ ] User experience identical
- [ ] Performance equal or better
- [ ] Ready for production deployment

---

## 🛠️ **Testing Commands**

```bash
# Start development server
npm run dev

# Test Firebase integration
npx tsx scripts/test-firebase-integration.ts

# Test API endpoints
npx tsx scripts/test-api-endpoints.ts

# Build for production
npm run build

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

## 🐛 **Common Issues & Solutions**

### **Firebase Connection Issues**
- Check environment variables
- Verify Firebase services enabled
- Check network connectivity
- Verify security rules

### **Authentication Problems**
- Enable Anonymous Auth in Firebase Console
- Check Firebase config values
- Verify domain allowlist

### **Real-time Not Working**
- Check Realtime Database rules
- Verify WebSocket connections
- Check browser console for errors

### **API Errors**
- Check server logs
- Verify Firebase Admin SDK setup
- Check API route implementations