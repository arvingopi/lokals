#!/usr/bin/env npx tsx

/**
 * Repository Security Setup Script
 * Configures branch protection rules and GitHub Actions permissions for secure CI/CD
 */

import { execSync } from 'child_process'

interface BranchProtectionConfig {
  branch: string
  description: string
  rules: {
    required_status_checks?: {
      strict: boolean
      contexts: string[]
    }
    enforce_admins: boolean
    required_pull_request_reviews?: {
      required_approving_review_count: number
      dismiss_stale_reviews: boolean
      require_code_owner_reviews: boolean
    }
    restrictions?: {
      users: string[]
      teams: string[]
    }
    allow_force_pushes: boolean
    allow_deletions: boolean
  }
}

class SecuritySetup {
  private repoOwner: string
  private repoName: string

  constructor() {
    // Get repository info from git remote
    try {
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim()
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
      if (!match) {
        throw new Error('Could not parse repository information from git remote')
      }
      this.repoOwner = match[1]
      this.repoName = match[2]
    } catch (error) {
      throw new Error(`Failed to get repository info: ${error}`)
    }
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

  private async checkGitHubCLI(): Promise<void> {
    try {
      this.runCommand('gh --version')
      console.log('✅ GitHub CLI is available')
    } catch {
      throw new Error('GitHub CLI (gh) is required but not found. Please install: https://cli.github.com/')
    }

    // Check if authenticated
    try {
      this.runCommand('gh auth status')
      console.log('✅ GitHub CLI is authenticated')
    } catch {
      throw new Error('GitHub CLI is not authenticated. Please run: gh auth login')
    }
  }

  private getBranchProtectionConfigs(): BranchProtectionConfig[] {
    return [
      {
        branch: 'main',
        description: 'Production branch - strictest protection',
        rules: {
          required_status_checks: {
            strict: true,
            contexts: ['deploy']
          },
          enforce_admins: false, // Allow admins to bypass for emergency fixes
          required_pull_request_reviews: {
            required_approving_review_count: 1,
            dismiss_stale_reviews: true,
            require_code_owner_reviews: false
          },
          allow_force_pushes: false,
          allow_deletions: false
        }
      },
      {
        branch: 'staging',
        description: 'Staging branch - moderate protection',
        rules: {
          required_status_checks: {
            strict: true,
            contexts: ['deploy']
          },
          enforce_admins: false,
          required_pull_request_reviews: {
            required_approving_review_count: 1,
            dismiss_stale_reviews: true,
            require_code_owner_reviews: false
          },
          allow_force_pushes: false,
          allow_deletions: false
        }
      },
      {
        branch: 'develop',
        description: 'Development branch - basic protection',
        rules: {
          required_status_checks: {
            strict: false,
            contexts: ['deploy']
          },
          enforce_admins: false,
          allow_force_pushes: false,
          allow_deletions: false
        }
      }
    ]
  }

  private async setupBranchProtection(config: BranchProtectionConfig): Promise<void> {
    console.log(`\\n🛡️ Setting up protection for ${config.branch} branch`)
    console.log(`   ${config.description}`)

    try {
      // Check if branch exists
      const branches = this.runCommand('gh api repos/:owner/:repo/branches --jq ".[].name"')
      if (!branches.includes(config.branch)) {
        console.log(`⚠️ Branch '${config.branch}' does not exist, skipping protection setup`)
        return
      }

      // Create the protection rule
      const protectionData = {
        required_status_checks: config.rules.required_status_checks || null,
        enforce_admins: config.rules.enforce_admins,
        required_pull_request_reviews: config.rules.required_pull_request_reviews || null,
        restrictions: config.rules.restrictions || null,
        allow_force_pushes: config.rules.allow_force_pushes,
        allow_deletions: config.rules.allow_deletions
      }

      const command = `gh api repos/${this.repoOwner}/${this.repoName}/branches/${config.branch}/protection -X PUT --input -`
      
      execSync(command, { 
        input: JSON.stringify(protectionData),
        encoding: 'utf8',
        stdio: 'pipe'
      })

      console.log(`✅ Protection rules applied to ${config.branch}`)

    } catch (error: any) {
      if (error.message.includes('branch not found')) {
        console.log(`⚠️ Branch '${config.branch}' not found, skipping`)
      } else {
        console.error(`❌ Failed to protect ${config.branch}: ${error.message}`)
      }
    }
  }

  private async configureActionsPermissions(): Promise<void> {
    console.log(`\\n🔧 Configuring GitHub Actions permissions`)

    try {
      // Set default workflow permissions to read
      const workflowPermissions = {
        default_workflow_permissions: 'read',
        can_approve_pull_request_reviews: true
      }

      const command = `gh api repos/${this.repoOwner}/${this.repoName}/actions/permissions/workflow -X PUT --input -`
      
      execSync(command, {
        input: JSON.stringify(workflowPermissions),
        encoding: 'utf8',
        stdio: 'pipe'
      })

      console.log(`✅ GitHub Actions permissions configured`)
      console.log(`   - Default workflow permissions: read`)
      console.log(`   - Can approve pull request reviews: true`)

    } catch (error: any) {
      console.error(`❌ Failed to configure Actions permissions: ${error.message}`)
    }
  }

  private async checkSecrets(): Promise<void> {
    console.log(`\\n🔍 Checking repository secrets`)

    try {
      const secrets = this.runCommand('gh secret list --json name --jq ".[].name"')
      const secretList = secrets.split('\\n').filter(s => s.trim())

      const requiredSecrets = [
        'VERCEL_ORG_ID',
        'VERCEL_PROJECT_ID', 
        'VERCEL_TOKEN',
        'FIREBASE_SERVICE_ACCOUNT_KEY_DEV',
        'FIREBASE_SERVICE_ACCOUNT_KEY_STAGING',
        'FIREBASE_SERVICE_ACCOUNT_KEY_PROD'
      ]

      console.log(`📋 Required secrets checklist:`)
      const missingSecrets: string[] = []

      requiredSecrets.forEach(secret => {
        if (secretList.includes(secret)) {
          console.log(`   ✅ ${secret}`)
        } else {
          console.log(`   ❌ ${secret} (MISSING)`)
          missingSecrets.push(secret)
        }
      })

      if (missingSecrets.length > 0) {
        console.log(`\\n⚠️ Missing secrets need to be added manually:`)
        missingSecrets.forEach(secret => {
          console.log(`   gh secret set ${secret} --body "your_secret_value"`)
        })
      } else {
        console.log(`\\n✅ All required secrets are configured`)
      }

    } catch (error: any) {
      console.error(`❌ Failed to check secrets: ${error.message}`)
    }
  }

  private async validateSetup(): Promise<void> {
    console.log(`\\n🔍 Validating security setup`)

    try {
      // Check branch protection
      const branches = ['main', 'staging', 'develop']
      for (const branch of branches) {
        try {
          this.runCommand(`gh api repos/${this.repoOwner}/${this.repoName}/branches/${branch}/protection`)
          console.log(`   ✅ ${branch} branch is protected`)
        } catch {
          console.log(`   ⚠️ ${branch} branch protection not found`)
        }
      }

      // Check Actions permissions
      try {
        const permissions = this.runCommand(`gh api repos/${this.repoOwner}/${this.repoName}/actions/permissions/workflow`)
        console.log(`   ✅ GitHub Actions permissions configured`)
      } catch {
        console.log(`   ⚠️ GitHub Actions permissions check failed`)
      }

    } catch (error: any) {
      console.error(`❌ Validation failed: ${error.message}`)
    }
  }

  async setup(): Promise<void> {
    console.log(`🔐 Repository Security Setup`)
    console.log(`==============================`)
    console.log(`Repository: ${this.repoOwner}/${this.repoName}\\n`)

    try {
      // 1. Check prerequisites
      await this.checkGitHubCLI()

      // 2. Setup branch protection
      console.log(`\\n🛡️ Setting up branch protection rules`)
      const configs = this.getBranchProtectionConfigs()
      for (const config of configs) {
        await this.setupBranchProtection(config)
      }

      // 3. Configure Actions permissions
      await this.configureActionsPermissions()

      // 4. Check secrets
      await this.checkSecrets()

      // 5. Validate setup
      await this.validateSetup()

      console.log(`\\n✅ Security setup completed!`)
      console.log(`\\n📝 Next steps:`)
      console.log(`1. Add any missing secrets using the commands shown above`)
      console.log(`2. Test the deployment pipeline: npm run check:deployment`)
      console.log(`3. Run the /deploy command to test the complete workflow`)

    } catch (error) {
      console.error(`\\n❌ Security setup failed:`, error)
      console.log(`\\n📝 Manual setup required:`)
      console.log(`1. Go to repository Settings > Branches`)
      console.log(`2. Add protection rules for main, staging, develop branches`)
      console.log(`3. Go to Settings > Actions > General`)
      console.log(`4. Set workflow permissions to 'read' with PR approval enabled`)
      console.log(`5. Add missing secrets in Settings > Secrets and variables > Actions`)
      throw error
    }
  }
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log(`
🔐 Repository Security Setup Tool

Usage: npx tsx scripts/setup-security.ts [options]

Options:
  --help    Show this help message

What this script does:
1. Sets up branch protection rules for main, staging, and develop branches
2. Configures GitHub Actions default permissions (read-only)
3. Enables pull request review approval for Actions
4. Validates that required secrets are configured

Prerequisites:
- GitHub CLI (gh) must be installed and authenticated
- Repository admin permissions required
- Internet connection for GitHub API calls

Examples:
  npx tsx scripts/setup-security.ts
`)
    process.exit(0)
  }

  try {
    const setup = new SecuritySetup()
    await setup.setup()
    process.exit(0)
  } catch (error) {
    process.exit(1)
  }
}

main()