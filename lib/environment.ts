// Environment configuration helper
export type Environment = 'development' | 'staging' | 'production'

export function getCurrentEnvironment(): Environment {
  // Check NEXT_PUBLIC_ENVIRONMENT first for explicit environment setting
  const publicEnv = process.env.NEXT_PUBLIC_ENVIRONMENT as Environment
  if (publicEnv) {
    return publicEnv
  }

  // Fallback to NODE_ENV
  const nodeEnv = process.env.NODE_ENV
  if (nodeEnv === 'development') {
    return 'development'
  }

  // Default to production for safety
  return 'production'
}

export function getEnvironmentConfig() {
  const env = getCurrentEnvironment()
  
  return {
    environment: env,
    isDevelopment: env === 'development',
    isStaging: env === 'staging',
    isProduction: env === 'production',
    firebaseProject: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'lokals-chat',
    appUrl: getAppUrl(env)
  }
}

function getAppUrl(env: Environment): string {
  switch (env) {
    case 'development':
      return 'http://localhost:3000'
    case 'staging':
      return 'https://lokals.vercel.app'
    case 'production':
      return 'https://lokals.chat'
    default:
      return 'https://lokals.chat'
  }
}

// Helper to show environment badge in UI (optional)
export function getEnvironmentBadge(): { show: boolean; text: string; color: string } | null {
  const env = getCurrentEnvironment()
  
  switch (env) {
    case 'development':
      return { show: true, text: 'DEV', color: 'bg-yellow-500' }
    case 'staging':
      return { show: true, text: 'STAGING', color: 'bg-orange-500' }
    case 'production':
      return null // Don't show badge in production
    default:
      return null
  }
}