import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Purchase from '@/models/Purchase'
import Product from '@/models/Product'
import InventoryUnit from '@/models/InventoryUnit'
import Supplier from '@/models/Supplier'
import Transaction from '@/models/Transaction'
import InternalAccount from '@/models/InternalAccount'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const data = await request.json()
    // expecting: supplierId, supplierName, items (productId, productName, qty, unitCost, imeis), 
    // totalAmount, amountPaid, remaining, paymentMethod

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ success: false, message: 'لا توجد منتجات في الفاتورة' }, { status: 400 })
    }

    const { Types } = require('mongoose')
    const Category = require('@/models/Category').default

    // Phase 73: Auto-Establish Products logic
    const processedItems = []
    for (const rawItem of data.items) {
      let it = { ...rawItem }
      if (it.isNew && it.categoryId) {
        // Find category to determine serialization
        const cat = await Category.findById(it.categoryId)
        const catName = cat?.name || ''
        const isSerializedCat = catName.includes('محمولة') || catName.includes('ذكية')

        let existingProd = null;

        // ── Find-or-Create: ONLY for accessories/bulk. DO NOT merge serialized items (mobile phones)! ──
        if (!isSerializedCat) {
          existingProd = await Product.findOne({
            name: { $regex: new RegExp(`^${it.productName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            categoryId: it.categoryId,
          })
        }

        if (existingProd) {
          // Reuse the existing product — stock will be incremented in step 2a
          it.productId = existingProd._id.toString()
        } else {
          const newProd = await Product.create({
            name:             it.productName,
            category:         catName,          // MUST match the UI filter string
            categoryId:       it.categoryId,
            price:            Number(it.sellingPrice) || (Number(it.unitCost) + 2000),
            costPrice:        Number(it.unitCost),
            stock:            0,
            isSerialized:     isSerializedCat,
            hasSerialNumbers: isSerializedCat,
            color:            it.color,
            storage:          it.storage,
            batteryHealth:    it.batteryHealth,
            description:      ''
          })
          it.productId = newProd._id.toString()
        }
        it.isNew = false // mark as established
      }
      
      processedItems.push({
        ...it,
        productId: new Types.ObjectId(it.productId),
        qty: Number(it.qty) || 1,
        unitCost: Number(it.unitCost) || 0
      })
    }
    data.items = processedItems

    const calculatedTotal = data.items.reduce((sum: number, it: any) => sum + (it.qty * it.unitCost), 0)
    data.totalAmount = data.totalAmount > 0 ? data.totalAmount : calculatedTotal

    const isOpeningBalance = Boolean(data.isOpeningBalance);

    // Phase 80: Auto-Establish Supplier if NEW
    let resolvedSupplierId = data.supplierId
    let resolvedSupplierName = data.supplierName

    if (!data.walkInName && !resolvedSupplierId && resolvedSupplierName) {
      // Logic for new supplier name typed in CreatableSelect
      let existing = await Supplier.findOne({ name: { $regex: new RegExp(`^${resolvedSupplierName}$`, 'i') } })
      if (!existing) {
        existing = await Supplier.create({
          name: resolvedSupplierName,
          type: 'Supplier',
          balance: 0
        })
      }
      resolvedSupplierId = existing._id
    }

    // ── SAGA PATTERN: track side-effects for rollback on failure ──
    const saga: { purchaseId?: string; outTxId?: string; supplierBalanceDelta?: number; supplierId?: string } = {}

    // 1. Create Purchase record
    const purchase = new Purchase({
      supplierId: resolvedSupplierId || null,
      supplierName: isOpeningBalance 
        ? (resolvedSupplierName || 'نظام رصيد أول المدة') 
        : (data.walkInName || resolvedSupplierName),
      walkInName: data.walkInName,
      nationalId: data.nationalId,
      items: data.items,
      totalAmount: data.totalAmount,
      amountPaid: isOpeningBalance ? 0 : data.amountPaid,
      remaining: isOpeningBalance ? data.totalAmount : data.remaining,
      paymentMethod: data.paymentMethod,
      isOpeningBalance,
      invoiceLabel: isOpeningBalance ? 'فاتورة رصيد افتتاحي / أول المدة' : (data.walkInName ? 'مبايعة شراء من عميل' : undefined),
      branchId: data.branchId || undefined // Use provided branchId
    })
    await purchase.save()
    saga.purchaseId = purchase._id.toString()

    // 2. Process Items
    for (const item of data.items) {
      // 2a. Increase Product Stock and update specs if provided
      const productUpdateFields: any = { $inc: { stock: item.qty }, $set: { costPrice: item.unitCost } }
      if (item.sellingPrice && Number(item.sellingPrice) > 0) productUpdateFields.$set.price = Number(item.sellingPrice)
      if (item.color) productUpdateFields.$set.color = item.color
      if (item.storage) productUpdateFields.$set.storage = item.storage
      if (item.batteryHealth) productUpdateFields.$set.batteryHealth = item.batteryHealth
      await Product.findByIdAndUpdate(item.productId, productUpdateFields)

      // 2b. Insert InventoryUnits (Serialized or Bulk)
      if (item.imeis && item.imeis.length > 0) {
        // Serialized: Create one record per IMEI
        const validImeis = item.imeis.map((i: string) => i.trim()).filter(Boolean)
        const docs = validImeis.map((imei: string) => ({
          serialNumber: imei,
          productId: item.productId,
          status: 'Available',
          locationType: data.branchId ? 'Branch' : 'MainWarehouse',
          locationId: data.branchId || null,
          landedCostEGP: item.unitCost,
          quantity: 1, // Serialized always 1
          attributes: { 
            condition: item.condition || 'Used',
            storage: item.storage || undefined,
            color: item.color || undefined,
            batteryHealth: item.batteryHealth ? parseInt(String(item.batteryHealth).replace(/\D/g, ''), 10) : undefined,
            notes: item.notes
          }
        }))
        if (docs.length > 0) await InventoryUnit.insertMany(docs)
      } else {
        // Bulk (Accessories/Spare Parts): Create a single record with total quantity
        // CEO PHASE 70: Zero-Tolerance Unique SKU Rule
        const bulkSku = 'BULK-' + new Types.ObjectId().toString();
        const finalQty = Number(item.qty || 1);
        
        const bulkDoc = new InventoryUnit({
          serialNumber: bulkSku,
          productId: item.productId,
          status: 'Available',
          locationType: data.branchId ? 'Branch' : 'MainWarehouse',
          locationId: data.branchId || null,
          landedCostEGP: item.unitCost,
          quantity: finalQty, // FIXED: Explicitly use finalQty from item.qty
          attributes: { 
            condition: item.condition || 'New',
            storage: item.storage || undefined,
            color: item.color || undefined,
            notes: item.notes
          }
        })
        await bulkDoc.save()
      }
    }

    // 3. Conditional Cash Flow Protection
    const paidNum = Number(data.amountPaid) || 0;
    // ── Shared invoice ref used in BOTH payment and ledger descriptions (must match for merge) ──
    const invoiceRef = purchase.invoiceNumber || purchase._id.toString().slice(-8).toUpperCase()
    if (paidNum > 0 && !isOpeningBalance) {
      const outTx = await Transaction.create({
        amount: paidNum,
        type: 'OUT',
        paymentMethod: data.paymentMethod || 'Cash',
        description: data.walkInName 
          ? `دفعة شراء مبايعة من العميل ${data.walkInName}`
          : `سداد فاتورة مشتريات رقم ${invoiceRef}`,
        entityType: 'Supplier',
        entityId: resolvedSupplierId || data.supplierId || undefined,
        date: new Date(),
        branchId: (data.branchId && data.branchId !== 'all' && data.branchId !== 'null') ? data.branchId : undefined
      });
      saga.outTxId = outTx._id.toString()

      if (data.paymentMethod && data.paymentMethod !== 'Cash') {
        await InternalAccount.findOneAndUpdate({ name: data.paymentMethod }, { $inc: { currentBalance: -paidNum } })
      } else {
        const branchFilter = (data.branchId && data.branchId !== 'all') ? { branchId: data.branchId } : {}
        await InternalAccount.findOneAndUpdate(
          { name: { $regex: /كاش|safe|خزين/i }, ...branchFilter },
          { $inc: { currentBalance: -paidNum } }
        )
      }
    }

    // 4. Supplier Balance & Ledger — Double-Entry Accounting
    const effectiveSupplierId = resolvedSupplierId || data.supplierId || null

    if (effectiveSupplierId) {
      const grossAmount = Number(data.totalAmount) || 0
      const netDebt     = isOpeningBalance ? grossAmount : (Number(data.remaining) || 0)

      try {
        // 4a. Increment supplier.balance (tracked for rollback)
        if (netDebt > 0) {
          await Supplier.findByIdAndUpdate(effectiveSupplierId, { $inc: { balance: netDebt } })
          saga.supplierBalanceDelta = netDebt
          saga.supplierId = String(effectiveSupplierId)
        }

        // 4b. Create CREDIT ledger row — if this fails, we rollback 4a + purchase
        if (grossAmount > 0) {
          await Transaction.create({
            entityType:    'SupplierLedger',    // pure ledger entry — NOT a cash movement
            entityId:      effectiveSupplierId,
            entityName:    resolvedSupplierName || data.supplierName,
            amount:        grossAmount,
            type:          'IN',
            paymentMethod: 'Cash',
            description:   isOpeningBalance
              ? `رصيد افتتاحي / أول المدة — ${resolvedSupplierName || data.supplierName}`
              : `فاتورة مشتريات رقم ${invoiceRef}`,
            date: new Date(),
            branchId: (data.branchId && data.branchId !== 'all' && data.branchId !== 'null') ? data.branchId : undefined
          })
        }
      } catch (ledgerError) {
        // ROLLBACK — undo all side-effects so no ghost data persists
        console.error('[POST /api/purchases] Ledger step failed — rolling back:', ledgerError)
        if (saga.purchaseId)          await Purchase.findByIdAndDelete(saga.purchaseId).catch(() => {})
        if (saga.outTxId)             await Transaction.findByIdAndDelete(saga.outTxId).catch(() => {})
        if (saga.supplierId && saga.supplierBalanceDelta)
          await Supplier.findByIdAndUpdate(saga.supplierId, { $inc: { balance: -saga.supplierBalanceDelta } }).catch(() => {})
        return NextResponse.json(
          { success: false, message: 'فشل تسجيل القيد المحاسبي — تم التراجع عن الفاتورة تلقائياً' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, message: 'تم حفظ الفاتورة وتوريد المخزن بنجاح', purchase })

  } catch (error) {
    console.error('[POST /api/purchases]', error)
    return NextResponse.json({ success: false, message: 'فشل حفظ الفاتورة' }, { status: 500 })
  }
}

export async function GET() {
  try {
    await connectDB()
    const purchases = await Purchase.find()
      .populate('items.productId')
      .sort({ createdAt: -1 })
    return NextResponse.json({ success: true, purchases })
  } catch (error) {
    console.error('[GET /api/purchases]', error)
    return NextResponse.json({ success: false, message: 'فشل تحميل المشتريات' }, { status: 500 })
  }
}
