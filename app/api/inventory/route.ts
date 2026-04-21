import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import InventoryUnit from '@/models/InventoryUnit'
import Product from '@/models/Product'
import Shipment from '@/models/Shipment'
import Category from '@/models/Category'

/** Shared error response */
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

/* ── GET /api/inventory ────────────────────────────────────── */
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const shipmentId = searchParams.get('shipmentId')
    const serialNumber = searchParams.get('serialNumber')
    const status = searchParams.get('status')
    const locationId = searchParams.get('locationId') // ADDED THIS

    const filter: any = {}
    if (productId) filter.productId = productId
    if (shipmentId) filter.shipmentId = shipmentId
    if (serialNumber) filter.serialNumber = serialNumber
    if (status)    filter.status = status
    if (locationId) filter.locationId = locationId // ADDED THIS

    const units = await InventoryUnit.find(filter)
      .populate({
        path: 'productId', model: Product,
        select: 'name price sellingPrice wholesalePriceEGP costPrice hasSerialNumbers categoryId category brand stock',
        populate: { path: 'categoryId', model: Category, select: 'name' }
      })
      .populate({ path: 'shipmentId', model: Shipment, select: 'shipmentNumber' })
      .populate({ path: 'locationId', select: 'name' })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ success: true, units })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[GET /api/inventory]', msg)
    return dbError(msg)
  }
}
