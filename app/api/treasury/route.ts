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

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')
    const startDate = searchParams.get('startDate')
    const endDate   = searchParams.get('endDate')

    // ── Account filter ────────────────────────────────────────────
    let accountFilter: any = {}
    if (branchId && branchId !== 'all' && branchId !== 'null' && branchId !== 'undefined') {
      accountFilter.branchId = new mongoose.Types.ObjectId(branchId)
    }

    // ── Transaction match filter ──────────────────────────────────
    const match: any = {}
    if (branchId && branchId !== 'all' && branchId !== 'null' && branchId !== 'undefined') {
      match.branchId = new mongoose.Types.ObjectId(branchId)
    }
    match.description = { $not: /رصيد افتتاح لمنتجات/ }
    match.entityType  = { $nin: ['SupplierLedger', 'System_Forex_Adjustment'] }

    if ((startDate && startDate !== '' && startDate !== 'undefined') ||
        (endDate   && endDate   !== '' && endDate   !== 'undefined')) {
      match.date = {}
      if (startDate && startDate !== '' && startDate !== 'undefined')
        match.date.$gte = new Date(startDate)
      if (endDate && endDate !== '' && endDate !== 'undefined') {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        match.date.$lte = end
      }
    }

    // ── Fetch accounts & transaction aggregation in parallel ──────
    const [accounts, txAgg] = await Promise.all([
      InternalAccount.find(accountFilter).lean(),
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$paymentMethod',
            totalIn:  { $sum: { $cond: [{ $eq: ['$type', 'IN']  }, '$amount', 0] } },
            totalOut: { $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, '$amount', 0] } },
            txCount:  { $sum: 1 },
          },
        },
      ]),
    ])

    // Build a quick lookup: paymentMethodName → {totalIn, totalOut, txCount}
    const txByMethod: Record<string, { totalIn: number; totalOut: number; txCount: number }> = {}
    for (const row of txAgg) {
      txByMethod[row._id] = { totalIn: row.totalIn, totalOut: row.totalOut, txCount: row.txCount }
    }

    // ── Build per-channel stats ───────────────────────────────────
    // Each InternalAccount channel captures all transactions where paymentMethod === acc.name
    const channels = accounts.map(acc => {
      const stats = txByMethod[acc.name] ?? { totalIn: 0, totalOut: 0, txCount: 0 }
      // Net balance from transactions for this period
      const txBalance = stats.totalIn - stats.totalOut
      return {
        _id:      acc._id,
        name:     acc.name,
        type:     acc.type,
        totalIn:  stats.totalIn,
        totalOut: stats.totalOut,
        txCount:  stats.txCount,
        // Live balance = stored currentBalance (updated on every POST /api/transactions)
        balance: acc.currentBalance,
      }
    })

    // ── Grand totals from TRANSACTIONS (not stale currentBalance) ─
    // grandTotal = sum of all IN minus sum of all OUT across ALL transactions in scope
    const allTx = Object.values(txByMethod)
    const grandIn    = allTx.reduce((s, r) => s + r.totalIn,  0)
    const grandOut   = allTx.reduce((s, r) => s + r.totalOut, 0)
    // For the balance card: sum live currentBalance from accounts (authoritative ledger)
    // Fallback to txNet if no accounts registered yet
    const grandTotal = accounts.length > 0
      ? accounts.reduce((s, a) => s + (a.currentBalance || 0), 0)
      : grandIn - grandOut

    return NextResponse.json({ success: true, channels, grandTotal, grandIn, grandOut })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return dbError(msg)
  }
}

