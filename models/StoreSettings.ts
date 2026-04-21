import mongoose from 'mongoose'

export interface IStoreSettings extends mongoose.Document {
  whatsappNumber: string
  nextInvoiceNumber: number
  exchangeRate: number
  exchangeRateUSD: number
  storeName?: string
  storeLogoUrl?: string
  businessType?: 'B2B_WHALE' | 'B2C_RETAIL'
  salesWhatsapp?: string
  maintenanceWhatsapp?: string
  currentOpeningInventoryValue: number
  maxUsers: number
  maxBranches: number
  storeId?: string
}

const storeSettingsSchema = new mongoose.Schema<IStoreSettings>(
  {
    whatsappNumber: { type: String, required: true, default: '201129592916' },
    nextInvoiceNumber: { type: Number, required: true, default: 1 },
    exchangeRate: { type: Number, required: true, default: 1 },
    exchangeRateUSD: { type: Number, required: true, default: 1 },
    storeName: { type: String, default: 'ORCA ERP' },
    storeLogoUrl: { type: String, default: '' },
    businessType: { type: String, enum: ['B2B_WHALE', 'B2C_RETAIL'], default: 'B2B_WHALE' },
    salesWhatsapp: { type: String, default: '' },
    maintenanceWhatsapp: { type: String, default: '' },
    currentOpeningInventoryValue: { type: Number, default: 0 },
    maxUsers: { type: Number, default: 5 },
    maxBranches: { type: Number, default: 2 },
  },
  { timestamps: true }
)

// In Next.js dev mode, Mongoose caches the model. If we added fields to the schema
// while the server was running, the cached model won't have them and strict mode will strip them.
// By deleting the cached model first, we force it to rebuild the schema on every hot reload.
if (mongoose.models.StoreSettings) {
  delete mongoose.models.StoreSettings
}

export const StoreSettings = mongoose.model<IStoreSettings>('StoreSettings', storeSettingsSchema)
