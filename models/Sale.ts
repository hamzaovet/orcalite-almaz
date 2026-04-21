import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface ISaleItem {
  productId: Types.ObjectId
  inventoryUnitId?: Types.ObjectId // Optional for serialized items
  productName: string
  serialNumber?: string
  qty: number
  unitPrice: number       // list price
  actualUnitPrice: number // sold price
  costAtSale: number      // landed cost or standard cost
  profit: number          // (actualUnitPrice - costAtSale) * qty
}

export interface ISale extends Document {
  customer: string
  phone?: string
  date: Date
  invoiceNumber: string
  items: ISaleItem[]
  totalAmount: number
  totalCost: number
  totalProfit: number
  paymentMethod: 'Cash' | 'Visa' | 'Valu' | 'InstaPay' | 'Vodafone Cash'
  paymentStatus: 'Paid' | 'Partial' | 'Credit'
  customerId?: Types.ObjectId // Link to User/Customer if formal profile exists
  branchId: Types.ObjectId // Branch from which the sale originated
  createdAt: Date
  updatedAt: Date
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    productId:       { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    inventoryUnitId: { type: Schema.Types.ObjectId, ref: 'InventoryUnit', required: false },
    productName:     { type: String, required: true },
    serialNumber:    { type: String, required: false },
    qty:             { type: Number, required: true, min: 1, default: 1 },
    unitPrice:       { type: Number, required: true },
    actualUnitPrice: { type: Number, required: true },
    costAtSale:      { type: Number, required: true },
    profit:          { type: Number, required: true },
  },
  { _id: false }
)

const SaleSchema = new Schema<ISale>(
  {
    customer:      { type: String, required: true, trim: true },
    phone:         { type: String, required: false, trim: true },
    date:          { type: Date, required: true, default: Date.now },
    invoiceNumber: { type: String, required: true, unique: true },
    items:         { type: [SaleItemSchema], required: true },
    totalAmount:   { type: Number, required: true, min: 0 },
    totalCost:     { type: Number, required: true, min: 0 },
    totalProfit:   { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Cash', 'Visa', 'Valu', 'InstaPay', 'Vodafone Cash'], required: true },
    paymentStatus: { type: String, enum: ['Paid', 'Partial', 'Credit'], default: 'Paid' },
    customerId:    { type: Schema.Types.ObjectId, ref: 'User', required: false },
    branchId:      { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  },
  { timestamps: true }
)

// Clear stale cached model in dev so schema changes take effect immediately
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).Sale
}

const Sale: Model<ISale> =
  mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema)

export default Sale
