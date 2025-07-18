# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lokals.chat is a modern, anonymous location-based chat application built with Next.js 15.2.4 that enables real-time communication between users in the same zip code area. It features public chat rooms organized by zip code, private messaging capabilities, and sophisticated device fingerprinting for anonymous user persistence. The application uses a modern glassmorphism design with cross-browser compatibility.

## Key Commands

### Development
```bash
# Install dependencies
npm install

# Initialize database (run once after setting DATABASE_URL)
npx tsx scripts/init-db.ts

# Start WebSocket server (required for real-time features)
npx tsx scripts/start-websocket.ts

# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

### Environment Variables Required
```bash
DATABASE_URL=your_neon_database_url
SESSION_ENCRYPTION_KEY=64_character_hex_key_for_aes_256_encryption
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15.2.4 (App Router), React 19, TypeScript, Tailwind CSS v4
- **UI Components**: shadcn/ui with Radix UI primitives
- **Database**: Neon (serverless Postgres)
- **Real-time**: Custom WebSocket server implementation
- **Security**: AES-256-GCM encryption, rate limiting, input validation
- **Authentication**: Device fingerprinting (no user registration required)

### Directory Structure
- `app/` - Next.js App Router pages and API routes
  - `api/` - Server endpoints for database operations, session management
  - Client components use `"use client"` directive
- `components/` - React components including shadcn/ui components
  - `ui/` - shadcn/ui components
  - Custom components for chat interface, onboarding, modals
- `hooks/` - Custom React hooks for WebSocket and chat functionality
- `lib/` - Utility functions and core business logic
- `scripts/` - Database initialization and WebSocket server
- `middleware.ts` - Security headers and CORS configuration

### Key Architectural Patterns

1. **Real-time Communication**: WebSocket connections are managed through custom hooks (`use-websocket.ts`) that handle connection lifecycle, message routing, and cross-tab synchronization.

2. **Anonymous User Persistence**: Device fingerprinting (`lib/device-fingerprint.ts`) creates unique identifiers based on hardware characteristics, stored in localStorage for cross-tab sharing.

3. **Session Management**: AES-256-GCM encrypted sessions (`lib/session-manager.ts`) store user profiles linked to device fingerprints, enabling anonymous persistence without registration.

4. **Database Operations**: All database queries go through structured modules:
   - `lib/database.ts` - Core database operations
   - `lib/session-manager.ts` - Session and profile management
   - `lib/user-persistence.ts` - User data persistence

5. **Security Architecture**: 
   - Input validation (`lib/validation.ts`)
   - Rate limiting (`lib/rate-limiter.ts`)
   - Session encryption with backward compatibility
   - Security headers via middleware

6. **Cross-Device Sync**: Users can connect multiple devices to the same session using transfer codes, maintaining conversation history across all devices.

## Current Feature Set

### 🎨 **Modern UI/UX**
- **Glassmorphism Design**: Dark gradient backgrounds with frosted glass effects
- **Cross-browser Compatibility**: Works on Chrome, Safari, Firefox, Edge
- **Responsive Layout**: Mobile-first design with full-screen interface
- **Modern Onboarding**: Streamlined user setup with button-based selections

### 🔐 **Anonymous Authentication**
- **Device Fingerprinting**: Hardware-based unique identification
- **Session Persistence**: Survives browser cache clearing and restarts
- **Cross-tab Sync**: Shared sessions across browser tabs
- **No Registration**: Completely anonymous user experience

### 👤 **User Profile System**
- **Profile Creation**: Username, gender, age, location during onboarding
- **Profile Locking**: Cannot be changed once set (monetization preparation)
- **Profile Modals**: View-only profile information accessible via username clicks
- **Advanced Username Generation**: 37.8 million possible combinations

### 💬 **Chat Features**
- **Public Rooms**: Zip code-based chat rooms
- **Private Messaging**: Direct messages between users
- **Active Chat Tracking**: Recent conversation history
- **Favorites System**: Save preferred contacts
- **Message Deduplication**: Prevents duplicate messages across tabs

### 📱 **Real-time Features**
- **WebSocket Integration**: Real-time message delivery
- **Multi-connection Support**: Multiple browser tabs/devices per user
- **Online Status**: Live user presence indicators
- **Message Synchronization**: Instant cross-tab message sync

### 🛡️ **Security Features**
- **AES-256-GCM Encryption**: Session data encryption
- **Rate Limiting**: API protection against abuse
- **Input Validation**: XSS and injection protection
- **CORS Configuration**: Secure cross-origin requests
- **Content Security Policy**: Browser-level security

### 🌍 **Location Features**
- **Zip Code Rooms**: US zip codes and Canadian postal codes
- **Auto-detection**: Browser geolocation with fallback
- **Canadian Support**: Forward Sortation Area (FSA) handling
- **Location Display**: Regional room information

## Development Notes

### Database Schema
- **user_sessions**: Encrypted user profiles with device linking
- **device_fingerprints**: Device identification and session mapping
- **session_devices**: Many-to-many relationship for multi-device support
- **device_transfer_codes**: Secure device linking codes
- **messages**: Chat messages with room/private routing
- **private_messages**: Direct message storage
- **user_favourites**: User relationship management

### WebSocket Implementation
- **Connection Management**: Per-user connection tracking with unique IDs
- **Message Broadcasting**: Room-based and private message routing
- **Heartbeat System**: Connection health monitoring
- **Error Handling**: Graceful disconnection and reconnection

### Security Considerations
- **No PII Collection**: Completely anonymous user data
- **Encrypted Storage**: All sensitive data encrypted at rest
- **Session Expiration**: Automatic cleanup of old sessions
- **Rate Limiting**: Protection against spam and abuse

### Performance Optimizations
- **Message Deduplication**: Client-side duplicate prevention
- **Connection Pooling**: Efficient WebSocket connection management
- **Caching Strategy**: localStorage for quick access
- **Lazy Loading**: Components loaded as needed

### Browser Compatibility
- **Chrome/Edge**: Full feature support
- **Safari**: WebKit prefixes for glassmorphism effects
- **Firefox**: Fallback styling for unsupported features
- **Mobile**: Responsive design with touch optimization

## Monetization Preparation (Phase 2)

The application is designed with future monetization in mind:

1. **Profile Locking**: Users cannot change profiles once set
2. **Username Scarcity**: Limited good usernames create value
3. **Premium Features**: Edit capabilities reserved for paid users
4. **Session Persistence**: Valuable user retention mechanism

## Testing Strategy

- **Manual Testing**: Cross-browser compatibility testing
- **Real-time Testing**: Multi-tab and multi-device scenarios
- **Security Testing**: Input validation and rate limiting
- **Performance Testing**: WebSocket connection limits

## Deployment Considerations

- **Environment Variables**: Secure key management
- **Database Scaling**: Neon serverless scaling
- **WebSocket Scaling**: Potential clustering needs
- **CDN Integration**: Static asset delivery
- **Domain Configuration**: lokals.chat deployment ready

## Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Next.js core web vitals rules
- **Path Aliases**: Clean import statements with `@/*`
- **Component Structure**: Modular, reusable components
- **Error Handling**: Comprehensive error boundaries

## Future Enhancements

- **User Profile API**: Fetch gender/age for other users
- **Push Notifications**: Real-time message alerts
- **File Sharing**: Image and document support
- **Voice Messages**: Audio message capability
- **Advanced Moderation**: Spam and content filtering