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

# Start development server with real-time linting (recommended for large features)
npm run dev:lint

# Build for production (includes linting and type checking)
npm run build

# Linting commands
npm run lint              # Run linting once
npm run lint:watch        # Run linting in watch mode
npm run lint:fix          # Run linting and auto-fix issues

# Type checking commands  
npm run typecheck         # Run type checking once
npm run typecheck:watch   # Run type checking in watch mode

# Run both linting and type checking
npm run check
```

### Firebase CLI Commands
```bash
# Check Firebase CLI version and login status
firebase --version
firebase login:list

# List all Firebase projects
firebase projects:list

# Create new Firebase projects
firebase projects:create <project-id> --display-name "Project Name"

# Switch between projects
firebase use <project-id>

# Initialize services for a project (interactive)
firebase init database --project <project-id>
firebase init firestore --project <project-id>

# Create database instances
firebase database:instances:create <instance-name> --location <region>

# Create Firestore databases
firebase firestore:databases:create <database-name> --location <region>

# Deploy security rules to projects
firebase deploy --only firestore:rules,database:rules --project <project-id>

# Get help for specific commands
firebase <command> --help

# Common workflow for new environment setup:
# 1. Create project: firebase projects:create lokals-chat-env
# 2. Enable services via Firebase Console (easier than CLI for initial setup)
# 3. Configure authentication, Firestore, and Realtime Database
# 4. Update environment files with correct project IDs and URLs
# 5. Initialize database structure: npx tsx scripts/init-firebase-admin.ts <environment>
```

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

## Multi-Environment Deployment Setup

### Environment Overview
The application uses a three-tier deployment strategy with separate Firebase projects and Vercel deployments:

- **Production**: `https://lokals.chat` (main branch)
- **Staging**: `https://lokals.vercel.app` (staging branch)  
- **Development**: `http://localhost:3000` (develop branch)

### Git Branch Strategy
```bash
# Main branches for deployment
main      # Production environment (lokals.chat)
staging   # Staging environment (lokals.vercel.app)
develop   # Development environment (localhost)

# Feature development workflow
feature/* # Feature branches merge to develop
hotfix/*  # Hotfix branches for production issues
```

### Environment Configuration

#### Environment Variables by Environment
Each environment requires separate Firebase projects and configuration:

```bash
# .env.production
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_FIREBASE_PROJECT_ID=lokals-chat-prod
NEXT_PUBLIC_FIREBASE_API_KEY=prod_api_key
# ... other production Firebase config

# .env.staging
NEXT_PUBLIC_ENVIRONMENT=staging
NEXT_PUBLIC_FIREBASE_PROJECT_ID=lokals-chat-staging
NEXT_PUBLIC_FIREBASE_API_KEY=staging_api_key
# ... other staging Firebase config

# .env.development
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_FIREBASE_PROJECT_ID=lokals-chat-dev
NEXT_PUBLIC_FIREBASE_API_KEY=dev_api_key
# ... other development Firebase config
```

#### Environment Detection
The application uses `lib/environment.ts` for environment-specific behavior:

```typescript
import { getCurrentEnvironment, getEnvironmentConfig } from '@/lib/environment'

// Get current environment
const env = getCurrentEnvironment() // 'development' | 'staging' | 'production'

// Get environment-specific configuration
const config = getEnvironmentConfig()
// Returns: environment, isDevelopment, isStaging, isProduction, firebaseProject, appUrl
```

### Vercel Deployment Configuration

#### Branch-based Deployments
`vercel.json` configures automatic deployments:

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true,      // → lokals.chat (production)
      "staging": true,   // → lokals.vercel.app (staging)
      "develop": true    // → preview URL (development)
    }
  }
}
```

#### GitHub Actions Workflow
`.github/workflows/deploy.yml` handles automated deployments:

- **Production**: Deploys `main` branch to `lokals.chat`
- **Staging**: Deploys `staging` branch to `lokals.vercel.app`
- **Development**: Deploys `develop` branch to preview URL
- **Pull Requests**: Creates preview deployments with comment links

### Firebase Project Setup

#### Required Firebase Projects
Create separate Firebase projects for each environment:

1. **lokals-chat-prod** (Production)
   - Domain: `lokals.chat`
   - Firestore + Realtime Database
   - Authentication with production email templates

2. **lokals-chat-staging** (Staging)
   - Domain: `lokals.vercel.app`
   - Firestore + Realtime Database
   - Authentication with staging email templates

3. **lokals-chat-dev** (Development)
   - Domain: `localhost:3000`
   - Firestore + Realtime Database
   - Authentication with development email templates

#### Firebase Security Rules
Deploy security rules to each Firebase project:

```bash
# Deploy to all environments
firebase deploy --only firestore:rules,database:rules --project lokals-chat-prod
firebase deploy --only firestore:rules,database:rules --project lokals-chat-staging
firebase deploy --only firestore:rules,database:rules --project lokals-chat-dev
```

#### Database Structure Initialization
Use the Firebase Admin script to initialize database structure for new environments:

```bash
# Initialize development environment database
npx tsx scripts/init-firebase-admin.ts development

