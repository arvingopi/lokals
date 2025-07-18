// Rate limiting for API endpoints
import { NextRequest, NextResponse } from "next/server"

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string // Custom error message
}

// In-memory store for rate limiting (use Redis in production for multi-instance)
const store = new Map<string, { count: number; resetTime: number }>()

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (now > value.resetTime) {
      store.delete(key)
    }
  }
}, 10 * 60 * 1000)

export function rateLimit(options: RateLimitOptions) {
  return (request: NextRequest): NextResponse | null => {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    const key = `${ip}:${request.nextUrl.pathname}`
    const now = Date.now()
    
    const record = store.get(key)
    
    if (!record || now > record.resetTime) {
      // First request or window expired
      store.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      })
      return null // Allow request
    }
    
    if (record.count >= options.maxRequests) {
      // Rate limit exceeded
      return NextResponse.json(
        { 
          error: options.message || "Rate limit exceeded",
          retryAfter: Math.ceil((record.resetTime - now) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': options.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
          }
        }
      )
    }
    
    // Increment counter
    record.count++
    store.set(key, record)
    
    return null // Allow request
  }
}

// Predefined rate limiters
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: "Too many API requests, please try again later"
})

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  maxRequests: 5, // 5 session creation attempts per 15 minutes
  message: "Too many session creation attempts, please try again later"
})

export const messageRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 messages per minute
  message: "Message rate limit exceeded, please slow down"
})