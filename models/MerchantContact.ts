import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IMerchantContact extends Document {
  name: string
  phone: string
  type: 'Wholesale' | 'Retail'
  createdAt: Date
  updatedAt: Date
}

const SchemaDefinition = new Schema<IMerchantContact>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    type: { type: String, enum: ['Wholesale', 'Retail'], required: true },
  },
  { timestamps: true }
)

const MerchantContact: Model<IMerchantContact> =
  mongoose.models.MerchantContact || mongoose.model<IMerchantContact>('MerchantContact', SchemaDefinition)

export default MerchantContact
