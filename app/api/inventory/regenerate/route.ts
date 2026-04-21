import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Shipment from '@/models/Shipment'
import InventoryUnit from '@/models/InventoryUnit'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const { shipmentId } = await request.json()

    if (!shipmentId) {
      return NextResponse.json({ success: false, message: 'Missing shipmentId' }, { status: 400 })
    }

    const shipment = await Shipment.findById(shipmentId)
    if (!shipment) {
      return NextResponse.json({ success: false, message: 'Shipment not found' }, { status: 404 })
    }

    // Check if units already exist to prevent double generation
    const existingCount = await InventoryUnit.countDocuments({ shipmentId })
    if (existingCount > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'يوجد بالفعل وحدات مخزنة لهذه الرسالة. لا يمكن إعادة التوليد التلقائي لتجنب التكرار.' 
      }, { status: 400 })
    }

    // Regeneration Logic (Same as in api/shipments/route.ts)
    const unitsToCreate = []
    for (const item of shipment.items) {
      for (let i = 0; i < item.quantity; i++) {
        unitsToCreate.push({
          productId: item.productId,
          shipmentId: shipment._id,
          status: 'Available',
          landedCostEGP: item.landedUnitCostEGP,
          serialNumber: undefined,
        })
      }
    }

    if (unitsToCreate.length > 0) {
      await InventoryUnit.insertMany(unitsToCreate)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم إعادة توليد كروت المخزون بنجاح ✓',
      count: unitsToCreate.length 
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/inventory/regenerate]', msg)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
