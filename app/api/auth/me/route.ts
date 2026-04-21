import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const cookies = req.headers.get('cookie') || ''
    const match = cookies.match(/orca_auth=([^;]+)/)
    const token = match ? match[1] : null

    if (!token) return NextResponse.json({ user: null }, { status: 401 })

    const payload = verifyToken(token)
    return NextResponse.json({ user: payload })
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
