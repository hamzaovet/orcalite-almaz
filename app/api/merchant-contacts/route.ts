import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import MerchantContact from '@/models/MerchantContact'
import { verifyAdminPassword } from '@/lib/verifyAdmin'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const contacts = await MerchantContact.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, contacts })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const { name, phone, type } = await request.json()
    if (!name || !phone || !type) return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 })
    
    const contact = await MerchantContact.create({ name, phone, type })
    return NextResponse.json({ success: true, contact }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB()
    const { _id, name, phone, type } = await request.json()
    const contact = await MerchantContact.findByIdAndUpdate(_id, { name, phone, type }, { new: true })
    return NextResponse.json({ success: true, contact })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB()
    const id = request.nextUrl.searchParams.get('id')

    const body = await request.json().catch(() => ({}))
    const { password } = body
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ success: false, message: 'كلمة مرور الإدارة غير صحيحة' }, { status: 401 })
    }

    await MerchantContact.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
