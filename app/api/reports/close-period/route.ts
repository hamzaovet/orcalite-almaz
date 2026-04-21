import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import InventoryUnit from '@/models/InventoryUnit'
import { StoreSettings } from '@/models/StoreSettings'

export async function POST() {
  try {
    await connectDB()

    // 1. Calculate Global Total Inventory Value (Strict Use of InventoryUnit)
    const inventoryAgg = await InventoryUnit.aggregate([
      { $match: { status: 'Available' } },
      { 
        $group: { 
          _id: null, 
          totalValue: { 
            $sum: { 
              $multiply: ["$quantity", { $ifNull: ["$landedCostEGP", 0] }] 
            } 
          } 
        } 
      }
    ])

    const currentInventoryValue = inventoryAgg[0]?.totalValue || 0

    // 2. Save to StoreSettings
    let settings = await StoreSettings.findOne()
    if (!settings) {
      settings = await StoreSettings.create({
        whatsappNumber: '201129592916',
        nextInvoiceNumber: 1,
        currentOpeningInventoryValue: currentInventoryValue
      })
    } else {
      settings.currentOpeningInventoryValue = currentInventoryValue
      await settings.save()
    }

    return NextResponse.json({
      success: true,
      message: 'تم إغلاق الفترة وحفظ مخزون أول المدة بنجاح',
      openingInventoryValue: currentInventoryValue
    })

  } catch (error: any) {
    console.error('[POST /api/reports/close-period]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
