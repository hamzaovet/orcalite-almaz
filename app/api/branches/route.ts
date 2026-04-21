import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Branch from '@/models/Branch'
import InventoryUnit from '@/models/InventoryUnit'

function fail(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

/* ── GET /api/branches ─────────────────────────────────────── */
export async function GET() {
  try {
    await connectDB()
    const rawBranches = await Branch.find({}).sort({ name: 1 }).lean()
    
    // Enrich with custody count
    const branches = await Promise.all(rawBranches.map(async (b: any) => {
      const custodyCount = await InventoryUnit.countDocuments({
        locationId: b._id,
        status: { $ne: 'Sold' }
      })
      return { ...b, custodyCount }
    }))

    return NextResponse.json({ success: true, branches })
  } catch (err: any) {
    return fail(err.message, 500)
  }
}

/* ── POST /api/branches ────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { name, address } = await req.json()
    if (!name?.trim()) return fail('اسم الفرع مطلوب')
    const branch = await Branch.create({ name: name.trim(), address: address?.trim() ?? '' })
    return NextResponse.json({ success: true, branch }, { status: 201 })
  } catch (err: any) {
    return fail(err.message, 500)
  }
}

/* ── PUT /api/branches ─────────────────────────────────────── */
export async function PUT(req: NextRequest) {
  try {
    await connectDB()
    const { _id, name, type, address } = await req.json()
    if (!_id)         return fail('معرّف الفرع مطلوب')
    if (!name?.trim()) return fail('اسم الفرع مطلوب')
    const updated = await Branch.findByIdAndUpdate(
      _id,
      { $set: { name: name.trim(), type, address: address?.trim() ?? '' } },
      { new: true }
    )
    if (!updated) return fail('الفرع غير موجود', 404)
    return NextResponse.json({ success: true, branch: updated })
  } catch (err: any) {
    return fail(err.message, 500)
  }
}

/* ── DELETE /api/branches?id=… ─────────────────────────────── */
export async function DELETE(req: NextRequest) {
  try {
    await connectDB()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return fail('معرّف الفرع مطلوب')
    await Branch.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return fail(err.message, 500)
  }
}
