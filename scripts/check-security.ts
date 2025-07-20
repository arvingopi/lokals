#!/usr/bin/env npx tsx

/**
 * Security Validation Script
 * Checks if repository security configuration is properly set up for safe CI/CD deployment
 */

import { execSync } from 'child_process'

interface SecurityCheck {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: string
  critical: boolean
}

class SecurityValidator {
  private results: SecurityCheck[] = []
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

  private addResult(name: string, status: 'pass' | 'fail' | 'warning', message: string, critical: boolean = false, details?: string) {
    this.results.push({ name, status, message, details, critical })
  }

  private runCommand(command: string): { stdout: string, stderr: string, success: boolean } {
    try {
      const stdout = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
      return { stdout, stderr: '', success: true }
    } catch (error: any) {
      return { 
        stdout: error.stdout || '', 
        stderr: error.stderr || error.message || '', 
        success: false 
      }
    }
  }

  checkGitHubCLI(): void {
    try {
      const result = this.runCommand('gh --version')
      if (result.success) {
        this.addResult('GitHub CLI', 'pass', 'GitHub CLI is available')
      } else {
        this.addResult('GitHub CLI', 'fail', 'GitHub CLI not found', true, 
          'Install from: https://cli.github.com/')
      }

      // Check authentication
      const authResult = this.runCommand('gh auth status')
      if (authResult.success) {
        this.addResult('GitHub Authentication', 'pass', 'GitHub CLI is authenticated')
      } else {
        this.addResult('GitHub Authentication', 'fail', 'GitHub CLI not authenticated', true,
          'Run: gh auth login')
      }
    } catch (error) {
      this.addResult('GitHub CLI', 'fail', 'Failed to check GitHub CLI', true)
    }
  }

  checkBranchProtection(): void {
    const branches = ['main', 'staging', 'develop']
    
    branches.forEach(branch => {
      try {
        const result = this.runCommand(`gh api repos/${this.repoOwner}/${this.repoName}/branches/${branch}/protection`)
        
        if (result.success) {
          try {
            const protection = JSON.parse(result.stdout)
            const hasReviews = !!protection.required_pull_request_reviews
            const hasStatusChecks = !!protection.required_status_checks
            const allowsForcePush = protection.allow_force_pushes?.enabled
            
            if (branch === 'main') {
              // Main branch should have strict protection
              if (hasReviews && hasStatusChecks && !allowsForcePush) {
                this.addResult(`${branch} Protection`, 'pass', 'Comprehensive protection enabled')
              } else {
                this.addResult(`${branch} Protection`, 'warning', 'Partial protection configured', true,
                  'Production branch should require reviews, status checks, and disallow force pushes')
              }
            } else {
              // Other branches need at least basic protection
              this.addResult(`${branch} Protection`, 'pass', 'Branch protection enabled')
            }
          } catch {
            this.addResult(`${branch} Protection`, 'warning', 'Protection exists but format unclear')
          }
        } else {
          const critical = branch === 'main'
          this.addResult(`${branch} Protection`, critical ? 'fail' : 'warning', 
            `No branch protection found`, critical,
            critical ? 'Production branch must be protected' : 'Consider adding protection')
        }
      } catch (error) {
        this.addResult(`${branch} Protection`, 'fail', `Failed to check protection: ${error}`)
      }
    })
  }

  checkActionsPermissions(): void {
    try {
      const result = this.runCommand(`gh api repos/${this.repoOwner}/${this.repoName}/actions/permissions/workflow`)
      
      if (result.success) {
        try {
          const permissions = JSON.parse(result.stdout)
          const defaultPerms = permissions.default_workflow_permissions
          const canApprove = permissions.can_approve_pull_request_reviews
          
          if (defaultPerms === 'read') {
            this.addResult('Default Workflow Permissions', 'pass', 'Set to read-only (secure)')
          } else {
            this.addResult('Default Workflow Permissions', 'warning', `Set to ${defaultPerms}`, false,
              'Consider setting to read-only for better security')
          }
          
          if (canApprove) {
            this.addResult('PR Approval Permission', 'pass', 'Actions can approve PRs')
          } else {
            this.addResult('PR Approval Permission', 'warning', 'Actions cannot approve PRs')
          }
        } catch {
          this.addResult('Actions Permissions', 'warning', 'Could not parse permissions response')
        }
      } else {
        this.addResult('Actions Permissions', 'fail', 'Failed to check Actions permissions')
      }
    } catch (error) {
      this.addResult('Actions Permissions', 'fail', `Error checking permissions: ${error}`)
    }
  }

