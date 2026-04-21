import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'تم تسجيل الخروج' })
  
  response.cookies.set({
    name: 'orca_auth',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    path: '/',
  })

  return response
}
