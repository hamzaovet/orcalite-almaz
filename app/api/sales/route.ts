import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Sale from '@/models/Sale'
import Product from '@/models/Product'
import InventoryUnit from '@/models/InventoryUnit'
import Category from '@/models/Category'
import Branch from '@/models/Branch'
import Supplier from '@/models/Supplier'
import Transaction from '@/models/Transaction'
import { StoreSettings } from '@/models/StoreSettings'
import { Types } from 'mongoose'

/* ── Shared error ────────────────────────────────────────────── */
function fail(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

/* ── GET /api/sales ──────────────────────────────────────────── */
export async function GET() {
  try {
    await connectDB()
    const sales = await Sale.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, sales })
  } catch (err: any) {
    console.error('[GET /api/sales]', err.message)
    return fail(err.message, 500)
  }
}

/* ── POST /api/sales ─────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    const {
      customer,
      phone,
      date,
      paymentMethod,
      paymentStatus = 'Paid',
      customerId,
      branchId,
      // items: Array<{ productId, inventoryUnitId?, serialNumber?, qty, actualUnitPrice }>
      items,
    } = body

    /* ── 1. Validation ────────────────────────────────────────── */
    if (!branchId) {
      return fail('معرف الفرع مطلوب بشكل صارم لخصم المخزون (Branch ID is strictly required)', 400)
    }
    if (!customer?.trim())   return fail('اسم العميل مطلوب')
    if (!paymentMethod)      return fail('طريقة الدفع مطلوبة')
    if (!items || !Array.isArray(items) || items.length === 0) {
      return fail('يجب إضافة منتج واحد على الأقل في السلة')
    }

    const saleItems: any[] = []
    let totalAmount = 0
    let totalCost   = 0
    let totalProfit = 0

    /* ── 2. Masterstroke Logic: Hybrid Serial/Generic Processing ─ */
    for (const item of items) {
      const { productId, inventoryUnitId, qty = 1, actualUnitPrice } = item
      const qtyNum = Number(qty)

      // A. SERIALIZED ITEM PROCESSING (IMEI exists)
      if (inventoryUnitId) {
        const unit = await InventoryUnit.findById(inventoryUnitId)
        if (!unit) return fail(`كارت المخزون ${inventoryUnitId} غير موجود`)
        if (unit.status !== 'Available') return fail(`الجهاز ذو السيريال ${unit.serialNumber} غير متاح للبيع (الحالة: ${unit.status})`)

        const product = await Product.findById(unit.productId)
        if (!product) return fail('المنتج المرتبط بالسيريال غير موجود')

        const unitCost = unit.landedCostEGP
        const unitPrice = Number(actualUnitPrice)
        const unitProfit = unitPrice - unitCost

        // ATOMIC SAFEGUARD: Mark as Sold BEFORE finalizing sale
        unit.status = 'Sold'
        await unit.save()

        // Sync Product stock (optional, but keep it in check)
        product.stock = Math.max(0, product.stock - 1)
        await product.save()

        saleItems.push({
          productId: product._id,
          inventoryUnitId: unit._id,
          productName: product.name,
          serialNumber: unit.serialNumber,
          qty: 1,
          unitPrice: product.price,
          actualUnitPrice: unitPrice,
          costAtSale: unitCost,
          profit: unitProfit
        })

        totalAmount += unitPrice
        totalCost   += unitCost
        totalProfit += unitProfit
      } 
      // B. GENERIC ITEM PROCESSING (Fallback to Product Model)
      else {
        const product = await Product.findById(productId)
        if (!product) return fail('المنتج غير موجود')
        if (product.stock < qtyNum) return fail(`المخزون غير كافٍ لـ ${product.name}`)

        // 1. Attempt to find the specific ledger unit for this branch
        let ledger = await InventoryUnit.findOne({ productId: productId, locationId: branchId })

        // 2. Fallback: If not found by exact branch (due to legacy data), find the main one
        if (!ledger) {
          ledger = await InventoryUnit.findOne({ productId: productId })
        }

        // 3. Force the physical deduction!
        if (ledger) {
          ledger.quantity = (Number(ledger.quantity) || 0) - Number(qtyNum)
          await ledger.save()
        } else {
          console.error("CRITICAL: Ledger unit not found for deduction!", productId)
        }

        // 4. Maintain the global stock deduction
        await Product.findByIdAndUpdate(productId, { $inc: { stock: -Number(qtyNum) } })

        const unitCost = product.costPrice || 0
        const unitPrice = Number(actualUnitPrice)
        const itemProfit = (unitPrice - unitCost) * qtyNum

        saleItems.push({
          productId: product._id,
          productName: product.name,
          qty: qtyNum,
          unitPrice: product.price,
          actualUnitPrice: unitPrice,
          costAtSale: unitCost,
          profit: itemProfit
        })

        totalAmount += (unitPrice * qtyNum)
        totalCost   += (unitCost * qtyNum)
        totalProfit += itemProfit
      }
    }

    /* ── 3. Sequential Invoice Numbering ───────────────────────── */
    const settings = await StoreSettings.findOneAndUpdate(
      {},
      { $inc: { nextInvoiceNumber: 1 } },
      { upsert: true, new: true }
    )
    const invoiceNumber = `INV-${String(settings.nextInvoiceNumber - 1).padStart(5, '0')}`

    /* ── 4. Create Sale Record ────────────────────────────────── */
    const sale = await Sale.create({
      customer: customer.trim(),
      phone: phone?.trim(),
      date: date ? new Date(date) : new Date(),
      invoiceNumber,
      items: saleItems,
      totalAmount,
      totalCost,
      totalProfit,
      paymentMethod,
      paymentStatus,
      customerId: customerId || undefined,
      branchId: branchId || undefined,
    })

    /* ── 5. Financial Audit (Treasury) ────────────────────────── */
    await Transaction.create({
      amount: totalAmount,
      type: 'IN',
      paymentMethod,
      description: `فاتورة مبيعات رقم ${invoiceNumber} - اﻟعميل: ${customer}`,
      entityType: 'Sales',
      entityId: sale._id,
      branchId: branchId || null,
      date: new Date(),
    })

    return NextResponse.json({ success: true, sale }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/sales]', err.message)
    return fail(err.message, 500)
  }
}
