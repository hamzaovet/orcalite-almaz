import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import InternalAccount from '@/models/InternalAccount'

export async function GET() {
  try {
    await connectDB()
    
    // Seed default channels if they don't exist
    const defaults = [
      { name: 'الخزينة الرئيسية (Main Safe)', type: 'Safe' },
      { name: 'فيزا (Visa)', type: 'Clearing' },
      { name: 'ValU', type: 'Clearing' },
      { name: 'إنستاباي (InstaPay)', type: 'Clearing' },
      { name: 'فودافون كاش (Vodafone Cash)', type: 'Clearing' },
    ]

    for (const d of defaults) {
      const exists = await InternalAccount.findOne({ name: d.name })
      if (!exists) {
        await InternalAccount.create({
          name: d.name,
          type: d.type as any,
          initialBalance: 0,
          currentBalance: 0
        })
      }
    }

    const accounts = await InternalAccount.find({}).sort({ type: -1, name: 1 }).lean()
    return NextResponse.json({ success: true, accounts })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { name, type, initialBalance } = await req.json()
    
    if (!name || !type) return NextResponse.json({ success: false, message: 'Missing name or type' }, { status: 400 })

    const account = await InternalAccount.create({
      name: name.trim(),
      type,
      initialBalance: Number(initialBalance) || 0,
      currentBalance: Number(initialBalance) || 0
    })

    return NextResponse.json({ success: true, account }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
