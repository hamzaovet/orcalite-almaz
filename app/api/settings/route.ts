import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { StoreSettings } from '@/models/StoreSettings'
import Product from '@/models/Product'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()

    // Use findOneAndUpdate with $setOnInsert to atomically create-or-fetch,
    // AND use $set with $ifNull-equivalent via aggregation to backfill any
    // missing fields on legacy documents (e.g. docs created before exchangeRate existed).
    const settings = await StoreSettings.findOneAndUpdate(
      {},
      [
        {
          // Aggregation pipeline update: write defaults only if the field is currently missing
          $set: {
            whatsappNumber:   { $ifNull: ['$whatsappNumber',   '201129592916'] },
            nextInvoiceNumber:{ $ifNull: ['$nextInvoiceNumber', 1] },
            exchangeRate:     { $ifNull: ['$exchangeRate',     1] },
            exchangeRateUSD:  { $ifNull: ['$exchangeRateUSD',  1] },
            storeName:        { $ifNull: ['$storeName', 'ORCA ERP'] },
            storeLogoUrl:     { $ifNull: ['$storeLogoUrl', ''] },
            businessType:     { $ifNull: ['$businessType', 'B2B_WHALE'] },
            salesWhatsapp:    { $ifNull: ['$salesWhatsapp', ''] },
            maintenanceWhatsapp: { $ifNull: ['$maintenanceWhatsapp', ''] }
          }
        }
      ],
      {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true,
        updatePipeline: true,
      }
    )

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[API Settings] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve settings', whatsappNumber: '201129592916', exchangeRate: 1, exchangeRateUSD: 1 },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()

    // ── Entry log: what did the server actually receive? ──────────────────────
    console.log('[API Settings PUT] ► Received body:', JSON.stringify(body))

    const { exchangeRate, exchangeRateUSD, whatsappNumber, nextInvoiceNumber, storeName, storeLogoUrl, businessType, salesWhatsapp, maintenanceWhatsapp } = body

    // Read current values BEFORE the update (lean = plain JS object, no Mongoose magic)
    const before = await StoreSettings.findOne().lean() as Record<string, unknown> | null
    const oldAED = typeof before?.exchangeRate  === 'number' ? before.exchangeRate  : 1
    const oldUSD = typeof before?.exchangeRateUSD === 'number' ? before.exchangeRateUSD : 1
    console.log('[API Settings PUT] ► Before:', JSON.stringify({ exchangeRate: oldAED, exchangeRateUSD: oldUSD }))

    // Build $set payload — only include fields present in the request body
    const setPayload: Record<string, unknown> = {}
    if (whatsappNumber    !== undefined) setPayload.whatsappNumber    = String(whatsappNumber)
    if (nextInvoiceNumber !== undefined) setPayload.nextInvoiceNumber = Number(nextInvoiceNumber)
    if (exchangeRate      !== undefined) setPayload.exchangeRate      = Number(exchangeRate)
    if (exchangeRateUSD   !== undefined) setPayload.exchangeRateUSD   = Number(exchangeRateUSD)
    if (storeName         !== undefined) setPayload.storeName         = String(storeName)
    if (storeLogoUrl      !== undefined) setPayload.storeLogoUrl      = String(storeLogoUrl)
    if (businessType      !== undefined) setPayload.businessType      = String(businessType)
    if (salesWhatsapp     !== undefined) setPayload.salesWhatsapp     = String(salesWhatsapp)
    if (maintenanceWhatsapp !== undefined) setPayload.maintenanceWhatsapp = String(maintenanceWhatsapp)
    console.log('[API Settings PUT] ► $set payload:', JSON.stringify(setPayload))

    // Atomic upsert, then re-read as lean so every field is visible and reliable
    await StoreSettings.findOneAndUpdate(
      {},
      { $set: setPayload },
      { upsert: true, setDefaultsOnInsert: true }
    )
    const after = await StoreSettings.findOne().lean() as Record<string, unknown>
    console.log('[API Settings PUT] ► After (from DB):', JSON.stringify(after))

    const newAED = typeof after?.exchangeRate   === 'number' ? after.exchangeRate   : 1
    const newUSD = typeof after?.exchangeRateUSD === 'number' ? after.exchangeRateUSD : 1

    const rateChanged =
      (exchangeRate    !== undefined && Number(exchangeRate)    !== oldAED) ||
      (exchangeRateUSD !== undefined && Number(exchangeRateUSD) !== oldUSD)

    // Bulk-recalculate wholesale prices when AED rate changes
    if (rateChanged && newAED) {
      console.log(`[API Settings PUT] ► Rate changed AED: ${oldAED} → ${newAED} | USD: ${oldUSD} → ${newUSD}`)
      try {
        const result = await Product.updateMany(
          {},
          [
            {
              $set: {
                wholesalePriceEGP: {
                  $multiply: [
                    { $ifNull: ['$costForeign', 0] },
                    newAED,
                    { $add: [1, { $divide: [{ $ifNull: ['$wholesaleMargin', 0] }, 100] }] },
                  ],
                },
              },
            },
          ],
          { updatePipeline: true }
        )
        console.log(`[API Settings PUT] ► Bulk recalc: ${result.modifiedCount} products updated.`)
      } catch (bulkErr) {
        console.error('[API Settings PUT] ► Bulk recalc failed (settings still saved):', bulkErr)
      }
    }

    return NextResponse.json({ success: true, settings: after })
  } catch (error) {
    console.error('[API Settings] PUT error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
