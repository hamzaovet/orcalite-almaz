import mongoose from 'mongoose'

export interface IProvisionedStore extends mongoose.Document {
  name: string
  storeId: string // Unique slug/identifier
  clientName: string
  renewalDate: Date
  isSuspended: boolean // Manual Godfather Kill Switch
  maxUsers: number
  maxBranches: number
  subscriptionType: 'Monthly' | 'Annual'
  balance: number
  createdAt: Date
  updatedAt: Date
}

const provisionedStoreSchema = new mongoose.Schema<IProvisionedStore>(
  {
    name: { type: String, required: true },
    storeId: { type: String, required: true, unique: true },
    clientName: { type: String, required: true },
    renewalDate: { type: Date, required: true },
    isSuspended: { type: Boolean, default: false },
    maxUsers: { type: Number, default: 5 },
    maxBranches: { type: Number, default: 2 },
    subscriptionType: { type: String, enum: ['Monthly', 'Annual'], default: 'Monthly' },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Clear stale cached model in dev
if (mongoose.models.ProvisionedStore) {
  delete mongoose.models.ProvisionedStore
}

export const ProvisionedStore = mongoose.model<IProvisionedStore>('ProvisionedStore', provisionedStoreSchema)
