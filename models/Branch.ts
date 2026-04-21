import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IBranch extends Document {
  name:    string
  type:    'Branch' | 'Warehouse' | 'Distributor' | 'Representative'
  address?: string
  createdAt: Date
  updatedAt: Date
}

const BranchSchema = new Schema<IBranch>(
  {
    name:    { type: String, required: true, trim: true },
    type:    { type: String, enum: ['Internal', 'Representative', 'Distributor'], default: 'Internal' },
    address: { type: String, required: false, trim: true, default: '' },
  },
  { timestamps: true }
)

const Branch: Model<IBranch> =
  (mongoose.models.Branch as Model<IBranch>) ||
  mongoose.model<IBranch>('Branch', BranchSchema)

export default Branch
