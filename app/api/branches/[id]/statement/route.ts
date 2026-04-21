import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Transaction from '@/models/Transaction'
import TransferOrder from '@/models/TransferOrder'
import Branch from '@/models/Branch'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB()
    const { id: branchId } = await params

    const branch = await Branch.findById(branchId).lean()
    if (!branch) return NextResponse.json({ success: false, message: 'Branch not found' }, { status: 404 })

    // 1. Fetch Goods Data
    const goods = await TransferOrder.find({ toLocationId: branchId, status: 'Completed' })
      .populate({ path: 'items', populate: { path: 'productId', select: 'name' } })
      .lean()

    // 2. Fetch Cash Data
    const cash = await Transaction.find({ entityId: branchId, entityType: 'Branch' }).lean()

    // 3. Merge into Unified Array
    const statement: any[] = []

    // Map Goods
    goods.forEach((g: any) => {
      const isOut = g.fromLocationType === 'MainWarehouse'
      const itemsList = (g.items || []).map((u: any) => `${u.productId?.name} (${u.serialNumber})`).join(', ')
      
      statement.push({
        date: g.date || g.createdAt,
        type: 'Goods',
        typeAr: 'بضاعة',
        ref: g.orderNumber,
        description: g.notes || (isOut ? `صرف بضاعة: ${itemsList}` : `مرتجع بضاعة: ${itemsList}`),
        debit: isOut ? (g.totalValue || 0) : 0,  // Branch owes us more
        credit: !isOut ? (g.totalValue || 0) : 0, // Branch debt reduces
      })
    })

    // Map Cash
    cash.forEach((c: any) => {
      const isIN = c.type === 'IN' // We received money = Credit for them
      statement.push({
        date: c.date || c.createdAt,
        type: 'Cash',
        typeAr: 'نقدية',
        ref: c._id.toString().slice(-8).toUpperCase(),
        description: c.description,
        debit: !isIN ? c.amount : 0, // We paid them = Debit for them
        credit: isIN ? c.amount : 0,  // They paid us = Credit for them
      })
    })

    // 4. Sort Chronologically
    statement.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // 5. Calculate Running Balance
    let currentBalance = 0
    const finalStatement = statement.map(item => {
      currentBalance += (item.debit - item.credit)
      return { ...item, balance: currentBalance }
    })

    return NextResponse.json({ 
      success: true, 
      branchName: branch.name,
      statement: finalStatement 
    })

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
