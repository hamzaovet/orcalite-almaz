import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Supplier from '@/models/Supplier'
import { verifyAdminPassword } from '@/lib/verifyAdmin'

function dbError(detail?: string) {
  return NextResponse.json(
    { success: false, message: 'Database error', ...(detail ? { detail } : {}) },
    { status: 503 }
  )
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const suppliers = await Supplier.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, suppliers })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return dbError(msg)
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()

    const { name, type, balance, phone } = body
    if (!name || type == null) {
      return NextResponse.json({ success: false, message: 'Missing required fields: name, type' }, { status: 400 })
    }

    const supplier = await Supplier.create({
      name: String(name).trim(),
      type: String(type).trim(),
      balance: Number(balance) || 0,
      phone: phone ? String(phone).trim() : undefined,
    })

    return NextResponse.json({ success: true, supplier }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return dbError(msg)
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const { _id, ...updateData } = body

    if (!_id) {
      return NextResponse.json({ success: false, message: 'Missing supplier ID' }, { status: 400 })
    }

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      _id,
      { $set: { ...updateData } },
      { returnDocument: 'after' }
    )

    if (!updatedSupplier) {
      return NextResponse.json({ success: false, message: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updatedSupplier })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB()
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { password } = body
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ success: false, message: 'كلمة مرور الإدارة غير صحيحة' }, { status: 401 })
    }

    await Supplier.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return dbError(msg)
  }
}
