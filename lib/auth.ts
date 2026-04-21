import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'orca_premium_secure_vault_key_2026_matrix'

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: object, expiresIn: string | number = '7d'): string {
  // @ts-ignore: ignoring string/number mismatch for expiresIn option type
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET)
}

// Edge compatible HS256 verify for middleware
export async function verifyTokenEdge(token: string): Promise<any> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token')

  const [header, payload, signature] = parts
  
  // Basic padding check and base64url decode
  const atobUrl = (str: string) => atob(str.replace(/-/g, '+').replace(/_/g, '/'))
  const enc = new TextEncoder()
  
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  const signatureBytes = new Uint8Array(
    atobUrl(signature).split('').map((c) => c.charCodeAt(0))
  )
  const dataBytes = enc.encode(`${header}.${payload}`)

  const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, dataBytes)
  if (!isValid) throw new Error('Signature invalid')

  return JSON.parse(atobUrl(payload))
}
