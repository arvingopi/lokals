export function isValidUSZipcode(zipcode: string): boolean {
  const usZipcodeRegex = /^\d{5}(-\d{4})?$/
  return usZipcodeRegex.test(zipcode)
}

// Canadian postal code validation (A1A 1A1 format)
export function isValidCanadianPostalCode(postalCode: string): boolean {
  // Remove all spaces and convert to uppercase for validation
  const cleaned = postalCode.replace(/\s+/g, '').toUpperCase()
  // Check if it matches A1A1A1 pattern (6 characters)
  const canadianPostalRegex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/
  return canadianPostalRegex.test(cleaned)
}

// Combined validation
export function isValidZipcode(zipcode: string): boolean {
  return isValidUSZipcode(zipcode) || isValidCanadianPostalCode(zipcode)
}

// Normalize zipcode format for chat rooms
export function normalizeZipcode(zipcode: string): string {
  // Remove extra spaces and convert to uppercase
  const cleaned = zipcode.replace(/\s+/g, "").toUpperCase().trim()

  // For Canadian postal codes, extract only the first 3 characters (FSA)
  if (isValidCanadianPostalCode(zipcode)) {
    const fsa = cleaned.substring(0, 3)
    return fsa
  }

  // For US zipcodes, keep as is but clean
  if (isValidUSZipcode(zipcode)) {
    return zipcode.trim()
  }

  return cleaned
}

// Get display format for zipcode (for UI purposes)
export function getZipcodeDisplayFormat(zipcode: string): string {
  const normalized = normalizeZipcode(zipcode)

  // If it's a 3-character Canadian FSA, show it clearly
  if (normalized.length === 3 && /^[A-Z]\d[A-Z]$/.test(normalized)) {
    return `${normalized} (Forward Sortation Area)`
  }

  return normalized
}

// Check if zipcode is Canadian FSA format
export function isCanadianFSA(zipcode: string): boolean {
  return /^[A-Z]\d[A-Z]$/.test(zipcode)
}

// Get location from browser with single attempt
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by this browser")
  }

  try {
    const location = await attemptGeolocation({ timeout: 10000 })
    return location
  } catch {
    return null
  }
}

function attemptGeolocation(options: PositionOptions): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    // Simple timeout wrapper
    const timeoutId = setTimeout(() => {
      reject(new Error("Location request timed out"))
    }, options.timeout || 10000)
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId)
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      () => {
        clearTimeout(timeoutId)
        // For empty error objects, provide a generic message
        reject(new Error("Location access failed"))
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    )
  })
}

// Mock function to get zipcode from coordinates (in real app, use geocoding API)
export async function getZipcodeFromCoordinates(lat: number, lng: number): Promise<string | null> {
  console.log("Getting zipcode for coordinates:", lat, lng)
  
  // This is a mock implementation - in a real app, you'd use a geocoding service
  // For demo purposes, return a sample zipcode based on rough location
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  if (lat >= 25 && lat <= 49 && lng >= -125 && lng <= -66) {
    // Rough US bounds - return common zip codes
    const usZipcodes = ["10001", "90210", "60601", "30301", "77001"]
    return usZipcodes[Math.floor(Math.random() * usZipcodes.length)]
  } else if (lat >= 42 && lat <= 83 && lng >= -141 && lng <= -52) {
    // Rough Canada bounds - return FSA format directly
    const fsaCodes = ["V7S", "M5V", "K1A", "T2P", "H3B", "S7K"]
    return fsaCodes[Math.floor(Math.random() * fsaCodes.length)]
  } else {
    // For locations outside US/Canada, return a default US zipcode for demo
    console.log("Location outside US/Canada, returning default zipcode")
    return "10001"
  }
}
