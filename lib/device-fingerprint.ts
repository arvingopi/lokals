// Device fingerprinting implementation for anonymous session persistence
import { createHash } from 'crypto'

interface FingerprintComponents {
  canvas: string
  webgl: string
  screen: string
  hardware: string
  browser: string
  timezone: string
}

// Canvas fingerprinting - creates unique signature based on rendering
async function getCanvasFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return ''
  
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    
    canvas.width = 280
    canvas.height = 60
    
    // Draw complex scene to get unique rendering
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, 280, 60)
    
    // Text with various styles
    ctx.fillStyle = '#333'
    ctx.font = '14px Arial'
    ctx.fillText('Lokals Chat 🌍', 10, 20)
    
    ctx.font = 'italic 16px Times'
    ctx.fillText('Anonymous & Secure', 10, 40)
    
    // Geometric shapes
    ctx.beginPath()
    ctx.arc(240, 30, 20, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(50, 150, 250, 0.7)'
    ctx.fill()
    
    // Get data URL and extract base64
    const dataURL = canvas.toDataURL()
    return dataURL.substring(dataURL.indexOf(',') + 1)
  } catch (error) {
    console.error('Canvas fingerprinting failed:', error)
    return ''
  }
}

// WebGL fingerprinting - GPU and graphics info
async function getWebGLFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return ''
  
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return ''
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'N/A'
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'N/A'
    
    return `${vendor}~${renderer}`
  } catch (error) {
    console.error('WebGL fingerprinting failed:', error)
    return ''
  }
}

// Screen information
function getScreenFingerprint(): string {
  if (typeof window === 'undefined') return ''
  
  const screen = window.screen
  return [
    screen.width,
    screen.height,
    screen.colorDepth,
    screen.pixelDepth,
    window.devicePixelRatio || 1
  ].join('~')
}

// Hardware information
function getHardwareInfo(): string {
  if (typeof navigator === 'undefined') return ''
  
  return [
    navigator.hardwareConcurrency || 0,
    navigator.deviceMemory || 0,
    navigator.maxTouchPoints || 0
  ].join('~')
}

// Browser information
function getBrowserInfo(): string {
  if (typeof navigator === 'undefined') return ''
  
  return [
    navigator.language,
    navigator.languages?.join(',') || '',
    navigator.platform,
    navigator.userAgent
  ].join('~')
}

// Timezone information
function getTimezoneInfo(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const offset = new Date().getTimezoneOffset()
    return `${timezone}~${offset}`
  } catch {
    return 'UTC~0'
  }
}

// Hash components to create fingerprint
function hashComponents(components: FingerprintComponents): string {
  const combinedString = Object.values(components).join('|')
  
  // Use SubtleCrypto if available (browser), otherwise Node crypto
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    // Browser environment - return promise
    return ''  // Will be handled by the async function
  } else {
    // Node environment or fallback
    return createHash('sha256').update(combinedString).digest('hex')
  }
}

// Browser-compatible hashing
async function hashComponentsAsync(components: FingerprintComponents): Promise<string> {
  const combinedString = Object.values(components).join('|')
  
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const msgBuffer = new TextEncoder().encode(combinedString)
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } else {
    return createHash('sha256').update(combinedString).digest('hex')
  }
}

// Main fingerprinting function
export async function getDeviceFingerprint(): Promise<string> {
  try {
    const components: FingerprintComponents = {
      canvas: await getCanvasFingerprint(),
      webgl: await getWebGLFingerprint(),
      screen: getScreenFingerprint(),
      hardware: getHardwareInfo(),
      browser: getBrowserInfo(),
      timezone: getTimezoneInfo()
    }
    
    console.log('🧬 Fingerprint components:', {
      canvas: components.canvas.substring(0, 16) + '...',
      webgl: components.webgl,
      screen: components.screen,
      hardware: components.hardware,
      timezone: components.timezone
    })
    
    // Generate hash from components
    const fingerprint = await hashComponentsAsync(components)
    
    console.log('🔑 Generated fingerprint:', fingerprint.substring(0, 8) + '...')
    
    // Store in localStorage for quick access (shared across tabs)
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('device_fingerprint', fingerprint)
      console.log('💾 Cached fingerprint to localStorage')
    }
    
    return fingerprint
  } catch (error) {
    console.error('Device fingerprinting failed:', error)
    // Return a fallback fingerprint based on basic info
    const fallback = `${navigator.userAgent}~${screen.width}x${screen.height}`
    return createHash('sha256').update(fallback).digest('hex')
  }
}

// Get cached fingerprint or generate new one
export async function getCachedFingerprint(): Promise<string> {
  if (typeof window !== 'undefined' && window.localStorage) {
    const cached = window.localStorage.getItem('device_fingerprint')
    if (cached) {
      console.log('✅ Using cached fingerprint:', cached.substring(0, 8) + '...')
      return cached
    }
  }
  
  console.log('🔄 No cached fingerprint found, generating new one...')
  return getDeviceFingerprint()
}

// Similarity scoring for fingerprint changes (future use)
export function calculateSimilarity(fp1: string, fp2: string): number {
  if (fp1 === fp2) return 1.0
  
  // Simple character-based similarity (can be improved)
  let matches = 0
  const minLength = Math.min(fp1.length, fp2.length)
  
  for (let i = 0; i < minLength; i++) {
    if (fp1[i] === fp2[i]) matches++
  }
  
  return matches / Math.max(fp1.length, fp2.length)
}