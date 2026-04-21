import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ICustomerDeviceOffer extends Document {
  deviceModel: string
  storage: string
  condition: 'Kaser Zero' | 'Scratched' | 'Needs Repair'
  customerName: string
  whatsapp: string
  photos: string[] // ImgBB URLs
  status: 'New' | 'Priced' | 'Rejected' | 'Purchased'
  offeredPrice?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const CustomerDeviceOfferSchema = new Schema<ICustomerDeviceOffer>(
  {
    deviceModel:  { type: String, required: true, trim: true },
    storage:      { type: String, required: true, trim: true },
    condition:    { type: String, enum: ['Kaser Zero', 'Scratched', 'Needs Repair'], required: true },
    customerName: { type: String, required: true, trim: true },
    whatsapp:     { type: String, required: true, trim: true },
    photos:       { type: [String], default: [] },
    status:       { type: String, enum: ['New', 'Priced', 'Rejected', 'Purchased'], default: 'New' },
    offeredPrice: { type: Number, required: false },
    notes:        { type: String, required: false, trim: true, default: '' }
  },
  { timestamps: true }
)

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).CustomerDeviceOffer
}

const CustomerDeviceOffer: Model<ICustomerDeviceOffer> =
  mongoose.models.CustomerDeviceOffer ||
  mongoose.model<ICustomerDeviceOffer>('CustomerDeviceOffer', CustomerDeviceOfferSchema)

export default CustomerDeviceOffer
