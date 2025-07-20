#!/usr/bin/env npx tsx

/**
 * Deployment Checklist Script
 * Runs pre-deployment validation checks to ensure everything is ready
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: string
}

class DeploymentChecker {
  private results: CheckResult[] = []
  private projectRoot: string

  constructor() {
    this.projectRoot = process.cwd()
  }

  private addResult(name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: string) {
    this.results.push({ name, status, message, details })
  }

  private runCommand(command: string): { stdout: string, stderr: string, success: boolean } {
    try {
      const stdout = execSync(command, { encoding: 'utf8', cwd: this.projectRoot })
      return { stdout, stderr: '', success: true }
    } catch (error: any) {
      return { 
        stdout: error.stdout || '', 
        stderr: error.stderr || error.message || '', 
        success: false 
      }
    }
  }

  checkNodeVersion(): void {
    try {
      const result = this.runCommand('node --version')
      if (result.success) {
        const version = result.stdout.trim()
        const majorVersion = parseInt(version.replace('v', '').split('.')[0])
        
        if (majorVersion >= 18) {
          this.addResult('Node Version', 'pass', `Node.js ${version} (compatible)`)
        } else {
          this.addResult('Node Version', 'fail', `Node.js ${version} (requires 18+)`)
        }
      } else {
        this.addResult('Node Version', 'fail', 'Node.js not found')
      }
    } catch (error) {
      this.addResult('Node Version', 'fail', 'Failed to check Node version')
    }
  }

  checkGitStatus(): void {
    try {
      const statusResult = this.runCommand('git status --porcelain')
      const branchResult = this.runCommand('git branch --show-current')
      
      if (statusResult.success && branchResult.success) {
        const hasChanges = statusResult.stdout.trim().length > 0
        const currentBranch = branchResult.stdout.trim()
        
        if (hasChanges) {
          this.addResult('Git Status', 'warning', `Uncommitted changes on ${currentBranch}`, 
            'Consider committing changes before deployment')
        } else {
          this.addResult('Git Status', 'pass', `Clean working directory on ${currentBranch}`)
        }
      } else {
        this.addResult('Git Status', 'fail', 'Not a git repository or git not available')
      }
    } catch (error) {
      this.addResult('Git Status', 'fail', 'Failed to check git status')
    }
  }

  checkDependencies(): void {
    try {
      const packageJsonPath = join(this.projectRoot, 'package.json')
      const packageLockPath = join(this.projectRoot, 'package-lock.json')
      
      if (!existsSync(packageJsonPath)) {
        this.addResult('Dependencies', 'fail', 'package.json not found')
        return
      }

      if (!existsSync(packageLockPath)) {
        this.addResult('Dependencies', 'warning', 'package-lock.json not found', 
          'Run npm install to generate lock file')
        return
      }

      const result = this.runCommand('npm ls --depth=0')
      if (result.success) {
        this.addResult('Dependencies', 'pass', 'All dependencies installed correctly')
      } else {
        this.addResult('Dependencies', 'warning', 'Some dependency issues found', result.stderr)
      }
    } catch (error) {
      this.addResult('Dependencies', 'fail', 'Failed to check dependencies')
    }
  }

  checkLinting(): void {
    try {
      const result = this.runCommand('npm run lint')
      if (result.success) {
        this.addResult('Linting', 'pass', 'No linting errors found')
      } else {
        this.addResult('Linting', 'fail', 'Linting errors found', result.stderr)
      }
    } catch (error) {
      this.addResult('Linting', 'fail', 'Failed to run linting')
    }
  }

  checkTypeScript(): void {
    try {
      const result = this.runCommand('npm run typecheck')
      if (result.success) {
        this.addResult('TypeScript', 'pass', 'No TypeScript errors found')
      } else {
        this.addResult('TypeScript', 'fail', 'TypeScript errors found', result.stderr)
      }
    } catch (error) {
      this.addResult('TypeScript', 'fail', 'Failed to run TypeScript check')
    }
  }

  checkEnvironmentFiles(): void {
    const envFiles = ['.env.local', '.env.development', '.env.staging', '.env.production']
    const foundFiles: string[] = []
    const missingFiles: string[] = []

    envFiles.forEach(file => {
      const filePath = join(this.projectRoot, file)
      if (existsSync(filePath)) {
        foundFiles.push(file)
      } else {
        missingFiles.push(file)
      }
    })

    if (foundFiles.length > 0) {
      this.addResult('Environment Files', 'pass', `Found: ${foundFiles.join(', ')}`)
    } else {
      this.addResult('Environment Files', 'warning', 'No environment files found')
    }

    if (missingFiles.length > 0) {
      this.addResult('Missing Env Files', 'warning', `Missing: ${missingFiles.join(', ')}`,
        'Some environment-specific configs may be missing')
    }
  }

  checkFirebaseConfig(): void {
    try {
      const firebaseFiles = ['firebase.json', 'firestore.rules', 'database.rules.json']
      const foundFiles: string[] = []

      firebaseFiles.forEach(file => {
        if (existsSync(join(this.projectRoot, file))) {
          foundFiles.push(file)
        }
      })

      if (foundFiles.length >= 2) {
        this.addResult('Firebase Config', 'pass', `Found: ${foundFiles.join(', ')}`)
      } else {
        this.addResult('Firebase Config', 'warning', 'Some Firebase config files missing')
      }

      // Check for Firebase admin keys
      const adminKeyFiles = ['firebase-admin-key.json', 'firebase-dev-key.json', 'firebase-staging-key.json']
      const foundKeyFiles = adminKeyFiles.filter(file => existsSync(join(this.projectRoot, file)))

      if (foundKeyFiles.length > 0) {
        this.addResult('Firebase Admin Keys', 'pass', `Found ${foundKeyFiles.length} key files`)
      } else {
        this.addResult('Firebase Admin Keys', 'warning', 'No Firebase admin key files found',
          'Make sure environment variables are set for production')
      }
    } catch (error) {
      this.addResult('Firebase Config', 'fail', 'Failed to check Firebase configuration')
    }
  }

  checkBuildProcess(): void {
    try {
      console.log('Running build process (this may take a moment)...')
      const result = this.runCommand('npm run build')
      
      if (result.success) {
        this.addResult('Build Process', 'pass', 'Build completed successfully')
      } else {
        this.addResult('Build Process', 'fail', 'Build failed', result.stderr)
      }
    } catch (error) {
      this.addResult('Build Process', 'fail', 'Failed to run build process')
    }
  }

  checkVercelConfig(): void {
    try {
      const vercelJsonPath = join(this.projectRoot, 'vercel.json')
      const vercelProjectPath = join(this.projectRoot, '.vercel/project.json')

      if (existsSync(vercelJsonPath)) {
        this.addResult('Vercel Config', 'pass', 'vercel.json found')
      } else {
        this.addResult('Vercel Config', 'warning', 'vercel.json not found')
      }

      if (existsSync(vercelProjectPath)) {
        this.addResult('Vercel Project', 'pass', 'Vercel project configured')
      } else {
        this.addResult('Vercel Project', 'warning', 'Vercel project not linked',
          'Run "vercel link" if deploying to Vercel')
      }
    } catch (error) {
      this.addResult('Vercel Config', 'fail', 'Failed to check Vercel configuration')
    }
  }

  checkGitHubActions(): void {
    try {
      const workflowPath = join(this.projectRoot, '.github/workflows/deploy.yml')
      
      if (existsSync(workflowPath)) {
        const workflowContent = readFileSync(workflowPath, 'utf8')
        
        // Check for permissions block
        if (workflowContent.includes('permissions:')) {
          this.addResult('GitHub Actions', 'pass', 'Deployment workflow with permissions found')
        } else {
          this.addResult('GitHub Actions', 'warning', 'Workflow found but no permissions block')
        }
        
        // Check for proper secrets usage
        if (workflowContent.includes('FIREBASE_SERVICE_ACCOUNT_KEY')) {
          this.addResult('Firebase Integration', 'pass', 'Firebase secrets configured in workflow')
        } else {
          this.addResult('Firebase Integration', 'warning', 'Firebase secrets not found in workflow')
        }
      } else {
        this.addResult('GitHub Actions', 'warning', 'No GitHub Actions workflow found')
      }
    } catch (error) {
      this.addResult('GitHub Actions', 'fail', 'Failed to check GitHub Actions')
    }
  }

  checkSecurity(): void {
    try {
      // Check if security validation script exists
      const securityScript = join(this.projectRoot, 'scripts/check-security.ts')
      if (existsSync(securityScript)) {
        this.addResult('Security Scripts', 'pass', 'Security validation tools available')
        
        // Run quick security check if possible
        try {
          const result = this.runCommand('npx tsx scripts/check-security.ts')
          if (result.success) {
            this.addResult('Security Validation', 'pass', 'Security checks passed')
          } else {
            this.addResult('Security Validation', 'warning', 'Security issues found', 
              'Run: npx tsx scripts/check-security.ts for details')
          }
        } catch {
          this.addResult('Security Validation', 'warning', 'Could not run security checks',
            'Run manually: npx tsx scripts/check-security.ts')
        }
      } else {
        this.addResult('Security Scripts', 'warning', 'Security validation scripts not found')
      }

      // Check for common security files
      const securityFiles = ['.github/workflows/deploy.yml', 'scripts/setup-security.ts']
      const foundSecurityFiles = securityFiles.filter(file => existsSync(join(this.projectRoot, file)))
      
      if (foundSecurityFiles.length >= 2) {
        this.addResult('Security Infrastructure', 'pass', 'Security infrastructure in place')
      } else {
        this.addResult('Security Infrastructure', 'warning', 'Limited security infrastructure')
      }
    } catch (error) {
      this.addResult('Security Check', 'fail', 'Failed to check security configuration')
    }
  }

  async runAllChecks(skipBuild: boolean = false): Promise<void> {
    console.log('🔍 Running Pre-Deployment Checklist')
    console.log('===================================\\n')

    console.log('📋 Checking system requirements...')
    this.checkNodeVersion()
    
    console.log('📋 Checking git status...')
    this.checkGitStatus()
    
    console.log('📋 Checking dependencies...')
    this.checkDependencies()
    
    console.log('📋 Checking code quality...')
    this.checkLinting()
    this.checkTypeScript()
    
    console.log('📋 Checking configuration...')
    this.checkEnvironmentFiles()
    this.checkFirebaseConfig()
    this.checkVercelConfig()
    this.checkGitHubActions()
    
    console.log('📋 Checking security...')
    this.checkSecurity()
    
    if (!skipBuild) {
      console.log('📋 Testing build process...')
      this.checkBuildProcess()
    }
  }

  printResults(): void {
    console.log('\\n📊 Checklist Results')
    console.log('====================\\n')

    const passed = this.results.filter(r => r.status === 'pass').length
    const warnings = this.results.filter(r => r.status === 'warning').length
    const failed = this.results.filter(r => r.status === 'fail').length

    this.results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'
      console.log(`${icon} ${result.name}: ${result.message}`)
      
      if (result.details) {
        console.log(`   ${result.details}`)
      }
    })

    console.log(`\\n📈 Summary: ${passed} passed, ${warnings} warnings, ${failed} failed`)

    if (failed > 0) {
      console.log('\\n❌ Deployment readiness: NOT READY')
      console.log('Please fix the failed checks before deploying.')
      return
    }

    if (warnings > 0) {
      console.log('\\n⚠️ Deployment readiness: READY WITH WARNINGS')
      console.log('Consider addressing warnings before deploying.')
      return
    }

    console.log('\\n✅ Deployment readiness: READY')
    console.log('All checks passed! Ready for deployment.')
  }

  getOverallStatus(): 'ready' | 'warnings' | 'not-ready' {
    const failed = this.results.filter(r => r.status === 'fail').length
    const warnings = this.results.filter(r => r.status === 'warning').length

    if (failed > 0) return 'not-ready'
    if (warnings > 0) return 'warnings'
    return 'ready'
  }
}

async function main() {
  const skipBuild = process.argv.includes('--skip-build')
  
  if (process.argv.includes('--help')) {
    console.log(`
🔍 Deployment Checklist Tool

Usage: npx tsx scripts/deployment-checklist.ts [options]

Options:
  --skip-build    Skip the build process check (faster)
  --help          Show this help message

Examples:
  npx tsx scripts/deployment-checklist.ts
  npx tsx scripts/deployment-checklist.ts --skip-build
`)
    process.exit(0)
  }

  try {
    const checker = new DeploymentChecker()
    await checker.runAllChecks(skipBuild)
    checker.printResults()

    const status = checker.getOverallStatus()
    process.exit(status === 'not-ready' ? 1 : 0)
  } catch (error) {
    console.error('\\n❌ Checklist failed:', error)
    process.exit(1)
  }
}

main()