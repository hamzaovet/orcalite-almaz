import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import InternalAccount from '@/models/InternalAccount'

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

    const deleted = await InternalAccount.findByIdAndDelete(id)

    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Account deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
