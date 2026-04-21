import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ICurrency extends Document {
  code: string
  name: string
  exchangeRate: number
  createdAt: Date
  updatedAt: Date
}

const CurrencySchema = new Schema<ICurrency>(
  {
    code:         { type: String, required: true, unique: true, trim: true },
    name:         { type: String, required: true, trim: true },
    exchangeRate: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
  }
)

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).Currency
}

const Currency: Model<ICurrency> =
  mongoose.models.Currency || mongoose.model<ICurrency>('Currency', CurrencySchema)

export default Currency
