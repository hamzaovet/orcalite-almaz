import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import OnlineRepairRequest from '@/models/OnlineRepairRequest'
import { verifyAdminPassword } from '@/lib/verifyAdmin'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const { id } = await params
    const body = await request.json()
    const { status, quote, notes } = body

    const update: any = {}
    if (status) update.status = status
    if (quote !== undefined) update.quote = Number(quote)
    if (notes !== undefined) update.notes = notes

    const updated = await OnlineRepairRequest.findByIdAndUpdate(id, { $set: update }, { new: true })
    if (!updated) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, request: updated })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const { id } = await params

    const body = await request.json().catch(() => ({}))
    const { password } = body
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ success: false, message: 'كلمة مرور الإدارة غير صحيحة' }, { status: 401 })
    }

    await OnlineRepairRequest.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
