import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { RepairTicket } from '@/models/RepairTicket'
import Transaction from '@/models/Transaction'

export async function GET() {
  try {
    await connectDB()
    const tickets = await RepairTicket.find().sort({ createdAt: -1 }).populate('spareParts.product')
    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('[API Maintenance] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const newTicket = await RepairTicket.create(body)

    if (newTicket.deposit && newTicket.deposit > 0) {
      const ticketId = newTicket._id.toString().slice(-6).toUpperCase()
      await Transaction.create({
        entityType: 'Customer',
        amount: newTicket.deposit,
        type: 'IN',
        paymentMethod: 'Cash',
        description: `عربون صيانة تذكرة رقم ${ticketId} لجهاز ${newTicket.deviceModel}`,
        date: new Date()
      })
    }

    return NextResponse.json({ success: true, ticket: newTicket })
  } catch (error) {
    console.error('[API Maintenance] POST Error:', error)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}
