import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Transaction from '@/models/Transaction'
import TransferOrder from '@/models/TransferOrder'
import Branch from '@/models/Branch'
import Supplier from '@/models/Supplier'
import Customer from '@/models/Customer'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const type = req.nextUrl.searchParams.get('type')
    const id = req.nextUrl.searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json({ success: false, message: 'Type and ID required' }, { status: 400 })
    }

    let balance = 0
    let metadata = {}

    // 1. Calculate Transaction Balance (Cash Paid/Received)
    const txs = await Transaction.find({ entityId: id, entityType: type })
    const netTransactions = txs.reduce((sum, tx) => {
      // IN means cashier receives money (reduces debt)
      // OUT means cashier pays out (increases debt or reduction of prepayment)
      return tx.type === 'IN' ? sum + tx.amount : sum - tx.amount
    }, 0)

    // 2. Calculate Entity Specific Debt (Inventory / Invoices)
    if (type === 'Branch') {
      // Fetch all transfer orders for this branch
      const orders = await TransferOrder.find({ toLocationId: id, status: 'Completed' })
      const netCustodyValue = orders.reduce((sum, order) => {
        const isOut = order.fromLocationType === 'MainWarehouse'
        return isOut ? sum + (order.totalValue || 0) : sum - (order.totalValue || 0)
      }, 0)
      
      balance = netCustodyValue - netTransactions
      metadata = { netCustodyValue, netTransactions }
    } else if (type === 'Supplier') {
      // Logic for suppliers: Fetch explicitly stored balance from CFO Double-Entry Engine
      const supplier = await Supplier.findById(id)
      balance = supplier ? supplier.balance : 0
    } else if (type === 'Customer') {
      // Logic for customers (Link to Sales)
      balance = 0
    }

    return NextResponse.json({ 
      success: true, 
      balance,
      metadata
    })

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
