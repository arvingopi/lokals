# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lokals.chat is a modern location-based chat application built with Next.js 15.2.4 that enables real-time communication between users in the same zip code area. It features email/password authentication with email verification, public chat rooms organized by zip code, private messaging capabilities, and comprehensive user profile management. The application uses a modern glassmorphism design with cross-browser compatibility and is built for production deployment.

## Key Commands

### Development
```bash
# Install dependencies
npm install

# Initialize Firebase database (run once after setting Firebase config)
npx tsx scripts/init-db.ts

# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

### Deployment Commands

#### /deploy - Multi-Environment Deployment Pipeline
**Usage**: Type `/deploy` and Claude will execute the complete pipeline sequentially.

**What it does:**
1. **Validation Phase**: Run linting, type checking, and pre-deployment tests
2. **Development Deployment**: 
   - Create/use feature branch from current work
   - Deploy to development environment (`lokals-chat-dev` Firebase project)
   - Run automated tests and validation
   - Provide development preview URL
3. **Staging Deployment**:
   - Merge to staging branch
   - Deploy to staging environment (`lokals-chat-staging` Firebase project)  
   - Run staging validation tests and smoke tests
   - Provide staging URL for manual testing
4. **Production Deployment**:
   - Merge to main branch
   - Deploy to production (`lokals-chat` Firebase project → lokals.chat)
   - Run production smoke tests
   - Provide production URL and deployment confirmation
5. **Cleanup**: Clean up feature branches and provide deployment summary

**Environments:**
- **Development**: `https://lokals-dev.vercel.app` → Firebase `lokals-chat-dev`
- **Staging**: `https://lokals-staging.vercel.app` → Firebase `lokals-chat-staging`  
- **Production**: `https://lokals.chat` → Firebase `lokals-chat`

**Security Prerequisites**: Before using `/deploy`, ensure security is configured:
```bash
# 1. Set up repository security (run once)
npx tsx scripts/setup-security.ts

# 2. Validate security configuration
npx tsx scripts/check-security.ts
```

**Implementation**: When user types `/deploy`, Claude executes:
```bash
# 1. Run security validation
npx tsx scripts/check-security.ts

# 2. Run pre-deployment checklist (includes security checks)
npm run check:deployment

# 3. Deploy to development
npm run deploy:dev

# 4. Validate development deployment  
npm run validate:deployment development

# 5. Deploy to staging
npm run deploy:staging

# 6. Validate staging deployment
npm run validate:deployment staging

# 7. Deploy to production  
npm run deploy:prod

# 8. Validate production deployment
npm run validate:deployment production

# 9. Provide deployment summary with URLs
```

**Required Security Setup** (one-time configuration):

1. **Branch Protection Rules**:
   - Main branch: Require PR reviews, status checks, no force pushes
   - Staging branch: Require PR reviews and status checks  
   - Develop branch: Require status checks

2. **GitHub Secrets** (add manually in repository settings):
   ```bash
   VERCEL_ORG_ID                      # Vercel organization ID
   VERCEL_PROJECT_ID                  # Vercel project ID
   VERCEL_TOKEN                       # Vercel deployment token
   FIREBASE_SERVICE_ACCOUNT_KEY_DEV   # Firebase dev environment key
   FIREBASE_SERVICE_ACCOUNT_KEY_STAGING # Firebase staging environment key  
   FIREBASE_SERVICE_ACCOUNT_KEY_PROD  # Firebase production environment key
   ```

3. **GitHub Actions Permissions**:
   - Set default GITHUB_TOKEN permissions to "read"
   - Enable "Allow GitHub Actions to create and approve pull requests"
   - Workflow includes explicit permissions for PR comments

#### Manual Deployment Commands
```bash
# Deploy current branch to development environment
npm run deploy:dev

# Deploy to staging (requires staging branch)
npm run deploy:staging

# Deploy to production (requires main branch)
npm run deploy:prod

# Run full test suite before deployment
npm run test:all

# Validate deployment health
npm run validate:deployment

# Run deployment checklist
npm run check:deployment
```

#### Rollback Commands
```bash
# Rollback production to previous version
npm run rollback:prod

# Rollback staging to previous version  
npm run rollback:staging

# Check deployment history
npm run deployment:history
```

