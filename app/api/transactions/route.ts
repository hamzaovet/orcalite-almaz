export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import Transaction from '@/models/Transaction'
import Shipment from '@/models/Shipment'
import Branch from '@/models/Branch'
import Supplier from '@/models/Supplier'
import Customer from '@/models/Customer'
import InternalAccount from '@/models/InternalAccount'
import { verifyAdminPassword } from '@/lib/verifyAdmin'

function dbError(detail?: string) {
  return NextResponse.json(
    { success: false, message: 'Database error', ...(detail ? { detail } : {}) },
    { status: 503 }
  )
}

/* ── GET /api/transactions — paginated feed ─────────────────── */
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam === 'all' ? 0 : Number(limitParam ?? 50)

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
    match.description = { $not: /رصيد افتتاح لمنتجات/ }

    // Exclude pure ledger entries (supplier credit invoices) from cash flow views
    // Pass ?includeSupplierLedger=true to get them (e.g. supplier statement modal)
    const includeSupplierLedger = searchParams.get('includeSupplierLedger') === 'true'
    if (!includeSupplierLedger) {
      match.entityType = { $nin: ['SupplierLedger', 'System_Forex_Adjustment'] }
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
    
    // Fetch transactions
    const transactions = await Transaction.find(match)
      .sort({ date: -1 })
      .limit(limit)
      .populate('branchId', 'name')
      .lean()

    // Polymorphic Population Helper
    const enriched = await Promise.all(transactions.map(async (tx: any) => {
      // 1. If we already have a stored entityName (e.g. for Expenses), use it immediately
      if (tx.entityName) return tx;

      // 2. Otherwise, check for relations
      if (!tx.entityId || tx.entityType === 'GeneralExpense') return { ...tx, entityName: 'مصاريف عامة' }
      
      let entity: any = null
      if (tx.entityType === 'Branch') entity = await Branch.findById(tx.entityId).select('name').lean()
      else if (tx.entityType === 'Supplier') entity = await Supplier.findById(tx.entityId).select('name').lean()
      else if (tx.entityType === 'Customer') entity = await Customer.findById(tx.entityId).select('name').lean()
      else if (tx.entityType === 'BankAccount') entity = await InternalAccount.findById(tx.entityId).select('name').lean()
      
      return { ...tx, entityName: entity?.name || 'Unknown Entity' }
    }))

    return NextResponse.json({ success: true, transactions: enriched })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return dbError(msg)
  }
}

