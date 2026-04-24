import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { LandingPage } from '@/models/LandingPage'

export async function GET() {
  try {
    await connectDB()
    let landingPage = await LandingPage.findOne({})
    
    if (!landingPage) {
      // Fallback if not seeded
      landingPage = await LandingPage.create({
        heroTitle: 'الوجهة الأولى لحيتان الموبايلات',
        heroSubtitle: 'منصتك الحصرية لأسعار الحرق، تحديث لحظي للسوق، وكميات فورية للتجار والموزعين.',
        brandPromiseTitle: 'لماذا ORCA؟',
        brandPromiseDescription: 'نحن لا نبيع الهواتف فحسب، نحن نبني مستقبل التجارة الذكية في مصر.',
        footerDescription: 'أوركا ERP: درعك المحاسبي ومحرك مبيعاتك. المنظومة الأولى المصممة خصيصاً لتجار وموزعي الهواتف الذكية للسيطرة على حركة السوق.',
        advantages: []
      })
    }

    // Migrate old documents: ensure marketingAds field exists
    if (landingPage && !landingPage.marketingAds) {
      landingPage = await LandingPage.findOneAndUpdate(
        {},
        { $set: { marketingAds: [] } },
        { new: true }
      )
    }

    return NextResponse.json(landingPage)
  } catch (error) {
    console.error('[LandingPage API GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch landing page content' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    await connectDB()
    const body = await req.json()
    
    const landingPage = await LandingPage.findOneAndUpdate(
      {},
      { $set: body },
      { upsert: true, returnDocument: 'after', runValidators: false }
    )

    return NextResponse.json({ success: true, data: landingPage })
  } catch (error) {
    console.error('[LandingPage API PUT] Error:', error)
    return NextResponse.json({ error: 'Failed to update landing page content' }, { status: 500 })
  }
}