#### Security Commands
```bash
# Set up repository security configuration (run once)
npx tsx scripts/setup-security.ts

# Validate security configuration before deployment
npx tsx scripts/check-security.ts

# Check for security issues
npm run check:deployment --skip-build   # Fast security-focused check

# CRITICAL: Check for secrets before ANY commit
./scripts/pre-commit-check.sh
```

### 🚨 CRITICAL SECURITY NOTICE 🚨
**NEVER COMMIT FIREBASE SERVICE ACCOUNT KEYS OR ANY CREDENTIALS TO GIT**
- All Firebase service account keys must be stored as environment variables
- Run `./scripts/pre-commit-check.sh` before EVERY commit to check for secrets
- Service account JSON files should NEVER exist in the repository
- Use environment variables: `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string)
- If you need service account files locally, name them: `firebase-admin-key.json` (already in .gitignore)

### Environment Variables Required
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (for production)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your_project_id",...}'

# Legacy (for migration scripts)
SESSION_ENCRYPTION_KEY=64_character_hex_key_for_aes_256_encryption
```

### Firebase Admin SDK Setup
- **Local Development**: Place `firebase-admin-key.json` in project root (already gitignored)
- **Production**: Set `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable with full service account JSON as string

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15.2.4 (App Router), React 19, TypeScript, Tailwind CSS v4
- **UI Components**: shadcn/ui with Radix UI primitives
- **Database**: Firebase Realtime Database + Firestore (dual-database architecture)
- **Real-time**: Firebase Realtime Database for messaging and presence
- **Authentication**: Firebase Authentication with email/password + email verification
- **Security**: Firebase Security Rules, input validation, rate limiting

### Directory Structure
- `app/` - Next.js App Router pages and API routes
  - `api/` - Server endpoints for Firebase operations and legacy API compatibility
  - `auth/verify/` - Email verification page
  - Client components use `"use client"` directive
- `components/` - React components including shadcn/ui components
  - `ui/` - shadcn/ui components
  - `auth-landing.tsx`, `sign-in.tsx`, `sign-up.tsx` - Authentication components
  - `chat-interface.tsx`, `profile-step1.tsx`, `profile-step2.tsx` - Main app components
- `hooks/` - Custom React hooks for Firebase chat and authentication
- `lib/` - Utility functions and core business logic
  - `firebase.ts`, `firebase-auth-client.ts`, `firebase-database.ts` - Firebase integration
  - `zipcode-utils.ts`, `validation.ts` - Utility functions
- `scripts/` - Database initialization and testing utilities
- `middleware.ts` - Security headers and request handling

### Key Architectural Patterns

1. **Real-time Communication**: Firebase Realtime Database handles all real-time messaging and presence updates through optimized listeners and subscriptions (`use-firebase-chat.ts`).

2. **Email Authentication Flow**: Complete email/password authentication with verification:
   - Separate Sign In/Sign Up components with validation
   - Email verification required before account access
   - Post-verification auto-signin with direct onboarding redirect
   - Session persistence with localStorage and Firebase Auth

3. **Dual Database Architecture**: 
   - **Firestore**: User profiles, sessions, favorites, structured data
   - **Realtime Database**: Messages, presence, active chats, real-time updates

4. **Database Operations**: Firebase integration through structured modules:
   - `lib/firebase-database.ts` - Dual database operations with legacy compatibility
   - `lib/firebase-auth-client.ts` - Authentication and session management
   - `lib/firebase.ts` - Core Firebase configuration and initialization

5. **Security Architecture**: 
   - Firebase Security Rules for both databases
   - Input validation (`lib/validation.ts`)  
   - Rate limiting (`lib/rate-limiter.ts`)
   - Email verification enforcement
   - CORS and security headers via middleware

6. **Profile Management**: 
   - 2-step onboarding (profile creation + location detection)
   - Immutable profiles once locked (monetization ready)
   - Automatic location detection with manual fallback

## Current Feature Set

### 🎨 **Modern UI/UX**
- **Glassmorphism Design**: Dark gradient backgrounds with frosted glass effects
- **Cross-browser Compatibility**: Works on Chrome, Safari, Firefox, Edge
- **Responsive Layout**: Mobile-first design with full-screen interface
- **Modern Onboarding**: Streamlined user setup with button-based selections

### 🔐 **Email Authentication**
- **Classic Sign Up/Sign In Flow**: Separate authentication screens
- **Email Verification**: Required verification before account access
- **Post-Verification Auto-Signin**: Direct redirect to profile onboarding after email verification
- **Session Persistence**: Firebase Auth with localStorage backup for profiles
- **Privacy Protection**: Email addresses never shared with other users

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
- **Firebase Realtime Database**: Instant message delivery and presence
- **Optimistic Updates**: Messages appear immediately with fallback handling
- **Cross-Tab Synchronization**: Real-time sync across multiple browser tabs
- **Active Chat Subscriptions**: Live updates for private message conversations
- **Online Status**: Real-time user presence indicators

### 🛡️ **Security Features**
- **Firebase Security Rules**: Database-level access control for both Firestore and Realtime Database
- **Email Verification**: Mandatory email verification before account access
- **Session Encryption**: AES-256-GCM for sensitive session data
- **Input Validation**: XSS and injection protection via validation utilities
- **Rate Limiting**: API protection against abuse and spam
- **CORS Configuration**: Secure cross-origin request handling

### 🌍 **Location Features**
- **Zip Code Rooms**: US zip codes and Canadian postal codes
- **Auto-detection**: Browser geolocation with fallback
- **Canadian Support**: Forward Sortation Area (FSA) handling
- **Location Display**: Regional room information

## Development Notes

### Firebase Database Structure

#### Firestore Collections
- **user_sessions**: User profiles linked to Firebase Auth UIDs
- **user_favorites**: User relationship management and favorite contacts
- **users**: Basic user data and presence information

#### Realtime Database Structure
- **messages/{zipcode}**: Public room messages organized by location
- **private_messages/{conversationId}**: Direct messages between users
- **active_chats/{userId}**: Real-time active conversation tracking
- **user_presence/{userId}**: Live online status and activity
- **active_users/{zipcode}**: Currently active users in each room

### Firebase Integration
- **Authentication**: Email/password with verification via Firebase Auth
- **Real-time Messaging**: Firebase Realtime Database with optimistic updates
- **User Management**: Firestore for structured user data and relationships
- **Security Rules**: Comprehensive rules for both databases ensuring data privacy

### Security Considerations
- **Email Privacy**: Email addresses stored securely in Firebase Auth, never shared with users
- **Verified Accounts**: Email verification required before account access
- **Encrypted Sessions**: AES-256-GCM encryption for sensitive profile data
- **Firebase Security Rules**: Database-level access control preventing unauthorized access
- **Rate Limiting**: Protection against spam and abuse
- **Input Validation**: Comprehensive validation to prevent XSS and injection attacks

### Performance Optimizations
- **Optimistic Updates**: Messages appear immediately with real-time sync
- **Firebase Connection Management**: Efficient real-time database connections
- **LocalStorage Caching**: Profile and session data cached for instant access
- **Component Code Splitting**: Lazy loading for auth and chat components
- **Real-time Subscriptions**: Efficient listeners for active chats and presence

### Browser Compatibility
- **Chrome/Edge**: Full feature support
- **Safari**: WebKit prefixes for glassmorphism effects
- **Firefox**: Fallback styling for unsupported features
- **Mobile**: Responsive design with touch optimization

## Monetization Preparation (Phase 2)

The application is designed with future monetization in mind:

1. **Profile Locking**: Users cannot change profiles once set (immutable after creation)
2. **Username Scarcity**: Limited good usernames create value with 37.8M combinations
3. **Email-Based Accounts**: Verified email accounts enable premium features and billing
4. **Premium Features**: Profile editing, advanced usernames, priority support
5. **Account Persistence**: Firebase Auth ensures reliable user retention and billing

## Testing Strategy

- **Manual Testing**: Cross-browser compatibility and responsive design
- **Authentication Flow Testing**: Email verification and sign-in/sign-up flows
- **Real-time Testing**: Multi-tab sync and Firebase connection handling
- **Security Testing**: Input validation, rate limiting, and Firebase rules
- **Performance Testing**: Firebase connection limits and message throughput

## Deployment Considerations

- **Environment Variables**: Firebase configuration keys and legacy encryption keys
- **Firebase Project**: Firestore, Realtime Database, and Authentication enabled
- **Security Rules**: Deployed for both Firestore and Realtime Database
- **Email Verification**: Firebase email templates configured
- **CDN Integration**: Static asset delivery via Vercel/Netlify
- **Domain Configuration**: lokals.chat deployment ready with Firebase Auth domain

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