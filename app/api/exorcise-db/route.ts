import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { LandingPage } from '@/models/LandingPage'

/**
 * GET /api/exorcise-db
 *
 * Phase 10.B.3 — Database Exorcism.
 * Force-overwrites the LandingPage collection with clean ORCA defaults.
 * Call this ONCE from the browser; the live DB record is rewritten atomically.
 */
export async function GET() {
  try {
    await connectDB()

    // Nuke whatever is in the collection (Free Zone-contaminated documents)
    await LandingPage.deleteMany({})

    // Re-create with clean ORCA defaults
    const fresh = await LandingPage.create({
      heroTitle: 'الوجهة الأولى لحيتان الموبايلات',
      heroSubtitle:
        'منصتك الحصرية لأسعار الحرق، تحديث لحظي للسوق، وكميات فورية للتجار والموزعين.',
      brandPromiseTitle: 'لماذا ORCA؟',
      brandPromiseDescription:
        'نحن لا نبيع الهواتف فحسب، نحن نبني مستقبل التجارة الذكية في مصر.',
      advantages: [
        {
          title: 'أسعار حرق حصرية',
          description: 'أقل سعر جملة في السوق المصري للموزعين والتجار.',
          icon: 'TrendingDown',
        },
        {
          title: 'تحديث لحظي',
          description: 'أسعار تتغير مع البورصة ثانية بثانية لضمان أعلى ربحية.',
          icon: 'Zap',
        },
        {
          title: 'كميات فورية',
          description: 'مخزون ضخم جاهز للتسليم الفوري في أي وقت.',
          icon: 'Box',
        },
      ],
      contact: {
        phone: '01129592916',
        whatsapp: '01129592916',
        address: 'السراج مول، مكرم عبيد، مدينة نصر',
      },
    })

    return NextResponse.json({
      success: true,
      message: '✅ DATABASE EXORCISED — LandingPage rewritten with clean ORCA defaults.',
      document: fresh,
    })
  } catch (error: any) {
    console.error('[Exorcise DB] Error:', error)
    return NextResponse.json(
      { error: 'Exorcism failed', details: error.message },
      { status: 500 }
    )
  }
}