# Initialize staging environment database  
npx tsx scripts/init-firebase-admin.ts staging

# Initialize both environments at once
npx tsx scripts/init-firebase-admin.ts both
```

**Prerequisites:**
- Service account keys placed in project root:
  - `firebase-dev-key.json` (for development environment)
  - `firebase-staging-key.json` (for staging environment)
- Firebase projects with Firestore and Realtime Database enabled
- Authentication configured in Firebase Console

**What Gets Initialized:**

*Firestore Collections:*
- `user_sessions/` - User profiles linked to Firebase Auth UIDs with encrypted profile data
- `user_favorites/` - User favorite contacts and relationship management
- `users/` - Basic user data and presence information (legacy compatibility)

*Realtime Database Structure:*
- `messages/{zipcode}/` - Public room messages organized by location (US zip codes, Canadian postal codes)
- `private_messages/{conversationId}/` - Direct messages between users (conversationId = sorted user IDs)
- `active_chats/{userId}/` - Real-time active conversation tracking with last message previews
- `user_presence/{userId}/` - Live user online status and current room location
- `active_users/{zipcode}/` - Currently active users in each zipcode room

**Script Features:**
- Creates placeholder documents to initialize Firestore collections
- Sets up complete Realtime Database structure with documentation
- Includes field definitions and path patterns for reference
- Environment-specific initialization with proper project targeting
- Comprehensive error handling and troubleshooting guidance

### Deployment Workflow

#### Development to Production Flow
1. **Feature Development**: Work on `feature/*` branches
2. **Development Testing**: Merge to `develop` branch → auto-deploy to preview URL
3. **Staging Review**: Merge to `staging` branch → auto-deploy to `lokals.vercel.app`
4. **Production Release**: Merge to `main` branch → auto-deploy to `lokals.chat`

#### GitHub Secrets Configuration
Required secrets for GitHub Actions:

```bash
VERCEL_ORG_ID          # Vercel organization ID
VERCEL_PROJECT_ID      # Vercel project ID
VERCEL_TOKEN          # Vercel authentication token
```

### Environment-Specific Features

#### Development Environment
- Environment badge displayed in UI
- Relaxed security settings for testing
- Local Firebase emulators (optional)
- Hot reload and development tools

#### Staging Environment
- Environment badge displayed in UI
- Production-like configuration
- Real Firebase projects for integration testing
- Performance monitoring enabled

#### Production Environment
- No environment badge
- Strict security settings
- Production Firebase projects
- Full monitoring and analytics
- Custom domain with SSL

### Database Migration Strategy

#### Cross-Environment Data Flow
- **Development**: Test data and development features
- **Staging**: Production-like data for user acceptance testing
- **Production**: Live user data with backup and disaster recovery

#### Environment Isolation
Each environment maintains separate:
- User accounts and authentication
- Chat messages and user data
- File uploads and media storage
- Configuration and feature flags

### Monitoring and Maintenance

#### Environment-Specific Monitoring
- **Production**: Full error tracking, performance monitoring, user analytics
- **Staging**: Error tracking for testing validation
- **Development**: Basic logging for debugging

#### Backup Strategy
- **Production**: Daily automated backups with point-in-time recovery
- **Staging**: Weekly backups for testing data preservation
- **Development**: No backups required (test data only)

## Legacy Deployment Considerations

- **Environment Variables**: Firebase configuration keys and legacy encryption keys
- **Firebase Project**: Firestore, Realtime Database, and Authentication enabled
- **Security Rules**: Deployed for both Firestore and Realtime Database
- **Email Verification**: Firebase email templates configured
- **CDN Integration**: Static asset delivery via Vercel
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