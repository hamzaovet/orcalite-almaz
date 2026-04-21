import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Reservation from '@/models/Reservation'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const { productId, productName, customerName, phone, receiptImageUrl } = body

    if (!productId || !customerName || !phone || !receiptImageUrl) {
      return NextResponse.json(
        { success: false, message: 'جميع الحقول مطلوبة بما فيها صورة الإيصال' },
        { status: 400 }
      )
    }

    const reservation = await Reservation.create({
      productId,
      productName,
      customerName: customerName.trim(),
      phone: phone.trim(),
      receiptImageUrl,
      status: 'Pending Confirmation'
    })

    return NextResponse.json({ success: true, reservation }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/reservations]', msg)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    await connectDB()
    const reservations = await Reservation.find({})
      .sort({ createdAt: -1 })
      .populate('productId')
      .lean()
    return NextResponse.json({ success: true, reservations })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
