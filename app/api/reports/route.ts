import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { StoreSettings } from '@/models/StoreSettings';
import Transaction from '@/models/Transaction';
import InventoryUnit from '@/models/InventoryUnit';
import Product from '@/models/Product';
import Supplier from '@/models/Supplier';
import Customer from '@/models/Customer';
import Purchase from '@/models/Purchase';
import Sale from '@/models/Sale';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 1. Base Branch Matching Logic
    const isValidBranch = branchId && branchId !== 'all' && branchId !== 'null' && branchId !== 'undefined' && branchId !== '';
    
    // Treasury Branch Match
    const treasuryMatch: any = {};
    if (isValidBranch) {
        treasuryMatch.branchId = new mongoose.Types.ObjectId(branchId);
    } else if (branchId === 'null') {
        treasuryMatch.branchId = { $exists: false };
    }

    // Inventory Branch Match
    const invMatch: any = { status: 'Available' };
    if (isValidBranch) {
        invMatch.locationId = new mongoose.Types.ObjectId(branchId);
    } else if (branchId === 'null') {
        invMatch.locationId = { $exists: false };
    }

    // Sales/Purchases Date Match
    const dateMatch: any = {};
    if ((startDate && startDate !== 'undefined') || (endDate && endDate !== 'undefined')) {
        dateMatch.date = {};
        if (startDate && startDate !== 'undefined') dateMatch.date.$gte = new Date(startDate);
        if (endDate && endDate !== 'undefined') {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateMatch.date.$lte = end;
        }
    }

    // --- AGGREGATIONS ---

    // A. Treasury Balance (Current Liquidity)
    // IMPORTANT: exclude SupplierLedger entries — those are accounting-only, not real cash
    const treasuryAgg = await Transaction.aggregate([
        { $match: { ...treasuryMatch, entityType: { $nin: ['SupplierLedger', 'System_Forex_Adjustment'] } } },
        { $group: { _id: null, totalIn: { $sum: { $cond: [{ $eq: ["$type", "IN"] }, "$amount", 0] } }, totalOut: { $sum: { $cond: [{ $eq: ["$type", "OUT"] }, "$amount", 0] } } } }
    ]);
    const treasuryBalance = (treasuryAgg[0]?.totalIn || 0) - (treasuryAgg[0]?.totalOut || 0);

    // B. Ending Inventory Value — computed from Product.stock × costPrice
    // (InventoryUnit is only for serialized/shipment items, not regular stock purchases)
    const productInvMatch: any = { stock: { $gt: 0 } };
    if (isValidBranch) productInvMatch.branchId = new mongoose.Types.ObjectId(branchId);
    const inventoryAgg = await Product.aggregate([
        { $match: productInvMatch },
        { $group: { _id: null, totalValue: { $sum: { $multiply: ['$stock', { $ifNull: ['$costPrice', 0] }] } } } }
    ]);
    const endingInventoryValue = inventoryAgg[0]?.totalValue || 0;

    // C. Live Debts (Global - Excludes Technical Opening Balances)
    const supplierAgg = await Supplier.aggregate([
        { $match: { name: { $not: /افتتاحي/ } } },
        { $group: { _id: null, totalDebt: { $sum: { $toDecimal: "$balance" } } } }
    ]);
    const totalSupplierDebts = Number(supplierAgg[0]?.totalDebt || 0);

    const customerAgg = await Customer.aggregate([{ $group: { _id: null, totalDebt: { $sum: { $toDecimal: "$balance" } } } }]);
    const totalCustomerDebts = Number(customerAgg[0]?.totalDebt || 0);

    // D. Capital Calculation
    const totalAssets = treasuryBalance + endingInventoryValue + totalCustomerDebts;
    const totalLiabilities = totalSupplierDebts;
    const workingCapital = totalAssets - totalLiabilities;

    // E. P&L / COGS Engine
    const settings = await StoreSettings.findOne() || { currentOpeningInventoryValue: 0 };
    const openingStock = settings.currentOpeningInventoryValue || 0;

    // Purchases for Period (excluding Opening Balances)
    const purchasesQuery = { ...dateMatch, status: { $ne: 'Cancelled' } };
    if (isValidBranch) { 
      purchasesQuery.branchId = new mongoose.Types.ObjectId(branchId);
    } else if (branchId === 'null') {
      purchasesQuery.branchId = { $exists: false };
    }
    const purchasesAgg = await Purchase.aggregate([
        { $match: { ...purchasesQuery, isOpeningBalance: { $ne: true } } },
        { $group: { _id: null, totalPurchases: { $sum: "$totalAmount" } } }
    ]);
    const periodPurchases = purchasesAgg[0]?.totalPurchases || 0;

    // Sales for Period
    const salesQuery = { ...dateMatch, status: { $ne: 'Cancelled' } };
    if (isValidBranch) {
      salesQuery.branchId = new mongoose.Types.ObjectId(branchId);
    } else if (branchId === 'null') {
      salesQuery.branchId = { $exists: false };
    }
    const salesAgg = await Sale.aggregate([
        { $match: salesQuery },
        { $group: { _id: null, totalRevenues: { $sum: "$totalAmount" } } }
    ]);
    const periodRevenues = salesAgg[0]?.totalRevenues || 0;

    const cogs = openingStock + periodPurchases - endingInventoryValue;
    const grossProfit = periodRevenues - cogs;

    return NextResponse.json({
      success: true,
      data: {
        assets: { treasury: treasuryBalance, inventory: endingInventoryValue, customers: totalCustomerDebts, total: totalAssets },
        liabilities: { suppliers: totalSupplierDebts, total: totalLiabilities },
        capital: { workingCapital },
        pnl: { openingStock, purchases: periodPurchases, cogs, revenues: periodRevenues, grossProfit }
      }
    });

  } catch (error: any) {
    console.error('[GET /api/reports]', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
