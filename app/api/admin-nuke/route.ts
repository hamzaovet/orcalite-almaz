import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// Models to clear
import Transaction from '@/models/Transaction'
import Shipment from '@/models/Shipment'
import InventoryUnit from '@/models/InventoryUnit'
import Product from '@/models/Product'
import MerchantContact from '@/models/MerchantContact'
import Expense from '@/models/Expense'
import Sale from '@/models/Sale'

export async function POST(req: Request) {
  try {
    await connectDB()
    
    // Auth Check
    const cookies = req.headers.get('cookie') || ''
    const match = cookies.match(/orca_auth=([^;]+)/)
    const token = match ? match[1] : null

    if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

    const payload = verifyToken(token)
    if (payload.role !== 'SuperAdmin') {
      return NextResponse.json({ error: 'صلاحيات غير كافية للقيام بهذا الإجراء' }, { status: 403 })
    }

    // Nuke specific tables
    await Transaction.deleteMany({})
    await Shipment.deleteMany({})
    await InventoryUnit.deleteMany({})
    await Product.deleteMany({})
    await MerchantContact.deleteMany({})
    await Expense.deleteMany({})
    await Sale.deleteMany({})

    return NextResponse.json({ 
      success: true, 
      message: 'تم تصفير النظام التام بنجاح. تم مسح كافة المعاملات والمخزون.'
    })
  } catch (error: any) {
    console.error('[Admin Nuke Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
