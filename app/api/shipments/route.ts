import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Shipment from '@/models/Shipment'
import InventoryUnit from '@/models/InventoryUnit'
import Supplier from '@/models/Supplier'
import Product from '@/models/Product'
import Transaction from '@/models/Transaction'

/** Shared error response for any DB failure */
function dbError(detail?: string) {
  return NextResponse.json(
    {
      success: false,
      message: 'Database connection failed or logic error.',
      ...(detail ? { detail } : {}),
    },
    { status: 500 }
  )
}

/** Helper: Generate InventoryUnits for a shipment */
async function generateInventoryUnits(shipment: any) {
  const unitsToCreate = []
  for (const item of shipment.items) {
    // Phase 10.A.5: The Landed Cost Sync
    const product = await Product.findById(item.productId)
    if (product) {
      const newCost = item.landedUnitCostEGP || 0
      product.costPrice = newCost
      
      // Auto-Pricing Logic
      if (product.wholesaleMargin && product.wholesaleMargin > 0) {
         const newSellPrice = newCost + (newCost * (product.wholesaleMargin / 100))
         product.wholesalePriceEGP = newSellPrice
         product.price = newSellPrice // Mirror standard price for unification
      }
      await product.save()
    }

    for (let i = 0; i < item.quantity; i++) {
      unitsToCreate.push({
        productId: item.productId,
        shipmentId: shipment._id,
        status: 'Pending',
        landedCostEGP: item.landedUnitCostEGP,
        serialNumber: undefined,
      })
    }
  }

  if (unitsToCreate.length > 0) {
    await InventoryUnit.insertMany(unitsToCreate)
  }
}

/* ── GET /api/shipments ────────────────────────────────────── */
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const shipments = await Shipment.find({})
      .sort({ date: -1 })
      .populate({ path: 'supplierId', model: Supplier, select: 'name' })
      .populate({ path: 'items.productId', model: Product, select: 'name hasSerialNumbers' })
      .lean()

    return NextResponse.json({ success: true, shipments })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[GET /api/shipments]', msg)
    return dbError(msg)
  }
}

/* ── POST /api/shipments ───────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()

    const {
      shipmentNumber,
      supplierId,
      date,
      currency,
      exchangeRate,
      status,
      items,    // Array of { productId, quantity, unitCostForeign }
      expenses, // Array of { type, amountEGP }
    } = body

    if (!shipmentNumber || !supplierId || !currency || !exchangeRate || !items || !items.length) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields for Shipment.' },
        { status: 400 }
      )
    }

    // 1. CALCULATE TOTALS
    const totalForeignCost = items.reduce((sum: number, item: any) => {
      item.totalCostForeign = item.quantity * item.unitCostForeign
      return sum + item.totalCostForeign
    }, 0)

    const totalExpensesEGP = (expenses || []).reduce((sum: number, exp: any) => sum + (exp.amountEGP || 0), 0)

    // 2. DISTRIBUTE LANDED COST (Value-Based Allocation)
    const processedItems = items.map((item: any) => {
      const itemWeight = totalForeignCost > 0 ? item.totalCostForeign / totalForeignCost : 0
      const itemExpenseShareEGP = totalExpensesEGP * itemWeight
      const itemBaseCostEGP = item.totalCostForeign * exchangeRate
      const totalItemLandedCostEGP = itemBaseCostEGP + itemExpenseShareEGP
      const landedUnitCostEGP = item.quantity > 0 ? totalItemLandedCostEGP / item.quantity : 0

      return {
        ...item,
        landedUnitCostEGP: Number(landedUnitCostEGP.toFixed(4)),
        totalItemLandedCostEGP: Number(totalItemLandedCostEGP.toFixed(4)),
      }
    })

    const totalLandedCostEGP = (totalForeignCost * exchangeRate) + totalExpensesEGP

    // 3. PERSIST RECORD
    const finalShipmentNumber = shipmentNumber.includes('-') 
      ? shipmentNumber 
      : `${shipmentNumber}-${Date.now().toString().slice(-4)}`

    const shipment = await Shipment.create({
      shipmentNumber: finalShipmentNumber,
      supplierId,
      date: date || new Date(),
      currency,
      exchangeRate,
      status: status || 'Draft',
      items: processedItems,
      expenses: expenses || [],
      totalForeignCost: Number(totalForeignCost.toFixed(4)),
      totalLandedCostEGP: Number(totalLandedCostEGP.toFixed(4)),
    })

    // CFO LOGIC: Increase Supplier Debt
    const addedDebtEGP = Number(totalForeignCost * exchangeRate)
    await Supplier.findByIdAndUpdate(supplierId, { $inc: { balance: addedDebtEGP } })

    // Log the transaction for the ledger
    await Transaction.create({
      supplierId,                  // CFO Fix: Explicit map
      entityId: supplierId,        // CFO Fix: Explicit map
      entityType: 'Supplier',
      entityName: 'مورد استيراد',
      amount: addedDebtEGP,
      type: 'IN',
      paymentMethod: 'Cash',
      description: `استلام شحنة بضاعة رقم ${shipment.shipmentNumber}`,
      date: new Date(),
      shipmentId: shipment._id
    })

    // 4. AUTO-GENERATION IF RECEIVED
    if (shipment.status === 'Received') {
      await generateInventoryUnits(shipment)
    }

    return NextResponse.json({ success: true, shipment }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/shipments]', msg)
    return dbError(msg)
  }
}

/* ── PUT /api/shipments ────────────────────────────────────── */
export async function PUT(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const { id, status, ...updates } = body

    if (!id) return NextResponse.json({ success: false, message: 'Missing shipment ID' }, { status:400 })

    // Phase 10.A.8: Protect against null productId corrupting the DB
    if (updates.items) {
      const invalidItem = updates.items.find((item: any) => !item.productId)
      if (invalidItem) {
        return NextResponse.json(
          { success: false, message: 'بيانات غير صحيحة: أحد الأصناف لا يحتوي على منتج. لا يمكن حفظ الرسالة.' },
          { status: 400 }
        )
      }
    }

    const shipment = await Shipment.findById(id)
    if (!shipment) return NextResponse.json({ success: false, message: 'Shipment not found' }, { status:404 })

    const oldStatus = shipment.status
    const newStatus = status || oldStatus

    // 1. REVERSION SAFETY LOGIC (Received -> Draft)
    if (oldStatus === 'Received' && newStatus === 'Draft') {
      const units = await InventoryUnit.find({ shipmentId: id })
      const hasTouchedUnits = units.some(u => u.serialNumber !== null || u.status !== 'Available')
      
      if (hasTouchedUnits) {
        return NextResponse.json(
          { success: false, message: 'Cannot revert shipment. Inventory has already been processed or sold.' },
          { status: 400 }
        )
      }

      // Safe to revert: Delete placeholder units
      await InventoryUnit.deleteMany({ shipmentId: id })
    }

    // 2. GENERATION LOGIC (Draft -> Received)
    if (oldStatus !== 'Received' && newStatus === 'Received') {
      // Idempotency check
      const existingCount = await InventoryUnit.countDocuments({ shipmentId: id })
      if (existingCount === 0) {
        await generateInventoryUnits(shipment)
      }
    }

    // 3. UPDATE SHIPMENT
    const updatedShipment = await Shipment.findByIdAndUpdate(
      id,
      { status: newStatus, ...updates },
      { new: true }
    )

    return NextResponse.json({ success: true, shipment: updatedShipment })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[PUT /api/shipments]', msg)
    return dbError(msg)
  }
}
