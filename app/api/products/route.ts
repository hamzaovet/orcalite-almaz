import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/models/Product'
import Category from '@/models/Category'
import Branch from '@/models/Branch'
import Supplier from '@/models/Supplier'
import { StoreSettings } from '@/models/StoreSettings'

/** Shared error response for any DB failure */
function dbError(detail?: string) {
  return NextResponse.json(
    {
      success: false,
      message: detail || 'تعذر معالجة الطلب في قاعدة البيانات. يرجى التحقق من صحة البيانات.',
      detail,
    },
    { status: 400 }
  )
}

/* ── GET /api/products ─────────────────────────────────────── */
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const isAdmin = request.cookies.has('orca_auth')
    
    // Build query. Hide costPrice if not an admin.
    const query = Product.find({}).sort({ createdAt: -1 })
      .populate({ path: 'categoryId', model: Category })
      .populate({ path: 'supplierId', model: Supplier })
      .populate({ path: 'branchId', model: Branch })
    if (!isAdmin) query.select('-costPrice -costForeign -wholesaleMargin')
    
    const products = await query.lean()
    return NextResponse.json({ success: true, products })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[GET /api/products]', msg)
    return dbError(msg)
  }
}

/* ── POST /api/products ────────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json();
    
    // 1. CLEANUP MONGOOSE CAST ERRORS FIRST
    if (body.supplierId === '') body.supplierId = null;
    if (body.branchId === '')   body.branchId = null;
    if (body.categoryId === '') body.categoryId = null;
    // Sparse index fix: empty string is NOT the same as null — must be undefined
    if (body.serialNumber === '' || body.serialNumber === null) body.serialNumber = undefined;

    // 2. CORRECT DESTRUCTURING (WITH CONST)
    const { 
      name, category, categoryId, price, stock, costPrice, condition, serialNumber, storage, color, 
      batteryHealth, supplierId, isSerialized, branchId, ownershipType,
      costForeign, wholesaleMargin, description, taxPercentage, taxType, taxValue
    } = body;

    const normalizedCondition = String(condition || 'new').toLowerCase() as 'new' | 'used'
    
    let tAmt = 0;
    const resolvedTaxType = taxType || 'PERCENTAGE';
    const resolvedTaxValue = Number(taxValue || taxPercentage || 0);

    if (resolvedTaxType === 'PERCENTAGE') {
      tAmt = Number(price || 0) * (resolvedTaxValue / 100);
    } else {
      tAmt = resolvedTaxValue;
    }

    if (!name || (!category && !categoryId) || price == null || stock == null) {
      return NextResponse.json(
        { success: false, message: 'الحقول المطلوبة: name, category/categoryId, price, stock' },
        { status: 400 }
      )
    }

    // Fetch exchange rate for calculation
    const settings = await StoreSettings.findOne()
    const rate = settings?.exchangeRate || 1
    const wEGP = (costForeign && wholesaleMargin !== undefined) 
      ? Number(costForeign) * rate * (1 + Number(wholesaleMargin) / 100)
      : 0

    // CEO PHASE 68: BULK SKU GENERATOR
    let finalSerial = serialNumber;
    if (!finalSerial || finalSerial === 'بدون' || finalSerial === 'لا يوجد' || String(finalSerial).trim() === '') {
      const { Types } = require('mongoose');
      finalSerial = 'BULK-' + new Types.ObjectId().toString();
    }

    const product = await Product.create({
      name:     String(name).trim(),
      category: String(category).trim(),
      price:    Number(price),
      costPrice:costPrice != null ? Number(costPrice) : 0,
      stock:    Number(stock),
      categoryId: categoryId || undefined,
      condition: normalizedCondition,
      description: description ? String(description).trim() : '',
      specs:    body.specs    ? String(body.specs).trim()    : undefined,
      imageUrl: body.imageUrl ? String(body.imageUrl).trim() : undefined,
      badge:    body.badge    ? String(body.badge).trim()    : undefined,
      serialNumber: finalSerial, // Use Bulk SKU
      storage:  storage ? String(storage).trim() : undefined,
      color:    color ? String(color).trim() : undefined,
      batteryHealth: batteryHealth ? String(batteryHealth).trim() : undefined,
      supplierId: supplierId ? supplierId : undefined,
      isSerialized: isSerialized !== undefined ? Boolean(isSerialized) : (body.hasSerialNumbers !== undefined ? Boolean(body.hasSerialNumbers) : true),
      hasSerialNumbers: body.hasSerialNumbers !== undefined ? Boolean(body.hasSerialNumbers) : (isSerialized !== undefined ? Boolean(isSerialized) : true),
      branchId: branchId ? branchId : undefined,
      ownershipType: ownershipType ? String(ownershipType) : 'Owned',
      // Wholesale
      costForeign: costForeign != null ? Number(costForeign) : 0,
      wholesaleMargin: wholesaleMargin != null ? Number(wholesaleMargin) : 0,
      wholesalePriceEGP: wEGP,
      taxType: resolvedTaxType,
      taxValue: resolvedTaxValue,
      taxPercentage: resolvedTaxType === 'PERCENTAGE' ? resolvedTaxValue : 0,
      taxAmountEGP:  tAmt
    })

    return NextResponse.json({ success: true, product }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/products]', msg)
    return dbError(msg)
  }
}

/* ── DELETE /api/products?id=… ─────────────────────────────── */
export async function DELETE(request: NextRequest) {
  try {
    await connectDB()
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'معرّف المنتج (id) مطلوب' },
        { status: 400 }
      )
    }

    await Product.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[DELETE /api/products]', msg)
    return dbError(msg)
  }
}

