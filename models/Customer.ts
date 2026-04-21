import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ICustomer extends Document {
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  balance: number
  createdAt: Date
  updatedAt: Date
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name:  { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    notes: { type: String, trim: true },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Clear cache in dev
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).Customer
}

const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema)

export default Customer
