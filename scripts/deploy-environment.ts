#!/usr/bin/env npx tsx

/**
 * Environment Deployment Script
 * Handles deployment to specific environments with proper branch management
 */

import { execSync } from 'child_process'

type Environment = 'development' | 'staging' | 'production'

interface EnvironmentConfig {
  name: string
  branch: string
  description: string
  requiresCleanBranch: boolean
}

const environments: Record<Environment, EnvironmentConfig> = {
  development: {
    name: 'Development',
    branch: 'develop',
    description: 'Development environment for testing features',
    requiresCleanBranch: false
  },
  staging: {
    name: 'Staging',
    branch: 'staging', 
    description: 'Staging environment for pre-production testing',
    requiresCleanBranch: true
  },
  production: {
    name: 'Production',
    branch: 'main',
    description: 'Production environment (live application)',
    requiresCleanBranch: true
  }
}

class EnvironmentDeployer {
  private environment: Environment
  private config: EnvironmentConfig

  constructor(environment: Environment) {
    this.environment = environment
    this.config = environments[environment]
  }

  private runCommand(command: string, description?: string): string {
    if (description) {
      console.log(`🔄 ${description}`)
    }
    
    try {
      const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
      return result.trim()
    } catch (error: any) {
      console.error(`❌ Command failed: ${command}`)
      console.error(`Error: ${error.message}`)
      throw error
    }
  }

  private getCurrentBranch(): string {
    return this.runCommand('git branch --show-current')
  }

  private hasUncommittedChanges(): boolean {
    const result = this.runCommand('git status --porcelain')
    return result.length > 0
  }

  private checkPrerequisites(): void {
    console.log(`🔍 Checking deployment prerequisites for ${this.config.name}...`)
    
    // Check if git repo
    try {
      this.runCommand('git status')
    } catch {
      throw new Error('Not a git repository')
    }

    // Check for uncommitted changes if required
    if (this.config.requiresCleanBranch && this.hasUncommittedChanges()) {
      throw new Error('Uncommitted changes found. Please commit or stash changes before deploying.')
    }

    // Check if target branch exists
    try {
      this.runCommand(`git show-ref --verify --quiet refs/heads/${this.config.branch}`)
    } catch {
      console.log(`⚠️ Target branch '${this.config.branch}' does not exist locally`)
      
      try {
        this.runCommand(`git show-ref --verify --quiet refs/remotes/origin/${this.config.branch}`)
        console.log(`📥 Checking out remote branch '${this.config.branch}'`)
        this.runCommand(`git checkout -b ${this.config.branch} origin/${this.config.branch}`)
      } catch {
        if (this.environment === 'development') {
          console.log(`🔧 Creating development branch '${this.config.branch}'`)
          this.runCommand(`git checkout -b ${this.config.branch}`)
        } else {
          throw new Error(`Target branch '${this.config.branch}' does not exist`)
        }
      }
    }

    console.log(`✅ Prerequisites check passed`)
  }

  private switchToBranch(): void {
    const currentBranch = this.getCurrentBranch()
    
    if (currentBranch === this.config.branch) {
      console.log(`📍 Already on ${this.config.branch} branch`)
      return
    }

    console.log(`🔄 Switching from ${currentBranch} to ${this.config.branch}`)
    
    // For development, we can deploy from any branch
    if (this.environment === 'development') {
      // Stay on current branch for development deployments
      console.log(`📍 Staying on ${currentBranch} for development deployment`)
      return
    }

    // For staging and production, switch to target branch
    this.runCommand(`git checkout ${this.config.branch}`, `Switching to ${this.config.branch} branch`)
    
    // Pull latest changes
    this.runCommand(`git pull origin ${this.config.branch}`, 'Pulling latest changes')
  }

