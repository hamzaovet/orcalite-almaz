import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import InventoryUnit from '@/models/InventoryUnit';
import Product from '@/models/Product';
import Category from '@/models/Category';

/**
 * POST /api/inventory/physical-count
 *
 * Body:
 *  {
 *    branchId: string | null,         // target location (null = MainWarehouse)
 *    items: [{
 *      productId: string,
 *      physicalQty: number,           // what the user physically counted
 *    }],
 *    confirm: boolean                 // false → dry-run (variance report only)
 *                                     // true  → commit changes to DB
 *  }
 *
 * Response (always returned, even for confirm=true):
 *  {
 *    success: true,
 *    variances: [{
 *      productId, productName, category,
 *      systemQty,   // what the DB thinks is there
 *      physicalQty, // what the user counted
 *      diff,        // physicalQty - systemQty  (negative = shortage, positive = surplus)
 *      status: 'match' | 'shortage' | 'surplus',
 *      avgCost,
 *      impactEGP    // monetary impact of the variance
 *    }],
 *    committed: boolean
 *  }
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { branchId, items, confirm = false } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'لا توجد عناصر في الجرد' },
        { status: 400 }
      );
    }

    const { Types } = mongoose;
    const locId = (branchId && branchId !== 'all' && branchId !== 'null')
      ? new Types.ObjectId(branchId)
      : null;
    const locType = locId ? 'Branch' : 'MainWarehouse';

    const variances: any[] = [];

    for (const item of items) {
      if (!item.productId) continue;
      const productId = new Types.ObjectId(item.productId);
      const physicalQty = Number(item.physicalQty) ?? 0;

      // ── Fetch the current system stock for this product at this location ──
      const locationFilter: any = locId
        ? { productId, locationId: locId, status: 'Available' }
        : { productId, locationType: 'MainWarehouse', status: 'Available' };

      const systemUnits = await InventoryUnit.find(locationFilter).lean();
      const systemQty = systemUnits.reduce((s, u) => s + (u.quantity || 0), 0);
      const diff = physicalQty - systemQty;

      // Average cost per unit at this location
      const totalCost = systemUnits.reduce((s, u) => s + ((u.landedCostEGP || 0) * (u.quantity || 0)), 0);
      const avgCost = systemQty > 0 ? totalCost / systemQty : 0;
      const impactEGP = Math.abs(diff) * avgCost;

      // Fetch product info for the report
      const product = await Product.findById(productId)
        .populate({ path: 'categoryId', model: Category, select: 'name' })
        .lean() as any;

      const status: 'match' | 'shortage' | 'surplus' =
        diff === 0 ? 'match' : diff < 0 ? 'shortage' : 'surplus';

      variances.push({
        productId: item.productId,
        productName: product?.name || 'غير معروف',
        category: product?.categoryId?.name || product?.category || '---',
        systemQty,
        physicalQty,
        diff,
        status,
        avgCost: Math.round(avgCost),
        impactEGP: Math.round(impactEGP),
      });

      // ── If confirm=true: apply the adjustment ─────────────────────────────
      if (confirm && diff !== 0) {
        const isSerialized = Boolean(product?.isSerialized ?? product?.hasSerialNumbers);

        if (isSerialized) {
          // For serialized products: we can only flag a shortage (units may be lost/missing).
          // We don't auto-create serialized units — they need real serials.
          // For surplus: treat as advisory only; human must scan the actual devices.
          // This route handles non-serialized (bulk) adjustments automatically.
          // Serialized shortages are handled by marking units as 'RMA' or removing via other flows.
          // → Do nothing automatically; caller should use reconcile for full serialized recount.
        } else {
          // For bulk/accessories: directly adjust the InventoryUnit quantity
          const existing = await InventoryUnit.findOne(locationFilter);

          if (existing) {
            if (physicalQty === 0) {
              // Remove the unit record entirely if count is 0
              await InventoryUnit.deleteOne({ _id: existing._id });
            } else {
              existing.quantity = physicalQty;
              await existing.save();
            }
          } else if (physicalQty > 0) {
            // Create a new bulk unit if physical count reveals uncounted stock
            await InventoryUnit.create({
              serialNumber: 'BULK-' + new Types.ObjectId().toString(),
              productId,
              status: 'Available',
              locationType: locType,
              locationId: locId,
              landedCostEGP: avgCost || product?.costPrice || 0,
              quantity: physicalQty,
              attributes: {
                condition: 'New',
                notes: 'تسوية من الجرد اليدوي',
              }
            });
          }

          // Recalculate Product.stock
          const updatedUnits = await InventoryUnit.find({ productId, status: 'Available' });
          const newTotal = updatedUnits.reduce((s, u) => s + (u.quantity || 0), 0);
          await Product.findByIdAndUpdate(productId, { $set: { stock: newTotal } });
        }
      }
    }

    return NextResponse.json({
      success: true,
      variances,
      committed: Boolean(confirm),
      hasDifferences: variances.some(v => v.status !== 'match'),
    });

  } catch (error: any) {
    console.error('[POST /api/inventory/physical-count]', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * GET /api/inventory/physical-count?branchId=...
 * Returns current available inventory grouped by product for a given location.
 * Used to pre-populate the physical count form.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    const { Types } = mongoose;
    const locId = (branchId && branchId !== 'all' && branchId !== 'null')
      ? new Types.ObjectId(branchId)
      : null;

    const locationFilter: any = locId
      ? { locationId: locId, status: 'Available' }
      : { locationType: 'MainWarehouse', status: 'Available' };

    const units = await InventoryUnit.find(locationFilter)
      .populate({
        path: 'productId', model: Product,
        select: 'name category isSerialized hasSerialNumbers costPrice categoryId',
        populate: { path: 'categoryId', model: Category, select: 'name' }
      })
      .lean() as any[];

    // Aggregate by productId
    const productMap: Record<string, any> = {};
    for (const unit of units) {
      const pid = String(unit.productId?._id || unit.productId);
      if (!productMap[pid]) {
        productMap[pid] = {
          productId: pid,
          productName: unit.productId?.name || 'غير معروف',
          category: unit.productId?.categoryId?.name || unit.productId?.category || '---',
          isSerialized: unit.productId?.isSerialized ?? unit.productId?.hasSerialNumbers ?? true,
          systemQty: 0,
          avgCost: 0,
          totalCost: 0,
        };
      }
      productMap[pid].systemQty += (unit.quantity || 0);
      productMap[pid].totalCost += (unit.landedCostEGP || 0) * (unit.quantity || 0);
    }

    // Calculate avg cost
    const result = Object.values(productMap).map(p => ({
      ...p,
      avgCost: p.systemQty > 0 ? Math.round(p.totalCost / p.systemQty) : 0,
    }));

    return NextResponse.json({ success: true, inventory: result });
  } catch (error: any) {
    console.error('[GET /api/inventory/physical-count]', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