  checkRequiredSecrets(): void {
    try {
      const result = this.runCommand('gh secret list --json name --jq ".[].name"')
      
      if (result.success) {
        const existingSecrets = result.stdout.split('\\n').filter(s => s.trim())
        
        const requiredSecrets = [
          { name: 'VERCEL_ORG_ID', critical: true, description: 'Vercel organization ID' },
          { name: 'VERCEL_PROJECT_ID', critical: true, description: 'Vercel project ID' },
          { name: 'VERCEL_TOKEN', critical: true, description: 'Vercel deployment token' },
          { name: 'FIREBASE_SERVICE_ACCOUNT_KEY_DEV', critical: true, description: 'Firebase dev environment key' },
          { name: 'FIREBASE_SERVICE_ACCOUNT_KEY_STAGING', critical: true, description: 'Firebase staging environment key' },
          { name: 'FIREBASE_SERVICE_ACCOUNT_KEY_PROD', critical: true, description: 'Firebase production environment key' }
        ]

        let allCriticalPresent = true
        let missingCritical: string[] = []

        requiredSecrets.forEach(secret => {
          if (existingSecrets.includes(secret.name)) {
            this.addResult(`Secret: ${secret.name}`, 'pass', 'Configured')
          } else {
            const status = secret.critical ? 'fail' : 'warning'
            this.addResult(`Secret: ${secret.name}`, status, 'Missing', secret.critical, secret.description)
            
            if (secret.critical) {
              allCriticalPresent = false
              missingCritical.push(secret.name)
            }
          }
        })

        if (allCriticalPresent) {
          this.addResult('Required Secrets', 'pass', 'All critical secrets configured')
        } else {
          this.addResult('Required Secrets', 'fail', `${missingCritical.length} critical secrets missing`, true,
            `Missing: ${missingCritical.join(', ')}`)
        }
      } else {
        this.addResult('Secrets Check', 'fail', 'Failed to list repository secrets')
      }
    } catch (error) {
      this.addResult('Secrets Check', 'fail', `Error checking secrets: ${error}`)
    }
  }

  checkWorkflowFile(): void {
    try {
      const workflowPath = '.github/workflows/deploy.yml'
      const result = this.runCommand(`cat ${workflowPath}`)
      
      if (result.success) {
        const content = result.stdout
        
        // Check for permissions block
        if (content.includes('permissions:')) {
          if (content.includes('pull-requests: write') && content.includes('issues: write')) {
            this.addResult('Workflow Permissions', 'pass', 'Proper permissions configured')
          } else {
            this.addResult('Workflow Permissions', 'warning', 'Permissions block exists but may be incomplete')
          }
        } else {
          this.addResult('Workflow Permissions', 'fail', 'No permissions block found', true,
            'Workflow needs explicit permissions for PR comments')
        }

        // Check for Firebase secrets usage
        const hasFirebaseSecrets = content.includes('FIREBASE_SERVICE_ACCOUNT_KEY')
        if (hasFirebaseSecrets) {
          this.addResult('Firebase Integration', 'pass', 'Firebase secrets referenced in workflow')
        } else {
          this.addResult('Firebase Integration', 'warning', 'No Firebase secrets found in workflow')
        }

        // Check for proper error handling
        const hasErrorHandling = content.includes('continue-on-error') || content.includes('try {')
        if (hasErrorHandling) {
          this.addResult('Error Handling', 'pass', 'Error handling present in workflow')
        } else {
          this.addResult('Error Handling', 'warning', 'Limited error handling in workflow')
        }

      } else {
        this.addResult('Workflow File', 'fail', 'Deployment workflow not found', true,
          'Create .github/workflows/deploy.yml')
      }
    } catch (error) {
      this.addResult('Workflow File', 'fail', `Error checking workflow: ${error}`)
    }
  }

