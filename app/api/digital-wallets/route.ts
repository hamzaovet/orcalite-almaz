import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import DigitalWallet from '@/models/DigitalWallet'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const wallets = await DigitalWallet.find().sort({ createdAt: -1 })
    return NextResponse.json({ success: true, wallets })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const { name, type, openingBalance } = await request.json()
    const wallet = await DigitalWallet.create({
      name,
      type,
      openingBalance: Number(openingBalance) || 0,
      balance: Number(openingBalance) || 0,
    })
    return NextResponse.json({ success: true, wallet })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