  private mergeBranch(): void {
    if (this.environment === 'development') {
      console.log(`📍 Development deployment - no merge required`)
      return
    }

    const currentBranch = this.getCurrentBranch()
    if (currentBranch === this.config.branch) {
      console.log(`📍 Already on target branch ${this.config.branch}`)
      return
    }

    console.log(`🔄 Merging ${currentBranch} into ${this.config.branch}`)
    
    // Switch to target branch and merge
    this.runCommand(`git checkout ${this.config.branch}`)
    this.runCommand(`git pull origin ${this.config.branch}`, 'Pulling latest target branch')
    this.runCommand(`git merge ${currentBranch}`, `Merging ${currentBranch}`)
  }

  private pushChanges(): void {
    console.log(`🚀 Pushing to ${this.config.branch} branch`)
    this.runCommand(`git push origin ${this.config.branch}`, 'Pushing changes to remote')
  }

  private waitForDeployment(): void {
    console.log(`⏳ Waiting for GitHub Actions deployment...`)
    
    // Wait a moment for GitHub Actions to trigger
    console.log(`   Waiting 30 seconds for deployment to start...`)
    execSync('sleep 30')
    
    // Check recent runs
    try {
      const runs = this.runCommand('gh run list --limit 3 --json status,conclusion,headBranch')
      const runData = JSON.parse(runs)
      
      const relevantRun = runData.find((run: any) => run.headBranch === this.config.branch)
      if (relevantRun) {
        if (relevantRun.status === 'in_progress') {
          console.log(`🔄 Deployment is in progress...`)
        } else if (relevantRun.conclusion === 'success') {
          console.log(`✅ Deployment completed successfully`)
        } else if (relevantRun.conclusion === 'failure') {
          console.log(`❌ Deployment failed`)
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not check deployment status: ${error}`)
    }
  }

  async deploy(): Promise<void> {
    console.log(`\\n🚀 Deploying to ${this.config.name} Environment`)
    console.log(`📋 ${this.config.description}`)
    console.log(`🌿 Target branch: ${this.config.branch}`)
    console.log(`${'='.repeat(50)}\\n`)

    try {
      // 1. Check prerequisites
      this.checkPrerequisites()

      // 2. Switch to appropriate branch
      this.switchToBranch()

      // 3. Merge if needed (for staging/production)
      this.mergeBranch()

      // 4. Push changes
      this.pushChanges()

      // 5. Wait for deployment
      this.waitForDeployment()

      console.log(`\\n✅ ${this.config.name} deployment initiated successfully!`)
      console.log(`\\n📝 Next steps:`)
      console.log(`1. Monitor GitHub Actions for deployment status`)
      console.log(`2. Run validation: npm run validate:deployment`)
      console.log(`3. Check deployment URL in GitHub Actions output`)

    } catch (error) {
      console.error(`\\n❌ ${this.config.name} deployment failed:`, error)
      console.log(`\\n📝 Troubleshooting:`)
      console.log(`1. Check git status and resolve conflicts`)
      console.log(`2. Ensure all changes are committed`)
      console.log(`3. Check GitHub Actions logs for more details`)
      throw error
    }
  }
}

async function main() {
  const envArg = process.argv[2] as Environment
  
  if (!envArg || !environments[envArg]) {
    console.log(`
🚀 Environment Deployment Tool

Usage: npx tsx scripts/deploy-environment.ts <environment>

Arguments:
  development  - Deploy to development environment
  staging      - Deploy to staging environment
  production   - Deploy to production environment

Examples:
  npx tsx scripts/deploy-environment.ts development
  npx tsx scripts/deploy-environment.ts staging
  npx tsx scripts/deploy-environment.ts production

Environment Details:
  Development → develop branch → lokals-dev.vercel.app
  Staging     → staging branch → lokals-staging.vercel.app  
  Production  → main branch    → lokals.chat
`)
    process.exit(1)
  }

  try {
    const deployer = new EnvironmentDeployer(envArg)
    await deployer.deploy()
    process.exit(0)
  } catch (error) {
    process.exit(1)
  }
}

main()