import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Sale from '@/models/Sale'
import Product from '@/models/Product'
import InventoryUnit from '@/models/InventoryUnit'
import Transaction from '@/models/Transaction'
import { verifyAdminPassword } from '@/lib/verifyAdmin'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params

    if (!id) {
      return NextResponse.json({ success: false, message: 'معرف الفاتورة مطلوب' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { password } = body
    if (!(await verifyAdminPassword(password))) {
      return NextResponse.json({ success: false, message: 'كلمة مرور الإدارة غير صحيحة' }, { status: 401 })
    }

    const sale = await Sale.findById(id)
    if (!sale) {
      return NextResponse.json({ success: false, message: 'الفاتورة غير موجودة' }, { status: 404 })
    }

    // 1. Revert Inventory
    for (const item of sale.items) {
      const qtyNum = Number(item.qty) || 1

      // A. SERIALIZED ITEM
      if (item.inventoryUnitId) {
        const unit = await InventoryUnit.findById(item.inventoryUnitId)
        if (unit) {
          unit.status = 'Available'
          await unit.save()
        }
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: 1 } })
      } 
      // B. GENERIC ITEM
      else {
        // Find ledger and increment
        let ledger = await InventoryUnit.findOne({ productId: item.productId, locationId: sale.branchId })
        if (!ledger) {
          ledger = await InventoryUnit.findOne({ productId: item.productId })
        }
        if (ledger) {
          ledger.quantity = (Number(ledger.quantity) || 0) + qtyNum
          await ledger.save()
        }
        
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: qtyNum } })
      }
    }

    // 2. Delete the related Transaction
    await Transaction.deleteMany({ entityType: 'Sales', entityId: id })

    // 3. Delete the Sale itself
    await Sale.findByIdAndDelete(id)

    return NextResponse.json({ success: true, message: 'تم حذف الفاتورة واسترجاع المخزون بنجاح' })
  } catch (err: any) {
    console.error('[DELETE /api/sales/[id]]', err.message)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
