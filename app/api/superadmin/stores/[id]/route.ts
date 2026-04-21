import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { ProvisionedStore } from '@/models/ProvisionedStore'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    const headerData = req.headers.get('x-user-data')
    if (!headerData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const p = JSON.parse(headerData)
    if (p.role !== 'SuperAdmin' && p.username !== 'maestro') {
      return NextResponse.json({ error: 'Access Denied' }, { status: 403 })
    }

    const { id } = params
    const updates = await req.json()

    // Validate updates (only allow specific fields)
    const allowed = ['isSuspended', 'renewalDate', 'balance', 'maxUsers', 'maxBranches']
    const filtered: any = {}
    Object.keys(updates).forEach(k => {
      if (allowed.includes(k)) filtered[k] = updates[k]
    })

    const store = await ProvisionedStore.findByIdAndUpdate(id, filtered, { new: true })
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    return NextResponse.json({ success: true, store })
  } catch (err) {
    console.error('[Store ID API] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 })
  }
}
