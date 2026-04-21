import { NextRequest, NextResponse } from 'next/server';
import Product from '@/models/Product';
import { connectDB } from '@/lib/db';
import InventoryUnit from '@/models/InventoryUnit';

export async function POST(req: NextRequest) {
  try {
    const { serials } = await req.json();
    if (!Array.isArray(serials) || serials.length === 0) {
      return NextResponse.json({ success: true, existing: [] });
    }

    await connectDB();
    
    // Check both Products (pre-defined serials) and InventoryUnits (actual stock in branches)
    const [existingProds, existingUnits] = await Promise.all([
      Product.find({ serialNumber: { $in: serials } }).select('serialNumber'),
      InventoryUnit.find({ serialNumber: { $in: serials } }).select('serialNumber')
    ]);

    const foundSerials = new Set<string>();
    existingProds.forEach(p => { if (p.serialNumber) foundSerials.add(p.serialNumber); });
    existingUnits.forEach(u => { if (u.serialNumber) foundSerials.add(u.serialNumber); });

    return NextResponse.json({
      success: true,
      existing: Array.from(foundSerials)
    });

  } catch (error: any) {
    console.error('[CHECK_SERIALS_ERROR]', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
