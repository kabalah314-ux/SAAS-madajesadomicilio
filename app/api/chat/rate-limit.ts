// Simple in-memory rate limiter
// In production, use Redis or similar

const requests = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS = 50 // 50 messages per hour per IP

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = requests.get(ip)

  if (!record || now > record.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetIn: WINDOW_MS }
  }

  if (record.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: record.resetAt - now }
  }

  record.count++
  return { allowed: true, remaining: MAX_REQUESTS - record.count, resetIn: record.resetAt - now }
}

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of requests.entries()) {
    if (now > record.resetAt) {
      requests.delete(ip)
    }
  }
}, 10 * 60 * 1000)
