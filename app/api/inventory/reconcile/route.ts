import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import InventoryUnit from '@/models/InventoryUnit';
import Product from '@/models/Product';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { items, branchId } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, message: 'No items provided for reconciliation' }, { status: 400 });
    }

    const { Types } = mongoose;
    const locId = (branchId && branchId !== 'all' && branchId !== 'null') ? new Types.ObjectId(branchId) : null;
    const locType = locId ? 'Branch' : 'MainWarehouse';

    const modifiedProductIds = new Set<string>();

    for (const item of items) {
      const productId = new Types.ObjectId(item.productId);
      modifiedProductIds.add(item.productId);

      const isBulk = item.serial === 'لا يوجد' || !item.serial || String(item.serial).startsWith('BULK-');
      
      if (!isBulk) {
        // --- SERIALIZED RECONCILIATION ---
        // Overwrite or Create based on Serial Number
        await InventoryUnit.findOneAndUpdate(
          { serialNumber: item.serial },
          {
            $set: {
              productId: productId,
              status: 'Available',
              locationType: locType,
              locationId: locId,
              landedCostEGP: Number(item.cost) || 0,
              quantity: 1,
              'attributes.condition': item.condition || 'New',
              'attributes.storage': item.storage || undefined,
              'attributes.color': item.color || undefined,
              'attributes.batteryHealth': item.battery ? parseInt(String(item.battery).replace(/\D/g, ''), 10) : undefined,
              'attributes.notes': item.notes
            }
          },
          { upsert: true, new: true }
        );
      } else {
        // --- BULK RECONCILIATION (ACCESSORIES) ---
        // Overwrite quantity for the matching set (Product + Location + Spec)
        const filter: any = {
          productId: productId,
          locationId: locId,
          'attributes.storage': item.storage || undefined,
          'attributes.color': item.color || undefined,
          'attributes.condition': item.condition || 'New'
        };

        const existing = await InventoryUnit.findOne(filter);

        if (existing) {
          // STRICT OVERWRITE: The physical count is the final truth
          existing.quantity = Number(item.qty) || 0;
          existing.landedCostEGP = Number(item.cost) || existing.landedCostEGP;
          existing.attributes.notes = item.notes;
          existing.status = 'Available';
          await existing.save();
        } else {
          // CREATE NEW BULK UNIT
          await InventoryUnit.create({
            serialNumber: 'BULK-' + new Types.ObjectId().toString(),
            productId: productId,
            status: 'Available',
            locationType: locType,
            locationId: locId,
            landedCostEGP: Number(item.cost) || 0,
            quantity: Number(item.qty) || 0,
            attributes: {
              condition: item.condition || 'New',
              storage: item.storage || undefined,
              color: item.color || undefined,
              notes: item.notes
            }
          });
        }
      }
    }

    // --- ATOMIC STOCK RECOVERY ---
    // Recalculate global Product.stock for all affected products
    for (const pId of modifiedProductIds) {
      const units = await InventoryUnit.find({ productId: new Types.ObjectId(pId), status: 'Available' });
      const totalStock = units.reduce((sum, u) => sum + (u.quantity || 0), 0);
      await Product.findByIdAndUpdate(pId, { $set: { stock: totalStock } });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Physical reconciliation complete. Stock totals recalculated.',
      itemCount: items.length
    });

  } catch (error: any) {
    console.error('[POST /api/inventory/reconcile]', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
