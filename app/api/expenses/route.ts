import { NextResponse } from 'next/server'
import { connectDB as dbConnect } from '@/lib/db'
import Expense from '@/models/Expense'
import Transaction from '@/models/Transaction'

export async function GET() {
  try {
    await dbConnect()
    const expenses = await Expense.find({}).sort({ date: -1, createdAt: -1 }).lean()
    return NextResponse.json({ success: true, expenses })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect()
    const body = await req.json()

    if (!body.title || body.amount == null || !body.paymentMethod) {
      return NextResponse.json({ success: false, error: 'العنوان والقيمة وطريقة الدفع حقول مطلوبة' }, { status: 400 })
    }

    const expense = await Expense.create({
      title: String(body.title).trim(),
      amount: Number(body.amount),
      category: body.category ? String(body.category).trim() : 'عام',
      paymentMethod: body.paymentMethod,
      date: body.date ? new Date(body.date) : new Date(),
    })

    // Auto log an OUT transaction in Treasury
    await Transaction.create({
      amount: expense.amount,
      type: 'OUT',
      paymentMethod: expense.paymentMethod,
      description: `مصروف: ${expense.title}`,
      referenceId: expense._id,
      date: expense.date,
    })

    return NextResponse.json({ success: true, expense }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