/* ── PUT /api/products ─────────────────────────────────────── */
export async function PUT(request: Request) {
  try {
    await connectDB()
    const body = await request.json();

    // 1. CLEANUP MONGOOSE CAST ERRORS FIRST
    if (body.supplierId === '') body.supplierId = null;
    if (body.branchId === '')   body.branchId = null;
    if (body.categoryId === '') body.categoryId = null;
    // Sparse index fix: empty string serialNumber must become undefined, not ""
    if (body.serialNumber === '' || body.serialNumber === null) body.serialNumber = undefined;

    const { _id, id, ...updateData } = body;
    const targetId = _id || id;

    if (!targetId) {
      return NextResponse.json({ success: false, message: 'Missing product ID' }, { status: 400 })
    }

    // If updating wholesale fields, recalculate wholesalePriceEGP from TRUE landed cost
    if (updateData.costForeign !== undefined || updateData.wholesaleMargin !== undefined || updateData.costPrice !== undefined) {
      const current = await Product.findById(targetId)
      if (current) {
        // Use true landed (costPrice) as the base if present, else fall back to foreign × rate
        const settings = await StoreSettings.findOne()
        const rate = settings?.exchangeRate || 1
        const trueLanded = updateData.costPrice !== undefined ? Number(updateData.costPrice) : (current.costPrice || 0)
        const cF = updateData.costForeign !== undefined ? Number(updateData.costForeign) : (current.costForeign || 0)
        const baseCost = trueLanded > 0 ? trueLanded : (cF * rate)
        const wM = updateData.wholesaleMargin !== undefined ? Number(updateData.wholesaleMargin) : (current.wholesaleMargin || 0)
        updateData.wholesalePriceEGP = baseCost * (1 + wM / 100)
      }
    }

    if (updateData.condition) {
      updateData.condition = String(updateData.condition).toLowerCase()
    }

    if (updateData.isSerialized !== undefined) {
      updateData.hasSerialNumbers = Boolean(updateData.isSerialized)
    }

    // Recalculate taxAmountEGP if price, taxPercentage, taxType, or taxValue changes
    if (updateData.price !== undefined || updateData.taxPercentage !== undefined || updateData.taxValue !== undefined || updateData.taxType !== undefined) {
      const current = await Product.findById(targetId)
      if (current) {
        const p = updateData.price !== undefined ? Number(updateData.price) : (current.price || 0)
        const tType = updateData.taxType !== undefined ? updateData.taxType : (current.taxType || 'PERCENTAGE')
        const tVal = updateData.taxValue !== undefined ? Number(updateData.taxValue) : (updateData.taxPercentage !== undefined ? Number(updateData.taxPercentage) : (current.taxValue || current.taxPercentage || 0))
        
        if (tType === 'PERCENTAGE') {
          updateData.taxAmountEGP = p * (tVal / 100)
          updateData.taxPercentage = tVal
        } else {
          updateData.taxAmountEGP = tVal
          updateData.taxPercentage = 0
        }
        updateData.taxType = tType
        updateData.taxValue = tVal
      }
    }

    // CEO PHASE 68: BULK SKU GENERATOR FOR UPDATES
    if (updateData.serialNumber) {
      const sn = String(updateData.serialNumber).trim();
      if (!sn || sn === 'بدون' || sn === 'لا يوجد') {
        const { Types } = require('mongoose');
        updateData.serialNumber = 'BULK-' + new Types.ObjectId().toString();
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      targetId,
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!updatedProduct) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: updatedProduct })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[PUT /api/products]', msg)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
