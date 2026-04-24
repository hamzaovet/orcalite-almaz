import mongoose from 'mongoose'

export interface IFeatureCard {
  title: string
  description: string
  icon: string
}

export interface IMarketingAd {
  title: string
  description: string
  imageUrl: string
  locationLink?: string
  isActive: boolean
}

export interface ILandingPage extends mongoose.Document {
  heroTitle: string
  heroSubtitle: string
  brandPromiseTitle: string
  brandPromiseDescription: string
  footerDescription: string
  advantages: IFeatureCard[]
  marketingAds: IMarketingAd[]
  contact: {
    phone: string
    whatsapp: string
    address: string
  }
}

const landingPageSchema = new mongoose.Schema<ILandingPage>(
  {
    heroTitle: { type: String, required: true },
    heroSubtitle: { type: String, required: true },
    brandPromiseTitle: { type: String, required: true, default: 'لماذا ORCA؟' },
    brandPromiseDescription: { type: String, required: true, default: 'نحن لا نبيع الهواتف فحسب، نحن نبني مستقبل التجارة الذكية في مصر.' },
    footerDescription: { 
      type: String, 
      required: true, 
      default: 'أوركا ERP: درعك المحاسبي ومحرك مبيعاتك. المنظومة الأولى المصممة خصيصاً لتجار وموزعي الهواتف الذكية للسيطرة على حركة السوق.' 
    },
    advantages: [
      {
        title: { type: String, required: true },
        description: { type: String, required: true },
        icon: { type: String, required: true, default: 'Zap' },
      },
    ],
    marketingAds: [
      {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        locationLink: { type: String, default: '' },
        isActive: { type: Boolean, default: true },
      },
    ],
    contact: {
      phone: { type: String, default: '01129592916' },
      whatsapp: { type: String, default: '01129592916' },
      address: { type: String, default: 'السراج مول، مكرم عبيد، مدينة نصر' },
      paymentMethods: { type: String, default: 'فودافون كاش / إنستا باي' },
      paymentNumber: { type: String, default: '01129592916' },
    },
  },
  { timestamps: true }
)

// Clear stale cached model in dev so schema changes (like marketingAds) take effect immediately
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).LandingPage
}

export const LandingPage =
  mongoose.models.LandingPage ||
  mongoose.model<ILandingPage>('LandingPage', landingPageSchema)
