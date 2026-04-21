import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models/User'
import { comparePassword, verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    await connectDB()
    const { password } = await req.json()

    if (!password) {
      return NextResponse.json({ success: false, message: 'كلمة المرور مطلوبة' }, { status: 400 })
    }

    // 1. Identify the current logged-in user from the cookie
    const token = (await cookies()).get('orca_auth')?.value
    if (!token) {
      return NextResponse.json({ success: false, message: 'غير مصرح لك بالوصول' }, { status: 401 })
    }

    let decoded: any
    try {
      decoded = verifyToken(token)
    } catch (err) {
      return NextResponse.json({ success: false, message: 'انتهت صلاحية الجلسة' }, { status: 401 })
    }

    // 2. Fetch the actual user to get the hashed password
    const user = await User.findById(decoded.sub)
    if (!user) {
      return NextResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 404 })
    }

    // 3. Verify using bcrypt.compare
    const isMatch = await comparePassword(password, user.password as string)
    
    if (isMatch) {
      return NextResponse.json({ success: true, message: 'تم التحقق بنجاح' })
    } else {
      return NextResponse.json({ success: false, message: 'نعتذر، الرقم السري غير صحيح' }, { status: 403 })
    }
  } catch (error: any) {
    console.error('[Verify Admin API] Error:', error.message)
    return NextResponse.json({ success: false, message: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
