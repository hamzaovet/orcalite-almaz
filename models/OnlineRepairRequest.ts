import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IOnlineRepairRequest extends Document {
  deviceModel: string
  issueCategory: 'شاشة' | 'بطارية' | 'سوفت وير' | 'أخرى'
  issueDescription: string
  customerName: string
  whatsapp: string
  photos: string[]
  status: 'New' | 'Quoted' | 'Rejected' | 'Converted'
  quote?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const OnlineRepairRequestSchema = new Schema<IOnlineRepairRequest>(
  {
    deviceModel:      { type: String, required: true, trim: true },
    issueCategory:    { type: String, enum: ['شاشة', 'بطارية', 'سوفت وير', 'أخرى'], required: true },
    issueDescription: { type: String, required: true, trim: true },
    customerName:     { type: String, required: true, trim: true },
    whatsapp:         { type: String, required: true, trim: true },
    photos:           { type: [String], default: [] },
    status:           { type: String, enum: ['New', 'Quoted', 'Rejected', 'Converted'], default: 'New' },
    quote:            { type: Number },
    notes:            { type: String, default: '' }
  },
  { timestamps: true }
)

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).OnlineRepairRequest
}

const OnlineRepairRequest: Model<IOnlineRepairRequest> =
  mongoose.models.OnlineRepairRequest ||
  mongoose.model<IOnlineRepairRequest>('OnlineRepairRequest', OnlineRepairRequestSchema)

export default OnlineRepairRequest
