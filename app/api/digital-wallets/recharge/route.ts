import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import DigitalWallet from '@/models/DigitalWallet'
import Supplier from '@/models/Supplier'
import Transaction from '@/models/Transaction'
import InternalAccount from '@/models/InternalAccount'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const { walletId, supplierId, amount, paymentMethod } = await request.json()

    const wallet = await DigitalWallet.findById(walletId)
    if (!wallet) return NextResponse.json({ success: false, message: 'المحفظة غير موجودة' }, { status: 404 })

    const supplier = await Supplier.findById(supplierId)
    if (!supplier) return NextResponse.json({ success: false, message: 'المورد غير موجود' }, { status: 404 })

    // 1. Credit the digital wallet
    wallet.balance += Number(amount);
    await wallet.save();

    // 2. Handle Payment
    if (paymentMethod === 'Cash') {
      // Deduct from Main Treasury
      let account = await InternalAccount.findOne({ type: 'Cash', inUse: true })
      if (!account) account = await InternalAccount.findOne({ isDefault: true })
      if (account) {
        account.balance -= Number(amount);
        await account.save();
      }

      // Log transaction OUT
      const trx = new Transaction({
        entityType: 'Supplier',
        entityId: supplier._id,
        entityName: supplier.name,
        amount: Number(amount),
        type: 'OUT',
        paymentMethod: 'Cash',
        description: `شحن محفظة ديجيتال (${wallet.name}) نقداً من המورد ${supplier.name}`,
        date: new Date()
      })
      await trx.save()

    } else if (paymentMethod === 'Credit') {
      // Increase debt to supplier
      supplier.balance += Number(amount);
      await supplier.save();
    }

    return NextResponse.json({ success: true, message: 'تم شحن المحفظة بنجاح' })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
