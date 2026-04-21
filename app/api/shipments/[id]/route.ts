import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Shipment from '@/models/Shipment'
import InventoryUnit from '@/models/InventoryUnit'

/**
 * DELETE /api/shipments/[id]
 * Cascading deletion of a shipment and its associated inventory units.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const resolvedParams = await params
    const id = resolvedParams.id

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing shipment ID' }, { status: 400 })
    }

    // 1. INTEGRITY CHECK
    // Check if any inventory units linked to this shipment have been processed beyond 'Available'
    const units = await InventoryUnit.find({ shipmentId: id })
    const hasActiveUnits = units.some(u => u.status === 'Sold' || u.status === 'RMA' || u.status === 'Reserved')

    if (hasActiveUnits) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'لا يمكن حذف هذه الرسالة لأن بعض الوحدات المرتبطة بها تم بيعها أو حجزها بالفعل. سيؤدي هذا إلى خلل في السجلات المالية.' 
        }, 
        { status: 400 }
      )
    }

    // 2. CASCADING DELETION
    // Delete all associated units first (placeholders or scanned)
    await InventoryUnit.deleteMany({ shipmentId: id })
    
    // Delete the shipment itself
    const deletedShipment = await Shipment.findByIdAndDelete(id)

    if (!deletedShipment) {
      return NextResponse.json({ success: false, message: 'الرسالة غير موجودة في النظام.' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم حذف الرسالة وكافة كروت المخزون المرتبطة بها بنجاح ✓' 
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[DELETE /api/shipments/${params.id}]`, msg)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
