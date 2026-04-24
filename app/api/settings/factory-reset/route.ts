import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Product from '@/models/Product'
import Category from '@/models/Category'
import Transaction from '@/models/Transaction'
import Purchase from '@/models/Purchase'
import Sale from '@/models/Sale'
import { RepairTicket } from '@/models/RepairTicket'
import DigitalWallet from '@/models/DigitalWallet'
import InventoryUnit from '@/models/InventoryUnit'
import Supplier from '@/models/Supplier'
import InternalAccount from '@/models/InternalAccount'
import { User } from '@/models/User'
import { verifyToken, comparePassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    if (!password) {
      return NextResponse.json({ success: false, message: 'كلمة المرور مطلوبة' }, { status: 400 })
    }

    const cookies = request.headers.get('cookie') || ''
    const match = cookies.match(/orca_auth=([^;]+)/)
    const token = match ? match[1] : null

    if (!token) return NextResponse.json({ success: false, message: 'غير مصرح لك (No Token)' }, { status: 401 })

    const payload = verifyToken(token) as any
    if (!payload || !payload.sub) {
      return NextResponse.json({ success: false, message: 'جلسة التوكن غير صالحة' }, { status: 401 })
    }

    await connectDB()

    const user = await User.findById(payload.sub)
    if (!user) return NextResponse.json({ success: false, message: 'المستخدم غير موجود' }, { status: 404 })

    const isMatch = await comparePassword(password, user.password)
    if (!isMatch) return NextResponse.json({ success: false, message: 'كلمة المرور غير صحيحة' }, { status: 403 })

    const validRoles = ['Admin', 'SuperAdmin', 'Manager', 'owner']
    if (!validRoles.includes(user.role)) {
      return NextResponse.json({ success: false, message: 'غير مصرح لك بهذا الإجراء' }, { status: 403 })
    }

    const isGlobal = user.role === 'SuperAdmin' || user.role === 'owner'
    const branchId = user.branchId

    if (!isGlobal && !branchId) {
      return NextResponse.json({ success: false, message: 'لا يوجد فرع مرتبط بهذا المستخدم لتنفيذ التصفير المحلي' }, { status: 400 })
    }

    const filter = isGlobal ? {} : { branchId }
    const invFilter = isGlobal ? {} : { locationId: branchId }

    // DO NOT DELETE: StoreSettings, User accounts, Branches
    await Promise.all([
      Product.deleteMany(filter),
      Transaction.deleteMany(filter),
      Purchase.deleteMany(filter),
      Sale.deleteMany(filter),
      RepairTicket.deleteMany(filter),
      InventoryUnit.deleteMany(invFilter),
      InternalAccount.updateMany(filter, { $set: { balance: 0, currentBalance: 0, initialBalance: 0 } }),
    ])

    if (isGlobal) {
      await Promise.all([
        DigitalWallet.deleteMany({}),
        Supplier.updateMany({}, { $set: { balance: 0, initialBalance: 0 } }),
      ])
    }

    return NextResponse.json({ 
      success: true, 
      message: isGlobal ? 'تم تصفير كافة بيانات النظام بنجاح' : 'تم تصفير بيانات الفرع الحالي بنجاح' 
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
