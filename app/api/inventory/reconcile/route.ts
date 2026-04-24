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
    const locId = (branchId && branchId !== 'all' && branchId !== 'null')
      ? new Types.ObjectId(branchId)
      : null;
    const locType = locId ? 'Branch' : 'MainWarehouse';

    const modifiedProductIds = new Set<string>();

    for (const item of items) {
      if (!item.productId) continue;
      const productId = new Types.ObjectId(item.productId);
      modifiedProductIds.add(item.productId);

      // ── Determine if this unit is serialized ─────────────────────────────────
      // Priority: explicit flag sent by the frontend, then fall back to serial presence
      const isSerialized: boolean =
        item.isSerialized !== undefined
          ? Boolean(item.isSerialized)
          : Boolean(item.serial && String(item.serial).trim().length > 3);

      const serial: string = isSerialized ? String(item.serial || '').trim() : '';

      // Normalise battery: "85%" → 85, 85 → 85
      const rawBattery = String(item.battery || '').replace(/\D/g, '');
      const batteryHealth = rawBattery ? parseInt(rawBattery, 10) : undefined;

      // Normalise condition (DB enum: 'New' | 'Used')
      const rawCond = String(item.condition || 'New');
      const condition: 'New' | 'Used' = rawCond === 'Used' ? 'Used' : 'New';

      const landedCost = Number(item.cost) || 0;

      if (isSerialized && serial) {
        // ── SERIALIZED UNIT: one InventoryUnit per physical device ──────────────
        // Each has a unique serialNumber that IS its identity.
        await InventoryUnit.findOneAndUpdate(
          { serialNumber: serial },
          {
            $set: {
              productId,
              serialNumber: serial,
              status: 'Available',
              locationType: locType,
              locationId: locId,
              landedCostEGP: landedCost,
              quantity: 1,                       // Always 1 for a serialized unit
              'attributes.condition': condition,
              'attributes.storage': item.storage || undefined,
              'attributes.color': item.color || undefined,
              'attributes.batteryHealth': batteryHealth,
              'attributes.notes': item.notes || undefined,
            }
          },
          { upsert: true, new: true }
        );
      } else {
        // ── BULK UNIT (Accessories / Non-serialized) ────────────────────────────
        // One InventoryUnit per (Product + Location + Spec combo).
        const filter: any = {
          productId,
          locationId: locId,
          'attributes.storage': item.storage || undefined,
          'attributes.color': item.color || undefined,
          'attributes.condition': condition,
        };

        const existing = await InventoryUnit.findOne(filter);
        const physicalQty = Number(item.qty) || 0;

        if (existing) {
          // STRICT OVERWRITE: the physical count is the final truth
          existing.quantity = physicalQty;
          existing.landedCostEGP = landedCost || existing.landedCostEGP;
          existing.attributes.notes = item.notes;
          existing.status = 'Available';
          await existing.save();
        } else {
          // Create a new bulk InventoryUnit with a synthetic serial key
          await InventoryUnit.create({
            serialNumber: 'BULK-' + new Types.ObjectId().toString(),
            productId,
            status: 'Available',
            locationType: locType,
            locationId: locId,
            landedCostEGP: landedCost,
            quantity: physicalQty,
            attributes: {
              condition,
              storage: item.storage || undefined,
              color: item.color || undefined,
              notes: item.notes || undefined,
            }
          });
        }
      }
    }

    // ── Recalculate Product.stock for every affected product ──────────────────
    for (const pId of modifiedProductIds) {
      const units = await InventoryUnit.find({
        productId: new Types.ObjectId(pId),
        status: 'Available'
      });
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
