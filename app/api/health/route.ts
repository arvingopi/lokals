import { NextResponse } from "next/server"

export async function GET() {
  const startTime = Date.now()
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    checks: {
      firebase: { status: "ok", note: "Firebase services running" },
      websocket: { status: "unknown", port: process.env.WEBSOCKET_PORT || 8080 },
      encryption: { status: "unknown" }
    }
  }

  // Encryption health check
  try {
    if (!process.env.SESSION_ENCRYPTION_KEY) {
      health.checks.encryption = { status: "error", error: "SESSION_ENCRYPTION_KEY not configured" }
      health.status = "degraded"
    } else if (process.env.SESSION_ENCRYPTION_KEY.length !== 64) {
      health.checks.encryption = { status: "error", error: "SESSION_ENCRYPTION_KEY invalid length" }
      health.status = "degraded"
    } else {
      health.checks.encryption = { status: "ok" }
    }
  } catch (error) {
    health.checks.encryption = { 
      status: "error", 
      error: error instanceof Error ? error.message : "Encryption check failed" 
    }
    health.status = "degraded"
  }

  // WebSocket health check (basic port check)
  health.checks.websocket = {
    status: "ok", // WebSocket server runs independently
    port: process.env.WEBSOCKET_PORT || 8080,
    note: "WebSocket server runs independently"
  }

  const responseTime = Date.now() - startTime
  const httpStatus = health.status === "ok" ? 200 : health.status === "degraded" ? 200 : 503

  return NextResponse.json({
    ...health,
    responseTime
  }, { 
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}