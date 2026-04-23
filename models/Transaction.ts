import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ITransaction extends Document {
  entityType: 'Branch' | 'Supplier' | 'SupplierLedger' | 'Customer' | 'GeneralExpense' | 'Sales' | 'BankAccount' | 'OwnerEquity' | 'System_Forex_Adjustment' | 'OPENING_BALANCE'
  entityId?: mongoose.Types.ObjectId | any
  entityName?: string // For GeneralExpense free-text
  amount: number
  type: 'IN' | 'OUT'
  paymentMethod: 'Cash' | 'Visa' | 'Valu' | 'InstaPay' | 'Vodafone Cash'
  description: string
  date: Date
  actualExchangeRate?: number
  foreignAmountPaid?: number
  shipmentId?: mongoose.Types.ObjectId | any
  currency?: string
  branchId?: mongoose.Types.ObjectId | any
  createdAt: Date
  updatedAt: Date
}

const TransactionSchema = new Schema<ITransaction>(
  {
    entityType: { 
      type: String, 
      enum: ['Branch', 'Supplier', 'SupplierLedger', 'Customer', 'GeneralExpense', 'Sales', 'BankAccount', 'OwnerEquity', 'System_Forex_Adjustment', 'OPENING_BALANCE'],
      default: 'GeneralExpense',
      required: true 
    },
    entityId: { 
      type: Schema.Types.ObjectId, 
      required: false,
    },
    entityName: { type: String, required: false, trim: true },
    amount:        { type: Number, required: true },
    type:          { type: String, enum: ['IN', 'OUT'], required: true },
    paymentMethod: { type: String, enum: ['Cash', 'Visa', 'Valu', 'InstaPay', 'Vodafone Cash'], required: true },
    description:   { type: String, required: true, trim: true },
    date:          { type: Date, default: Date.now, required: true },
    actualExchangeRate: { type: Number, required: false },
    foreignAmountPaid: { type: Number, required: false },
    shipmentId: { type: Schema.Types.ObjectId, ref: 'Shipment', required: false },
    currency: { type: String, required: false },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: false }
  },
  {
    timestamps: true,
  }
)

// Clear cache in dev
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).Transaction
}

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema)

export default Transaction
