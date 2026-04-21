import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import InternalAccount from '@/models/InternalAccount'
import Transaction from '@/models/Transaction'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { fromId, toId, amount, notes } = await req.json()
    
    if (!fromId || !toId || !amount || amount <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 })
    }

    if (fromId === toId) {
      return NextResponse.json({ success: false, message: 'Cannot transfer to the same account' }, { status: 400 })
    }

    const fromAcc = await InternalAccount.findById(fromId)
    const toAcc = await InternalAccount.findById(toId)

    if (!fromAcc || !toAcc) {
      return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 })
    }

    // Atomic Balance Update
    fromAcc.currentBalance -= Number(amount)
    toAcc.currentBalance += Number(amount)

    await fromAcc.save()
    await toAcc.save()

    // Log the movement for audit (Internal Transfer type) 
    // This maintains the ledger without affecting Revenue/Expense reports
    await Transaction.create({
      amount: Number(amount),
      type: 'OUT',
      paymentMethod: fromAcc.name.includes('Visa') ? 'Visa' : fromAcc.name.includes('Cash') ? 'Cash' : 'InstaPay',
      description: `[Internal Transfer] From: ${fromAcc.name} To: ${toAcc.name} | Note: ${notes || ''}`,
      entityType: 'GeneralExpense', // Logged in history, but bypasses debt logic
      entityName: `حركة تحويل داخلي: ${toAcc.name}`,
      date: new Date()
    })

    return NextResponse.json({ success: true, fromBalance: fromAcc.currentBalance, toBalance: toAcc.currentBalance })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
