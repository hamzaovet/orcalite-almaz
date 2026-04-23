import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IInternalAccount extends Document {
  name: string
  type: 'Bank' | 'Wallet' | 'Clearing' | 'Safe'
  initialBalance: number
  currentBalance: number
  branchId?: mongoose.Types.ObjectId | string
  createdAt: Date
  updatedAt: Date
}

const InternalAccountSchema = new Schema<IInternalAccount>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['Bank', 'Wallet', 'Clearing', 'Safe'], required: true },
    initialBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
  },
  { timestamps: true }
)

// Clear cache in dev
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).InternalAccount
}

const InternalAccount: Model<IInternalAccount> =
  mongoose.models.InternalAccount || mongoose.model<IInternalAccount>('InternalAccount', InternalAccountSchema)

export default InternalAccount
