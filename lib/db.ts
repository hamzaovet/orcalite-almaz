import mongoose from 'mongoose'
import { hashPassword } from './auth'

// ── Hard-fail if the env var is missing — never fall back to localhost ──
if (!process.env.MONGODB_URI) {
  throw new Error(
    'FATAL: MONGODB_URI environment variable is missing. ' +
    'Set it in .env.local (local dev) or in the Vercel project environment variables (production).'
  )
}

const MONGODB_URI = process.env.MONGODB_URI

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined
}

const cached: MongooseCache =
  global._mongooseCache ?? (global._mongooseCache = { conn: null, promise: null })

export async function connectDB(): Promise<typeof mongoose> {
  // Return existing live connection immediately
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000, // Give Atlas a bit more time than local
      })
      .then((m) => {
        console.log('✅ [Free Zone DB] Connected →', MONGODB_URI.replace(/:\/\/.*@/, '://***@'))
        return m
      })
      .catch((err: Error) => {
        cached.promise = null // Clear so the next request retries
        console.error('❌ [Free Zone DB] Connection failed:', err.message)
        throw err
      })
  }

  cached.conn = await cached.promise
  return cached.conn
}
