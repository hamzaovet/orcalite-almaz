/**
 * GET /api/auth/challenge
 *
 * Returns a 401 with WWW-Authenticate header.
 * Used as a fallback when the Server Component layout detects
 * a missing or invalid Basic Auth header.
 */
export function GET() {
  return new Response('Unauthorized — ORCA Dashboard', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="ORCA Dashboard", charset="UTF-8"',
      'Content-Type':     'text/plain; charset=utf-8',
    },
  })
}
