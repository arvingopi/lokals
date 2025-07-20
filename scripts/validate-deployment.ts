#!/usr/bin/env npx tsx

/**
 * Deployment Validation Script
 * Validates that a deployment is working correctly by running health checks
 */

import { execSync } from 'child_process'

interface DeploymentConfig {
  name: string
  url: string
  healthEndpoint: string
  expectedStatus: number
  timeout: number
}

const environments: Record<string, DeploymentConfig> = {
  development: {
    name: 'Development',
    url: 'https://lokals-dev.vercel.app',
    healthEndpoint: '/api/health',
    expectedStatus: 200,
    timeout: 30000
  },
  staging: {
    name: 'Staging', 
    url: 'https://lokals-staging.vercel.app',
    healthEndpoint: '/api/health',
    expectedStatus: 200,
    timeout: 30000
  },
  production: {
    name: 'Production',
    url: 'https://lokals.chat',
    healthEndpoint: '/api/health', 
    expectedStatus: 200,
    timeout: 30000
  }
}

async function makeRequest(url: string, timeout: number): Promise<{ status: number, body: string }> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeout}ms`))
    }, timeout)

    // Use curl for the request since we're in a script environment
    try {
      const result = execSync(`curl -s -w "%{http_code}" -o /tmp/response.txt "${url}"`, { 
        encoding: 'utf8',
        timeout: timeout 
      })
      
      const status = parseInt(result.trim())
      const body = execSync('cat /tmp/response.txt', { encoding: 'utf8' })
      
      clearTimeout(timeoutId)
      resolve({ status, body })
    } catch (error) {
      clearTimeout(timeoutId)
      reject(error)
    }
  })
}

async function validateHealthEndpoint(config: DeploymentConfig): Promise<boolean> {
  try {
    console.log(`🔍 Checking health endpoint: ${config.url}${config.healthEndpoint}`)
    
    const response = await makeRequest(`${config.url}${config.healthEndpoint}`, config.timeout)
    
    if (response.status === config.expectedStatus) {
      console.log(`✅ Health check passed (${response.status})`)
      
      // Try to parse response as JSON for additional validation
      try {
        const healthData = JSON.parse(response.body)
        if (healthData.status === 'ok') {
          console.log(`✅ Health endpoint returned expected status`)
          return true
        } else {
          console.log(`⚠️ Health endpoint returned unexpected status: ${healthData.status}`)
        }
      } catch {
        console.log(`⚠️ Health endpoint response is not valid JSON`)
      }
      
      return true
    } else {
      console.log(`❌ Health check failed (${response.status})`)
      return false
    }
  } catch (error) {
    console.log(`❌ Health check error: ${error}`)
    return false
  }
}

async function validatePageLoad(config: DeploymentConfig): Promise<boolean> {
  try {
    console.log(`🔍 Checking main page load: ${config.url}`)
    
    const response = await makeRequest(config.url, config.timeout)
    
    if (response.status === 200) {
      if (response.body.includes('<title>') && response.body.includes('Lokals')) {
        console.log(`✅ Main page loads correctly`)
        return true
      } else {
        console.log(`⚠️ Main page loads but content may be incorrect`)
        return false
      }
    } else {
      console.log(`❌ Main page failed to load (${response.status})`)
      return false
    }
  } catch (error) {
    console.log(`❌ Page load error: ${error}`)
    return false
  }
}

async function validateEnvironment(envName: string): Promise<boolean> {
  const config = environments[envName]
  if (!config) {
    console.log(`❌ Unknown environment: ${envName}`)
    return false
  }

  console.log(`\\n🚀 Validating ${config.name} Environment`)
  console.log(`📍 URL: ${config.url}`)
  console.log(`⏱️ Timeout: ${config.timeout}ms`)
  
  let allPassed = true
  
  // Wait a moment for deployment to be ready
  console.log(`⏳ Waiting 10 seconds for deployment to be ready...`)
  await new Promise(resolve => setTimeout(resolve, 10000))
  
  // Run validation checks
  const healthCheck = await validateHealthEndpoint(config)
  const pageCheck = await validatePageLoad(config)
  
  allPassed = healthCheck && pageCheck
  
  console.log(`\\n${allPassed ? '✅' : '❌'} ${config.name} validation ${allPassed ? 'PASSED' : 'FAILED'}`)
  
  return allPassed
}

async function main() {
  const envArg = process.argv[2]
  
  if (!envArg) {
    console.log(`
🔍 Deployment Validation Tool

Usage: npx tsx scripts/validate-deployment.ts <environment>

Arguments:
  development  - Validate development environment
  staging      - Validate staging environment  
  production   - Validate production environment
  all          - Validate all environments

Examples:
  npx tsx scripts/validate-deployment.ts development
  npx tsx scripts/validate-deployment.ts staging
  npx tsx scripts/validate-deployment.ts production
  npx tsx scripts/validate-deployment.ts all
`)
    process.exit(1)
  }

  try {
    console.log('🔍 Deployment Validation Tool')
    console.log('============================')
    
    let success = true
    
    if (envArg === 'all') {
      for (const [envName] of Object.entries(environments)) {
        const result = await validateEnvironment(envName)
        success = success && result
      }
    } else {
      success = await validateEnvironment(envArg)
    }
    
    console.log(`\\n${'='.repeat(50)}`)
    if (success) {
      console.log(`✅ All validations PASSED`)
      console.log(`\\n📝 Next steps:`)
      console.log(`1. Deployment is healthy and ready`)
      console.log(`2. You can proceed with confidence`)
      process.exit(0)
    } else {
      console.log(`❌ Some validations FAILED`)
      console.log(`\\n📝 Recommended actions:`)
      console.log(`1. Check deployment logs`)
      console.log(`2. Verify environment configuration`)
      console.log(`3. Consider rolling back if necessary`)
      process.exit(1)
    }
  } catch (error) {
    console.error('\\n❌ Validation failed:', error)
    process.exit(1)
  }
}

main()