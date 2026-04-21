import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IPurchaseItem {
  productId: mongoose.Types.ObjectId
  productName: string
  qty: number
  unitCost: number
  imeis?: string[]
}

export interface IPurchase extends Document {
  supplierId: mongoose.Types.ObjectId
  supplierName: string
  items: IPurchaseItem[]
  totalAmount: number
  amountPaid: number
  isOpeningBalance?: boolean
  invoiceLabel?: string
  walkInName?: string
  nationalId?: string
  branchId: mongoose.Types.ObjectId
  date: Date
  createdAt: Date
  updatedAt: Date
}

const PurchaseItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    imeis: { type: [String], default: [] }
  },
  { _id: false }
)

const PurchaseSchema = new Schema<IPurchase>({
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: false },
  supplierName: { type: String, required: true },
  items: [PurchaseItemSchema],
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, required: true },
  remaining: { type: Number, required: true },
  paymentMethod: { type: String, default: 'Cash' },
  isOpeningBalance: { type: Boolean, default: false },
  invoiceLabel: { type: String },
  walkInName: { type: String, required: false },
  nationalId: { type: String, required: false },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: false },
  date: { type: Date, default: Date.now }
}, { timestamps: true })

if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Purchase
}

const Purchase: Model<IPurchase> = mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', PurchaseSchema)
export default Purchase
