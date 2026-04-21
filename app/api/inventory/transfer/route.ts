import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import InventoryUnit from '@/models/InventoryUnit'
import TransferOrder from '@/models/TransferOrder'
import Branch from '@/models/Branch'
import mongoose from 'mongoose'

function fail(msg: string, status = 400) {
  return NextResponse.json({ success: false, message: msg }, { status })
}

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const branchId = req.nextUrl.searchParams.get('branchId')
    
    let query: any = {}
    if (branchId && branchId !== 'all') {
      query.toLocationId = branchId
    }

    const orders = await TransferOrder.find(query)
    .populate({
      path: 'items',
      populate: { path: 'productId', select: 'name' }
    })
    .sort({ date: -1 })
    .lean()

    return NextResponse.json({ success: true, orders })
  } catch (err: any) {
    return fail(err.message, 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { targetBranchId, mode, imeis, notes } = await req.json()

    if (!targetBranchId) return fail('معرف الجهة مطلوب')
    if (!imeis || !Array.isArray(imeis) || imeis.length === 0) return fail('يرجى مسح الأجهزة أولاً')

    const targetBranch = await Branch.findById(targetBranchId)
    if (!targetBranch) return fail('الجهة المستهدفة غير موجودة')

    // Ensure models are initialized to avoid "catalog changes" errors in transactions
    await Promise.all([
      InventoryUnit.init(),
      TransferOrder.init(),
      Branch.init()
    ])

    // Start Session for Atomicity
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
      const unitIds: mongoose.Types.ObjectId[] = []
      let totalValue = 0

      for (const imei of imeis) {
        const unit = await InventoryUnit.findOne({ serialNumber: imei.trim() })
          .populate({ path: 'productId', select: 'price costPrice' })
          .session(session)
        
        if (!unit) {
          throw new Error(`الجهاز ${imei} غير مسجل في النظام`)
        }

        // Add to total
        const product = unit.productId as any
        const itemValue = product?.price || product?.costPrice || (unit as any).landedCostEGP || 0
        totalValue += itemValue

        if (mode === 'Out') {
          // Outbound: Must be in MainWarehouse and Available
          if (unit.locationId) {
             throw new Error(`الجهاز ${imei} مسجل بالفعل في عهدة جهة أخرى`)
          }
          if (unit.status !== 'Available') {
             throw new Error(`الجهاز ${imei} غير متاح للتحويل (الحالة: ${unit.status})`)
          }

          unit.locationId = targetBranchId
          unit.locationType = targetBranch.type as any
          unit.status = 'WithDistributor'
        } else {
          // Inbound: Must be currently at the target branch
          if (String(unit.locationId) !== String(targetBranchId)) {
             throw new Error(`الجهاز ${imei} غير موجود في عهدة هذه الجهة للإرجاع`)
          }

          unit.locationId = null
          unit.locationType = 'MainWarehouse'
          unit.status = 'Available'
        }

        await unit.save({ session })
        unitIds.push(unit._id as mongoose.Types.ObjectId)
      }

      // Generate Transfer Order
      const orderNumber = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
      await TransferOrder.create([{
        orderNumber,
        fromLocationType: mode === 'Out' ? 'MainWarehouse' : targetBranch.type,
        toLocationType: mode === 'Out' ? targetBranch.type : 'MainWarehouse',
        toLocationId: targetBranchId,
        status: 'Completed',
        items: unitIds,
        totalValue,
        notes: notes || (mode === 'Out' ? 'صرف بضاعة' : 'مرتجع عُهدة'),
        date: new Date()
      }], { session })

      await session.commitTransaction()
      session.endSession()

      return NextResponse.json({ 
        success: true, 
        message: mode === 'Out' ? 'تم تحويل العُهدة بنجاح ✓' : 'تم استلام العُهدة بنجاح ✓',
        orderNumber 
      })

    } catch (err: any) {
      await session.abortTransaction()
      session.endSession()
      return fail(err.message)
    }

  } catch (err: any) {
    console.error('[POST /api/inventory/transfer]', err)
    return fail('حدث خطأ داخلي في الخادم', 500)
  }
}
