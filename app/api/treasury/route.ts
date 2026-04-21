import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Transaction from '@/models/Transaction'
import InternalAccount from '@/models/InternalAccount'

function dbError(detail?: string) {
  return NextResponse.json(
    { success: false, message: 'Database error', ...(detail ? { detail } : {}) },
    { status: 503 }
  )
}

/* ── GET /api/treasury — dynamic aggregate balances ── */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Map legacy payment methods to standard account names (used in earlier code)
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

    const accounts = await InternalAccount.find({}).lean()

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const match: any = {}

    if (branchId && branchId !== 'all') {
      if (branchId === 'null' || branchId === 'undefined') {
        match.branchId = { $exists: false }
      } else {
        match.branchId = new mongoose.Types.ObjectId(branchId)
      }
    }

    // Banish fake wealth (Phase 140)
    match.description = { $not: /رصيد افتتاح لمنتجات/ };

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

    const pipeline = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { 
            paymentMethod: '$paymentMethod', 
            entityType: '$entityType', 
            entityId: '$entityId' 
          },
          totalIn:  { $sum: { $cond: [{ $eq: ['$type', 'IN']  }, '$amount', 0] } },
          totalOut: { $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, '$amount', 0] } },
          txCount:  { $sum: 1 },
        },
      },
    ])

    let summaryRecords = await Transaction.aggregate([
      { $match: match },
      { $group: { 
          _id: null, 
          total: { $sum: "$amount" }, 
          Cash: { $sum: { $cond: [{ $eq: ["$paymentMethod", "Cash"] }, "$amount", 0] } },
          Visa: { $sum: { $cond: [{ $eq: ["$paymentMethod", "Visa"] }, "$amount", 0] } },
          ValU: { $sum: { $cond: [{ $eq: ["$paymentMethod", "Valu"] }, "$amount", 0] } },
          InstaPay: { $sum: { $cond: [{ $eq: ["$paymentMethod", "InstaPay"] }, "$amount", 0] } },
          'Vodafone Cash': { $sum: { $cond: [{ $eq: ["$paymentMethod", "Vodafone Cash"] }, "$amount", 0] } }
      }}
    ])

    let summary = (summaryRecords && summaryRecords.length > 0)
      ? summaryRecords[0]
      : { _id: null, total: 0, Cash: 0, Visa: 0, Valu: 0, InstaPay: 0, 'Vodafone Cash': 0 }

    const channels = accounts.map(acc => {
      let totalIn = 0
      let totalOut = 0
      let txCount = 0

      for (const row of pipeline) {
        const pMethod = row._id.paymentMethod
        const eType = row._id.entityType
        const eId = row._id.entityId ? String(row._id.entityId) : null

        // It matches IF exact entityId matches BankAccount OR if the payment method maps to the exact account name
        const matchesEntity = eType === 'BankAccount' && eId === String(acc._id)
        const matchesMethod = pMethod && reverseMethodMap[acc.name] === pMethod

        if (matchesEntity || matchesMethod) {
            totalIn += row.totalIn
            totalOut += row.totalOut
            txCount += row.txCount
            
            // Add to summary
            const methodKey = pMethod || reverseMethodMap[acc.name]
            if (summary[methodKey] !== undefined) {
              summary[methodKey] += (row.totalIn - row.totalOut)
              summary.total += (row.totalIn - row.totalOut)
            }
        }
      }

      return {
        _id: acc._id,
        name: acc.name,
        type: acc.type,
        totalIn,
        totalOut,
        balance: acc.currentBalance, // live from db (global)
        txCount
      }
    })

    const grandTotal = channels.reduce((acc, c) => acc + c.balance, 0)
    const grandIn    = channels.reduce((acc, c) => acc + c.totalIn,  0)
    const grandOut   = channels.reduce((acc, c) => acc + c.totalOut, 0)

    return NextResponse.json({ success: true, channels, summary, grandTotal, grandIn, grandOut })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return dbError(msg)
  }
}
