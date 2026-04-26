import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import InternalAccount from '@/models/InternalAccount'
import { verifyAdminPassword } from '@/lib/verifyAdmin'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing Account ID' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { password } = body
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ success: false, message: 'كلمة مرور الإدارة غير صحيحة' }, { status: 401 })
    }

    const deleted = await InternalAccount.findByIdAndDelete(id)

    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Account deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
