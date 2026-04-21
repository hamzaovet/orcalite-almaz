import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Currency from '@/models/Currency'
import { StoreSettings } from '@/models/StoreSettings'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    let currencies = await Currency.find({}).sort({ code: 1 })
    
    // Auto-seed from old settings if empty
    if (currencies.length === 0) {
      const settings = await StoreSettings.findOne({})
      const aed = settings?.exchangeRate || 1
      const usd = settings?.exchangeRateUSD || 1
      await Currency.insertMany([
        { code: 'AED', name: 'UAE Dirham', exchangeRate: aed },
        { code: 'USD', name: 'US Dollar', exchangeRate: usd }
      ])
      currencies = await Currency.find({}).sort({ code: 1 })
    }

    return NextResponse.json({ success: true, currencies })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()
    const { code, name, exchangeRate } = body

    if (!code || !name) return NextResponse.json({ success: false, error: 'Code and Name are required.' }, { status: 400 })

    const newCurrency = await Currency.create({ code: code.toUpperCase(), name, exchangeRate: Number(exchangeRate) || 1 })
    return NextResponse.json({ success: true, currency: newCurrency })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()
    const { id, exchangeRate } = body
    if (!id) return NextResponse.json({ success: false, error: 'ID is required.' }, { status: 400 })
    
    const updated = await Currency.findByIdAndUpdate(id, { exchangeRate: Number(exchangeRate) }, { new: true })
    return NextResponse.json({ success: true, currency: updated })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'ID is required.' }, { status: 400 })
    
    await Currency.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
