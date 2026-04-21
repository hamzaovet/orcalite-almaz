import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import DigitalWallet from '@/models/DigitalWallet'
import Transaction from '@/models/Transaction'
import InternalAccount from '@/models/InternalAccount'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const { walletId, serviceName, cost, finalPrice } = await request.json()

    const wallet = await DigitalWallet.findById(walletId)
    if (!wallet) return NextResponse.json({ success: false, message: 'المحفظة غير موجودة' }, { status: 404 })

    if (wallet.balance < Number(cost)) {
      return NextResponse.json({ success: false, message: 'رصيد المحفظة غير كافٍ' }, { status: 400 })
    }

    // 1. Deduct cost from digital wallet
    wallet.balance -= Number(cost);
    await wallet.save();

    // 2. Log Transaction IN to Treasury (Cash collected from customer)
    // The collected amount is the finalPrice
    let account = await InternalAccount.findOne({ type: 'Cash', inUse: true })
    if (!account) account = await InternalAccount.findOne({ isDefault: true })
    if (account) {
      account.balance += Number(finalPrice);
      await account.save();
    }

    const profit = Number(finalPrice) - Number(cost);

    const trx = new Transaction({
      entityType: 'Customer', // General customer
      entityName: 'نقدي (خدمات ديجيتال)',
      amount: Number(finalPrice),
      type: 'IN',
      paymentMethod: 'Cash',
      description: `بيع خدمة (${serviceName}) عبر محفظة ${wallet.name} | التكلفة: ${cost} | الربح: ${profit}`,
      date: new Date()
    })
    await trx.save()

    return NextResponse.json({ success: true, message: 'تم تنفيذ الخدمة بنجاح' })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
