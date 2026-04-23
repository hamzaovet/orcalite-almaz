import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import InternalAccount from '@/models/InternalAccount'
import Transaction from '@/models/Transaction'
import mongoose from 'mongoose'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const resolvedParams = await params
    const id = resolvedParams.id
    
    if (!id) return NextResponse.json({ success: false, message: 'معرف الحساب مطلوب' }, { status: 400 })

    const account = await InternalAccount.findById(id).lean()
    if (!account) return NextResponse.json({ success: false, message: 'الحساب غير موجود' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get('branchId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const methodMap: Record<string, string> = {
      'Cash': 'الخزينة الرئيسية (Main Safe)',
      'Visa': 'فيزا (Visa)',
      'Valu': 'ValU',
      'InstaPay': 'إنستاباي (InstaPay)',
      'Vodafone Cash': 'فودافون كاش (Vodafone Cash)'
    }

    const reverseMethodMap: Record<string, string> = {}
    for (const [key, val] of Object.entries(methodMap)) {
      reverseMethodMap[val] = key
    }

    const mappedPaymentMethod = reverseMethodMap[account.name]

    const orConditions: any[] = [
      { entityType: 'BankAccount', entityId: id }
    ]

    if (mappedPaymentMethod) {
      orConditions.push({ paymentMethod: mappedPaymentMethod })
    }

    const match: any = { $or: orConditions }

    // Banish fake wealth (Phase 140)
    match.description = { $not: /رصيد افتتاح لمنتجات/ };

    // Branch Handcuff (Phase 139)
    if (branchId && branchId !== 'all') {
      if (branchId === 'null' || branchId === 'undefined') {
        match.branchId = { $exists: false }
      } else {
        match.branchId = new mongoose.Types.ObjectId(branchId)
      }
    }

    // Bulletproof Date Logic (Phase 140)
    if ((startDate && startDate !== 'undefined' && startDate !== '') || 
        (endDate && endDate !== 'undefined' && endDate !== '')) {
        match.date = {};
        
        if (startDate && startDate !== 'undefined' && startDate !== '') {
            match.date.$gte = new Date(startDate);
        }
        if (endDate && endDate !== 'undefined' && endDate !== '') {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            match.date.$lte = end;
        }
    }

    // Fetch chronologically to correctly compute running balance (oldest first)
    const transactions = await Transaction.find(match)
      .sort({ date: 1, createdAt: 1 }) // Chronological ascending
      .lean()

    return NextResponse.json({ success: true, account, transactions })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
