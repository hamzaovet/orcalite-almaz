import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import InventoryUnit from '@/models/InventoryUnit'
import Product from '@/models/Product'
import Shipment from '@/models/Shipment'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const { imei, shipmentId, productId, attributes } = body

    if (!imei || !productId) {
      return NextResponse.json(
        { success: false, message: 'Missing imei or productId' },
        { status: 400 }
      )
    }

    // 1. GLOBAL UNIQUE CHECK
    const existing = await InventoryUnit.findOne({ serialNumber: imei })
    if (existing) {
      return NextResponse.json(
        { success: false, message: `الإيميل ${imei} موجود بالفعل في النظام!` },
        { status: 409 }
      )
    }

    if (!shipmentId) {
      // B2C Direct Scan into stock
      // We assume Product stock was already handled by Purchases OR this is just a quick register
      const newUnit = new InventoryUnit({
        serialNumber: imei,
        productId,
        status: 'Available',
        locationType: 'MainWarehouse',
        landedCostEGP: 0, // Placeholder
        attributes
      })
      await newUnit.save()
      
      // Also increment Product Stock here to make sure B2C scanning adds to stock automatically
      await Product.findByIdAndUpdate(productId, { $inc: { stock: 1 } })
      
      return NextResponse.json({ 
        success: true, 
        message: 'تم إضافة الإيمي للمخزن وتسجيله بنجاح',
        remaining: 0
      })
    }

    // 2. FIND PLACEHOLDER FOR THIS SPECIFIC SHIPMENT AND PRODUCT
    // Find one where serialNumber is missing (undefined/null)
    const unit = await InventoryUnit.findOne({
      shipmentId,
      productId,
      $or: [
        { serialNumber: null },
        { serialNumber: { $exists: false } }
      ]
    })

    if (!unit) {
      return NextResponse.json(
        { success: false, message: 'لا يوجد مكان مخصص لهذا المنتج في هذه الرسالة. قد تكون استكملت كل الأرقام.' },
        { status: 404 }
      )
    }

    // Update unit
    unit.serialNumber = imei
    if (attributes) unit.attributes = attributes
    await unit.save()

    // 3. AUTO-COMPLETE SHIPMENT CHECK (Optional Logic)
    // Check if any units remain for this shipment without a serial number
    const remaining = await InventoryUnit.countDocuments({
      shipmentId,
      serialNumber: { $in: [null, undefined] }
    })

    if (remaining === 0) {
      await Shipment.findByIdAndUpdate(shipmentId, { status: 'Completed' })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم ربط السيريال بالشحنة بنجاح',
      remaining
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/inventory/scan]', msg)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
