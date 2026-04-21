import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Purchase from '@/models/Purchase'
import Sale from '@/models/Sale'
import Shipment from '@/models/Shipment'
import Branch from '@/models/Branch'
import Supplier from '@/models/Supplier'
import User from '@/models/User'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const branchId  = searchParams.get('branchId')
    const isValidBranch = branchId && branchId !== 'null' && branchId !== 'undefined' && branchId !== '';

    if (!productId) {
      return NextResponse.json({ success: false, message: 'productId is required' }, { status: 400 })
    }

    const movements = []

    // 1. Purchases (IN)
    const purchaseQuery: any = { 'items.productId': new mongoose.Types.ObjectId(productId) }
    if (isValidBranch) {
      purchaseQuery.branchId = branchId;
    } else {
      purchaseQuery.branchId = { $exists: false };
    }
    const purchases = await Purchase.find(purchaseQuery)
      .populate('branchId', 'name')
      .populate('supplierId', 'name')
      .lean()

    for (const p of purchases) {
      const item = p.items.find((i: any) => String(i.productId) === String(productId))
      if (item) {
        movements.push({
          date: p.date || p.createdAt,
          type: 'IN',
          label: p.isOpeningBalance ? 'رصيد افتتاحي' : 'فاتورة مشتريات',
          qty: item.qty,
          reference: p.invoiceLabel || p._id.toString().substring(0, 8),
          location: (p.branchId as any)?.name || p.supplierName || (p.supplierId as any)?.name || 'System'
        })
      }
    }

    // 2. Sales (OUT)
    const saleQuery: any = { 'items.productId': new mongoose.Types.ObjectId(productId) }
    if (isValidBranch) {
      saleQuery.branchId = branchId;
    } else {
      saleQuery.branchId = { $exists: false };
    }
    const sales = await Sale.find(saleQuery)
      .populate('branchId', 'name')
      .populate('customerId', 'name')
      .lean()

    for (const s of sales) {
      const item = s.items.find((i: any) => String(i.productId) === String(productId))
      if (item) {
        movements.push({
          date: s.date || s.createdAt,
          type: 'OUT',
          label: 'فاتورة مبيعات',
          qty: -item.qty,
          reference: s.invoiceNumber || s._id.toString().substring(0, 8),
          location: s.customer || (s.customerId as any)?.name || (s.branchId as any)?.name || 'عميل'
        })
      }
    }

    // 3. Shipments (IN)
    const shipments = await Shipment.find({ 'items.productId': productId }).lean()
    for (const sh of shipments) {
      const item = sh.items.find((i: any) => String(i.productId) === String(productId))
      if (item) {
        movements.push({
          date: sh.arrivalDate || sh.createdAt,
          type: 'IN',
          label: 'شحنة استيراد',
          qty: item.quantity || item.qty || 1, // Shipment uses quantity usually
          reference: sh.shipmentNumber || sh._id.toString().substring(0, 8),
          location: 'مخزن دولي'
        })
      }
    }

    // Sort by date ascending (Chronological tracking)
    movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate rolling balance
    let rollingBalance = 0;
    const ledger = movements.map(m => {
      rollingBalance += m.qty;
      return { ...m, balance: rollingBalance };
    });

    return NextResponse.json({ success: true, movements: ledger })
  } catch (error) {
    console.error('[GET /api/inventory/movement]', error)
    return NextResponse.json({ success: false, message: 'Failed to load movement' }, { status: 500 })
  }
}
