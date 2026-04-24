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

    // 1. Try to identify the current logged-in user first
    const token = (await cookies()).get('orca_auth')?.value
    let currentUserId: string | null = null

    if (token) {
      try {
        const decoded: any = verifyToken(token)
        currentUserId = decoded.sub || decoded.id || decoded._id || null
      } catch { /* token invalid/expired — continue */ }
    }

    // 2. Build a list of candidate admin users to verify against
    //    Priority: current logged-in user → all SuperAdmin/Admin users
    const adminRoles = ['SuperAdmin', 'Admin', 'مدير', 'سوبر ادمن']
    const candidates = await User.find({
      $or: [
        ...(currentUserId ? [{ _id: currentUserId }] : []),
        { role: { $in: adminRoles } }
      ]
    }).lean() as any[]

    if (candidates.length === 0) {
      return NextResponse.json({ success: false, message: 'لا يوجد مستخدم إداري في النظام' }, { status: 404 })
    }

    // 3. Check password against each candidate (stops at first match)
    for (const user of candidates) {
      const isMatch = await comparePassword(password, user.password as string)
      if (isMatch) {
        return NextResponse.json({ success: true, message: 'تم التحقق بنجاح' })
      }
    }

    return NextResponse.json({ success: false, message: 'نعتذر، كلمة المرور غير صحيحة' }, { status: 403 })
  } catch (error: any) {
    console.error('[Verify Admin API] Error:', error.message)
    return NextResponse.json({ success: false, message: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
