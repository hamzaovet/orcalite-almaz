import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import InternalAccount from '@/models/InternalAccount'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get('branchId')
    
    let filter: any = {}
    if (branchId && branchId !== 'all') {
      filter.branchId = branchId
    }

    const accounts = await InternalAccount.find(filter).sort({ type: -1, name: 1 }).lean()
    return NextResponse.json({ success: true, accounts })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { name, type, initialBalance, branchId } = await req.json()
    
    if (!name || !type) return NextResponse.json({ success: false, message: 'Missing name or type' }, { status: 400 })

    const account = await InternalAccount.create({
      name: name.trim(),
      type,
      initialBalance: Number(initialBalance) || 0,
      currentBalance: Number(initialBalance) || 0,
      branchId: branchId || null
    })

    return NextResponse.json({ success: true, account }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
