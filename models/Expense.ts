import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IExpense extends Document {
  title: string
  amount: number
  category?: string
  paymentMethod: 'Cash' | 'Visa' | 'Valu' | 'InstaPay' | 'Vodafone Cash'
  date: Date
  createdAt: Date
  updatedAt: Date
}

const ExpenseSchema = new Schema<IExpense>(
  {
    title:         { type: String, required: true, trim: true },
    amount:        { type: Number, required: true, min: 0 },
    category:      { type: String, required: false, trim: true, default: 'عام' },
    paymentMethod: { type: String, enum: ['Cash', 'Visa', 'Valu', 'InstaPay', 'Vodafone Cash'], required: true },
    date:          { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
)

// Clear stale cached model in dev so schema changes take effect immediately
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).Expense
}

const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema)

export default Expense
