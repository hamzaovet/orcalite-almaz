import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import InventoryUnit from '@/models/InventoryUnit'
import Product from '@/models/Product'
import Shipment from '@/models/Shipment'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()
    const { shipmentId, productId, quantity, attributes } = body
    
    if (!shipmentId || !productId || !quantity || quantity <= 0) {
      return NextResponse.json({ success: false, message: 'بيانات غير مكتملة أو صفرية' }, { status: 400 })
    }

    // Find non-scanned units
    const units = await InventoryUnit.find({
      shipmentId,
      productId,
      status: 'Pending'
    }).limit(Number(quantity))

    if (units.length < Number(quantity)) {
      return NextResponse.json({ success: false, message: 'الكمية المطلوبة أكبر من المتبقي للتوزيع في هذه الرسالة.' }, { status: 400 })
    }

    const timestamp = Date.now()
    const updates = units.map((u, index) => {
      const uniqueSerial = `BLK-${timestamp}-${index}`
      return {
        updateOne: {
          filter: { _id: u._id },
          update: {
            $set: {
              serialNumber: uniqueSerial,
              status: 'Available',
              attributes: attributes || {}
            }
          }
        }
      }
    })

    await InventoryUnit.bulkWrite(updates)

    // Phase 10.A.6 & 10.A.7: The True Backend Sync
    // 1. Get the true landed cost from the first unit allocated
    const landedCost = units[0]?.landedCostEGP || 0

    // 2. Extract Foreign Cost from original Shipment
    const shipment = await Shipment.findById(shipmentId)
    const shipmentItem = shipment?.items?.find((i: any) => String(i.productId) === String(productId))
    const unitPriceForeign = shipmentItem?.unitCostForeign || 0

    // 3. Fetch product to see if we need to auto-apply margins
    const product = await Product.findById(productId)
    if (product) {
      product.stock += Number(quantity)
      product.costPrice = landedCost
      if (unitPriceForeign > 0) {
        product.costForeign = unitPriceForeign
      }

      if (product.wholesaleMargin && product.wholesaleMargin > 0) {
         const newSellPrice = landedCost + (landedCost * (product.wholesaleMargin / 100))
         product.wholesalePriceEGP = newSellPrice
         product.price = newSellPrice
      }
      await product.save()
    } else {
      // Fallback if somehow not found, direct mongo update
      await Product.findByIdAndUpdate(productId, {
        $inc: { stock: Number(quantity) },
        $set: { costPrice: landedCost }
      })
    }

    return NextResponse.json({ success: true, message: `تم استلام كمية (${quantity}) بنجاح ✓` })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
