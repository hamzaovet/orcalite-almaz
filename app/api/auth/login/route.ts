import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models/User'
import { comparePassword, generateToken } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    await connectDB()
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'إسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 400 })
    }

    const user = await User.findOne({ username })
    if (!user) {
      return NextResponse.json({ error: 'إسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 })
    }

    const isMatch = await comparePassword(password, user.password as string)
    if (!isMatch) {
      return NextResponse.json({ error: 'إسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 })
    }

    let mappedRole = user.role
    if ((mappedRole as any) === 'مدير') mappedRole = 'Admin'
    if ((mappedRole as any) === 'كاشير') mappedRole = 'Cashier'

    const payload = {
      sub: user._id.toString(),
      username: user.username,
      name: user.name,
      role: mappedRole,
    }
    const token = generateToken(payload, '7d')

    const response = NextResponse.json({ success: true, message: 'تم تسجيل الدخول بنجاح', user: payload })
    
    // Set HTTP-only secure cookie
    response.cookies.set({
      name: 'orca_auth',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error('[Login API] Error:', error)
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