/* ── POST /api/transactions — log a new transaction ─────────── */
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()

    const { amount, type, paymentMethod, description, entityType, entityId, entityName, date, actualExchangeRate, foreignAmountPaid, shipmentId, currency } = body

    if (!amount || !type || !paymentMethod || !description) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: amount, type, paymentMethod, description' },
        { status: 400 }
      )
    }

    const validTypes   = ['IN', 'OUT']
    const validMethods = ['Cash', 'Visa', 'Valu', 'InstaPay', 'Vodafone Cash']
    const validEntities = ['Branch', 'Supplier', 'Customer', 'GeneralExpense', 'Sales', 'BankAccount', 'OwnerEquity', 'System_Forex_Adjustment', 'OPENING_BALANCE']

    if (!validTypes.includes(type)) {
      return NextResponse.json({ success: false, message: 'Invalid type. Must be IN or OUT' }, { status: 400 })
    }
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json({ success: false, message: 'Invalid paymentMethod' }, { status: 400 })
    }
    if (entityType && !validEntities.includes(entityType)) {
      return NextResponse.json({ success: false, message: 'Invalid entityType' }, { status: 400 })
    }

    const transaction = await Transaction.create({
      amount:        Number(amount),
      type:          String(type),
      paymentMethod: String(paymentMethod),
      description:   String(description).trim(),
      entityType:    entityType || 'GeneralExpense',
      entityId:      entityId || undefined,
      entityName:    entityName || undefined,
      branchId:      (body.branchId && body.branchId !== 'all' && body.branchId !== 'null') ? body.branchId : undefined,
      date:          date ? new Date(date) : new Date(),
      actualExchangeRate: actualExchangeRate ? Number(actualExchangeRate) : undefined,
      foreignAmountPaid: foreignAmountPaid ? Number(foreignAmountPaid) : undefined,
      shipmentId: shipmentId || undefined,
      currency: currency || undefined,
    })


    // CFO LOGIC: Supplier Debt & Auto System Forex Adjustment
    if (entityType === 'Supplier' && type === 'OUT' && entityId) {
      if (shipmentId && foreignAmountPaid && actualExchangeRate) {
        const shipment = await Shipment.findById(shipmentId)
        if (shipment) {
          const bookedRate = shipment.exchangeRate
          const supplierReduction = foreignAmountPaid * bookedRate
          const safeDeduction = foreignAmountPaid * actualExchangeRate

          // 1. Reduce Debt strictly by Booked Rate equivalent
          const supDb = await Supplier.findByIdAndUpdate(entityId, { $inc: { balance: -supplierReduction } })

          // 2. Adjust Trial Balance for P&L
          const difference = safeDeduction - supplierReduction // +ve means Expense, -ve means Revenue
          if (difference !== 0) {
            await Transaction.create({
              amount: Math.abs(difference),
              type: difference > 0 ? 'OUT' : 'IN', // OUT = Loss (Expense), IN = Gain (Revenue)
              paymentMethod: 'Cash',
              description: `تسوية فروق عملة دولار/درهم للرسالة ${shipment.shipmentNumber} (${difference > 0 ? 'خسارة' : 'إيراد'}) `,
              entityType: 'Supplier',
              entityId: entityId,
              entityName: supDb ? supDb.name : entityName,
              shipmentId: shipment._id,
              date: date ? new Date(date) : new Date(),
            })
          }
        }
      } else {
        // Fallback for regular supplier payments without forex linkage
        await Supplier.findByIdAndUpdate(entityId, { $inc: { balance: -Number(amount) } })
      }
    }

    // Side Effect: Update Internal Account Balance
    // 1. If it's a BankAccount transaction, update the specific account
    if (entityType === 'BankAccount' && entityId) {
      const multiplier = type === 'IN' ? 1 : -1
      await InternalAccount.findByIdAndUpdate(entityId, {
        $inc: { currentBalance: Number(amount) * multiplier }
      })
    }

    // 2. Update the InternalAccount balance that matches the paymentMethod.
    // The paymentMethod value is EITHER a hardcoded name ('Cash', 'Visa', etc.)
    // OR the exact account name from the InternalAccount collection.
    // We resolve it by searching for an account whose name matches.
    if (paymentMethod && paymentMethod !== 'Cash') {
      // Direct name match — covers all custom account names
      const multiplier = type === 'IN' ? 1 : -1
      await InternalAccount.findOneAndUpdate(
        { name: paymentMethod },
        { $inc: { currentBalance: Number(amount) * multiplier } }
      )
    } else if (paymentMethod === 'Cash') {
      // 'Cash' maps to any account whose name contains 'كاش' or 'safe' or 'خزين'
      const multiplier = type === 'IN' ? 1 : -1
      const branchFilter = (body.branchId && body.branchId !== 'all') ? { branchId: body.branchId } : {}
      await InternalAccount.findOneAndUpdate(
        { name: { $regex: /كاش|safe|خزين/i }, ...branchFilter },
        { $inc: { currentBalance: Number(amount) * multiplier } }
      )
    }

    return NextResponse.json({ success: true, transaction }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return dbError(msg)
  }
}

/* ── DELETE /api/transactions?id=… ─────────────────────────── */
export async function DELETE(request: NextRequest) {
  try {
    await connectDB()
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const { password } = body
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ success: false, message: 'كلمة مرور الإدارة غير صحيحة' }, { status: 401 })
    }

    await Transaction.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return dbError(msg)
  }
}
