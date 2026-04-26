import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Purchase from '@/models/Purchase'
import Product from '@/models/Product'
import InventoryUnit from '@/models/InventoryUnit'
import Supplier from '@/models/Supplier'
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

    const purchase = await Purchase.findById(id)
    if (!purchase) {
      return NextResponse.json({ success: false, message: 'الفاتورة غير موجودة' }, { status: 404 })
    }

    // 1. Revert Inventory
    for (const item of purchase.items) {
      const qtyNum = Number(item.qty) || 1

      // Deduct from global Product stock
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -qtyNum } })

      if (item.imeis && item.imeis.length > 0) {
        // Serialized: delete specific available units
        const imeisToDelete = item.imeis.map((i: string) => i.trim()).filter(Boolean)
        await InventoryUnit.deleteMany({
          productId: item.productId,
          serialNumber: { $in: imeisToDelete },
          status: 'Available'
        })
      } else {
        // Generic: decrement ledger
        let ledger = await InventoryUnit.findOne({ productId: item.productId, locationId: purchase.branchId })
        if (!ledger) {
          ledger = await InventoryUnit.findOne({ productId: item.productId })
        }
        if (ledger) {
          ledger.quantity = Math.max(0, (Number(ledger.quantity) || 0) - qtyNum)
          await ledger.save()
        }
      }
    }

    // 2. Revert Supplier Balance
    if (purchase.supplierId && purchase.remaining > 0) {
      await Supplier.findByIdAndUpdate(purchase.supplierId, { $inc: { balance: -purchase.remaining } })
    }

    // 3. Delete related Transactions
    const invoiceRef = purchase.invoiceNumber || purchase._id.toString().slice(-8).toUpperCase()
    
    // Delete Payment (OUT to Supplier)
    await Transaction.deleteMany({
      entityType: 'Supplier',
      entityId: purchase.supplierId,
      description: { $regex: invoiceRef, $options: 'i' }
    })

    // Delete Ledger Entry (IN from SupplierLedger)
    await Transaction.deleteMany({
      entityType: 'SupplierLedger',
      entityId: purchase.supplierId,
      description: { $regex: invoiceRef, $options: 'i' }
    })

    // 4. Delete the Purchase
    await Purchase.findByIdAndDelete(id)

    return NextResponse.json({ success: true, message: 'تم حذف فاتورة المشتريات واسترجاع المخزون والأرصدة بنجاح' })
  } catch (err: any) {
    console.error('[DELETE /api/purchases/[id]]', err.message)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    
    const purchase = await Purchase.findById(id)
      .populate('items.productId')
      .lean()

    if (!purchase) {
      return NextResponse.json({ success: false, message: 'الفاتورة غير موجودة' }, { status: 404 })
    }

    return NextResponse.json({ success: true, purchase })
  } catch (error) {
    console.error('[GET /api/purchases/[id]]', error)
    return NextResponse.json({ success: false, message: 'فشل تحميل بيانات الفاتورة' }, { status: 500 })
  }
}
