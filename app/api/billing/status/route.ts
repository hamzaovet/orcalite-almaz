import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ProvisionedStore } from '@/models/ProvisionedStore'
import { getBillingStatus } from '@/lib/billing-engine'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')

    if (!storeId) return NextResponse.json({ error: 'Missing storeId' }, { status: 400 })

    await connectDB()
    const store = await ProvisionedStore.findOne({ storeId })
    
    if (!store) {
      return NextResponse.json({ status: 'NORMAL', daysRemaining: 999 })
    }

    const billing = getBillingStatus(store.renewalDate, store.isSuspended)
    
    return NextResponse.json({
      status: billing.status,
      daysRemaining: billing.daysRemaining,
      renewalDate: billing.renewalDate
    })
  } catch (err) {
    console.error('[Billing API] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
