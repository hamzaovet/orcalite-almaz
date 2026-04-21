import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import CustomerDeviceOffer from '@/models/CustomerDeviceOffer'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const { deviceModel, storage, condition, customerName, whatsapp, photos } = body

    if (!deviceModel || !storage || !condition || !customerName || !whatsapp) {
      return NextResponse.json(
        { success: false, message: 'جميع الحقول مطلوبة' },
        { status: 400 }
      )
    }

    const offer = await CustomerDeviceOffer.create({
      deviceModel: deviceModel.trim(),
      storage: storage.trim(),
      condition,
      customerName: customerName.trim(),
      whatsapp: whatsapp.trim(),
      photos: photos || [],
      status: 'New'
    })

    return NextResponse.json({ success: true, offer }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/offers]', msg)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    await connectDB()
    const offers = await CustomerDeviceOffer.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, offers })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
