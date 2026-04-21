import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ProvisionedStore } from '@/models/ProvisionedStore'
import { StoreSettings } from '@/models/StoreSettings'

export async function GET(req: Request) {
  try {
    await connectDB()
    
    // Check SuperAdmin access (Maestro only)
    const headerData = req.headers.get('x-user-data')
    if (!headerData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const p = JSON.parse(headerData)
    if (p.role !== 'SuperAdmin' && p.username !== 'maestro') {
      return NextResponse.json({ error: 'Access Denied' }, { status: 403 })
    }

    const stores = await ProvisionedStore.find().sort({ createdAt: -1 })
    return NextResponse.json({ stores })
  } catch (err) {
    console.error('[Stores API] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await connectDB()
    
    const headerData = req.headers.get('x-user-data')
    if (!headerData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const p = JSON.parse(headerData)
    if (p.role !== 'SuperAdmin' && p.username !== 'maestro') {
      return NextResponse.json({ error: 'Access Denied' }, { status: 403 })
    }

    const body = await req.json()
    const { name, storeId, clientName, renewalDate, maxUsers, maxBranches, subscriptionType } = body

    if (!name || !storeId || !clientName || !renewalDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Create ProvisionedStore record
    const store = await ProvisionedStore.create({
      name,
      storeId,
      clientName,
      renewalDate: new Date(renewalDate),
      maxUsers: maxUsers || 5,
      maxBranches: maxBranches || 2,
      subscriptionType: subscriptionType || 'Monthly'
    })

    // 2. Update global StoreSettings to "Activate" this store for this instance
    // Note: In a full multi-tenant system, this would be scoped to a specific deployment
    await StoreSettings.findOneAndUpdate(
      {}, 
      { 
        storeName: name,
        storeId,
        maxUsers: maxUsers || 5,
        maxBranches: maxBranches || 2
      }, 
      { upsert: true }
    )

    return NextResponse.json({ success: true, store })
  } catch (err: any) {
    console.error('[Stores API] POST error:', err)
    if (err.code === 11000) {
      return NextResponse.json({ error: 'Store ID already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to provision store' }, { status: 500 })
  }
}
