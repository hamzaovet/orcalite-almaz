import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import OnlineRepairRequest from '@/models/OnlineRepairRequest'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const { deviceModel, issueCategory, issueDescription, customerName, whatsapp, photos } = body

    if (!deviceModel || !issueCategory || !issueDescription || !customerName || !whatsapp) {
      return NextResponse.json({ success: false, message: 'جميع الحقول مطلوبة' }, { status: 400 })
    }

    const req = await OnlineRepairRequest.create({
      deviceModel: deviceModel.trim(),
      issueCategory,
      issueDescription: issueDescription.trim(),
      customerName: customerName.trim(),
      whatsapp: whatsapp.trim(),
      photos: photos || [],
      status: 'New'
    })

    return NextResponse.json({ success: true, request: req }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/repair-requests]', msg)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

export async function GET() {
  try {
    await connectDB()
    const requests = await OnlineRepairRequest.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, requests })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
