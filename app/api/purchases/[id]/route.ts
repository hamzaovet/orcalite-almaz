import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Purchase from '@/models/Purchase'
import Product from '@/models/Product'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    
    const purchase = await Purchase.findById(id)
      .populate('items.productId')
      .lean()

    if (!purchase) {
      return NextResponse.json({ success: false, message: 'الفاتورة غير موجودة' }, { status: 404 })
    }

    return NextResponse.json({ success: true, purchase })
  } catch (error) {
    console.error('[GET /api/purchases/[id]]', error)
    return NextResponse.json({ success: false, message: 'فشل تحميل بيانات الفاتورة' }, { status: 500 })
  }
}
