// Input validation utilities
import { NextRequest } from "next/server"

export interface ValidationError {
  field: string
  message: string
}

export class ValidationException extends Error {
  public errors: ValidationError[]
  
  constructor(errors: ValidationError[]) {
    super("Validation failed")
    this.errors = errors
    this.name = "ValidationException"
  }
}

// Sanitize and validate text input
export function validateText(text: string, fieldName: string, maxLength = 500): string {
  const errors: ValidationError[] = []
  
  if (!text || typeof text !== 'string') {
    errors.push({ field: fieldName, message: `${fieldName} is required` })
  } else {
    // Trim and sanitize
    text = text.trim()
    
    if (text.length === 0) {
      errors.push({ field: fieldName, message: `${fieldName} cannot be empty` })
    } else if (text.length > maxLength) {
      errors.push({ field: fieldName, message: `${fieldName} cannot exceed ${maxLength} characters` })
    }
    
    // Check for malicious content
    if (containsHtml(text)) {
      errors.push({ field: fieldName, message: `${fieldName} contains invalid characters` })
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationException(errors)
  }
  
  return text
}

// Validate user ID format
export function validateUserId(userId: string): string {
  const errors: ValidationError[] = []
  
  if (!userId || typeof userId !== 'string') {
    errors.push({ field: 'userId', message: 'User ID is required' })
  } else {
    // User ID should match pattern: user_[random]_[random]
    const userIdPattern = /^user_[a-z0-9]+_[a-z0-9]+$/
    if (!userIdPattern.test(userId)) {
      errors.push({ field: 'userId', message: 'Invalid user ID format' })
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationException(errors)
  }
  
  return userId
}

// Validate username
export function validateUsername(username: string): string {
  const errors: ValidationError[] = []
  
  if (!username || typeof username !== 'string') {
    errors.push({ field: 'username', message: 'Username is required' })
  } else {
    username = username.trim()
    
    if (username.length < 3) {
      errors.push({ field: 'username', message: 'Username must be at least 3 characters' })
    } else if (username.length > 50) {
      errors.push({ field: 'username', message: 'Username cannot exceed 50 characters' })
    }
    
    // Username should only contain letters, numbers, and safe characters
    const usernamePattern = /^[a-zA-Z0-9_-]+$/
    if (!usernamePattern.test(username)) {
      errors.push({ field: 'username', message: 'Username can only contain letters, numbers, hyphens, and underscores' })
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationException(errors)
  }
  
  return username
}

// Validate zipcode/postal code
export function validateZipcode(zipcode: string): string {
  const errors: ValidationError[] = []
  
  if (!zipcode || typeof zipcode !== 'string') {
    errors.push({ field: 'zipcode', message: 'Zipcode is required' })
  } else {
    zipcode = zipcode.trim().toUpperCase()
    
    // US Zipcode (5 digits) or Canadian Postal Code (A1A 1A1 or A1A1A1)
    const usZipPattern = /^\d{5}$/
    const canadianPostalPattern = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/
    
    if (!usZipPattern.test(zipcode) && !canadianPostalPattern.test(zipcode)) {
      errors.push({ field: 'zipcode', message: 'Invalid zipcode format (use 12345 or A1A 1A1)' })
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationException(errors)
  }
  
  return zipcode
}

// Check for HTML/script injection
function containsHtml(text: string): boolean {
  const htmlPattern = /<[^>]*>/g
  const scriptPattern = /(javascript:|data:|vbscript:|on\w+\s*=)/i
  
  return htmlPattern.test(text) || scriptPattern.test(text)
}

// Validate request body size
export function validateRequestSize(request: NextRequest, maxSize = 1024 * 10): boolean {
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > maxSize) {
    throw new ValidationException([
      { field: 'request', message: `Request size cannot exceed ${maxSize} bytes` }
    ])
  }
  return true
}

// Extract and validate JSON body
export async function validateJsonBody(request: NextRequest, maxSize = 1024 * 10): Promise<Record<string, unknown>> {
  validateRequestSize(request, maxSize)
  
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      throw new ValidationException([
        { field: 'body', message: 'Invalid JSON body' }
      ])
    }
    return body
  } catch (error) {
    if (error instanceof ValidationException) {
      throw error
    }
    throw new ValidationException([
      { field: 'body', message: 'Invalid JSON format' }
    ])
  }
}