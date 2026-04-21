import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ISupplier extends Document {
  name: string
  type: 'Supplier' | 'Customer' | 'Both'
  supplierType?: 'PHYSICAL' | 'DIGITAL_BALANCE'
  balance: number
  phone?: string
  createdAt: Date
  updatedAt: Date
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name:    { type: String, required: true, trim: true },
    type:    { type: String, enum: ['Supplier', 'Customer', 'Both'], default: 'Supplier', required: true },
    supplierType: { type: String, enum: ['PHYSICAL', 'DIGITAL_BALANCE'], default: 'PHYSICAL' },
    balance: { type: Number, default: 0, required: true },
    phone:   { type: String, required: false, trim: true },
  },
  {
    timestamps: true,
  }
)

const Supplier: Model<ISupplier> =
  (mongoose.models.Supplier as Model<ISupplier>) ||
  mongoose.model<ISupplier>('Supplier', SupplierSchema)

export default Supplier