  checkRepositorySettings(): void {
    try {
      const result = this.runCommand(`gh api repos/${this.repoOwner}/${this.repoName}`)
      
      if (result.success) {
        const repo = JSON.parse(result.stdout)
        
        // Check if repository is private
        if (repo.private) {
          this.addResult('Repository Visibility', 'pass', 'Private repository (more secure)')
        } else {
          this.addResult('Repository Visibility', 'warning', 'Public repository', false,
            'Public repos have additional security considerations')
        }

        // Check if issues/PRs are enabled
        if (repo.has_issues) {
          this.addResult('Issues Enabled', 'pass', 'Issues enabled for workflow comments')
        } else {
          this.addResult('Issues Enabled', 'warning', 'Issues disabled - may affect workflow comments')
        }

      } else {
        this.addResult('Repository Settings', 'warning', 'Could not check repository settings')
      }
    } catch (error) {
      this.addResult('Repository Settings', 'warning', `Error checking settings: ${error}`)
    }
  }

  async runAllChecks(): Promise<void> {
    console.log('🔒 Security Configuration Validation')
    console.log('====================================\\n')

    console.log('🔍 Checking prerequisites...')
    this.checkGitHubCLI()
    
    console.log('🔍 Checking branch protection...')
    this.checkBranchProtection()
    
    console.log('🔍 Checking GitHub Actions permissions...')
    this.checkActionsPermissions()
    
    console.log('🔍 Checking required secrets...')
    this.checkRequiredSecrets()
    
    console.log('🔍 Checking workflow configuration...')
    this.checkWorkflowFile()
    
    console.log('🔍 Checking repository settings...')
    this.checkRepositorySettings()
  }

  printResults(): void {
    console.log('\\n📊 Security Validation Results')
    console.log('===============================\\n')

    const passed = this.results.filter(r => r.status === 'pass').length
    const warnings = this.results.filter(r => r.status === 'warning').length
    const failed = this.results.filter(r => r.status === 'fail').length
    const critical = this.results.filter(r => r.status === 'fail' && r.critical).length

    this.results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'
      const criticalMark = result.critical ? ' [CRITICAL]' : ''
      console.log(`${icon} ${result.name}: ${result.message}${criticalMark}`)
      
      if (result.details) {
        console.log(`   ${result.details}`)
      }
    })

    console.log(`\\n📈 Summary: ${passed} passed, ${warnings} warnings, ${failed} failed`)
    if (critical > 0) {
      console.log(`⚠️ Critical issues: ${critical}`)
    }

    if (critical > 0) {
      console.log('\\n❌ Security readiness: NOT READY')
      console.log('Critical security issues must be resolved before deployment.')
      console.log('\\n🔧 Quick fix: npx tsx scripts/setup-security.ts')
      return
    }

    if (failed > 0) {
      console.log('\\n⚠️ Security readiness: ISSUES FOUND')
      console.log('Address failed checks before deploying to production.')
      return
    }

    if (warnings > 0) {
      console.log('\\n✅ Security readiness: READY WITH WARNINGS')
      console.log('Deployment can proceed, but consider addressing warnings.')
      return
    }

    console.log('\\n✅ Security readiness: FULLY READY')
    console.log('All security checks passed! Safe for deployment.')
  }

  getOverallStatus(): 'ready' | 'warnings' | 'issues' | 'critical' {
    const critical = this.results.filter(r => r.status === 'fail' && r.critical).length
    const failed = this.results.filter(r => r.status === 'fail').length
    const warnings = this.results.filter(r => r.status === 'warning').length

    if (critical > 0) return 'critical'
    if (failed > 0) return 'issues'
    if (warnings > 0) return 'warnings'
    return 'ready'
  }
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log(`
🔒 Security Configuration Validation Tool

Usage: npx tsx scripts/check-security.ts [options]

Options:
  --help    Show this help message

What this script checks:
1. GitHub CLI availability and authentication
2. Branch protection rules for main, staging, develop branches
3. GitHub Actions permissions configuration
4. Required secrets (Vercel, Firebase service accounts)
5. Workflow file permissions and error handling
6. Repository security settings

Prerequisites:
- GitHub CLI (gh) must be installed and authenticated
- Internet connection for GitHub API calls

Examples:
  npx tsx scripts/check-security.ts
`)
    process.exit(0)
  }

  try {
    const validator = new SecurityValidator()
    await validator.runAllChecks()
    validator.printResults()

    const status = validator.getOverallStatus()
    process.exit(status === 'critical' ? 2 : status === 'issues' ? 1 : 0)
  } catch (error) {
    console.error('\\n❌ Security validation failed:', error)
    process.exit(1)
  }
}

main()