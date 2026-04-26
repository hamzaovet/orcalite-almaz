import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import CustomerDeviceOffer from '@/models/CustomerDeviceOffer'
import { verifyAdminPassword } from '@/lib/verifyAdmin'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const { id } = await params
    const body = await request.json()
    const { status, offeredPrice, notes } = body

    const updateData: any = {}
    if (status) updateData.status = status
    if (offeredPrice !== undefined) updateData.offeredPrice = Number(offeredPrice)
    if (notes !== undefined) updateData.notes = notes

    const offer = await CustomerDeviceOffer.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    )

    if (!offer) return NextResponse.json({ success: false, message: 'Offer not found' }, { status: 404 })
    return NextResponse.json({ success: true, offer })
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

    await CustomerDeviceOffer.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
