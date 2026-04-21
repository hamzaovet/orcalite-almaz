import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IShipmentItem {
  productId: mongoose.Types.ObjectId
  quantity: number
  unitCostForeign: number
  totalCostForeign: number
  landedUnitCostEGP: number
  totalItemLandedCostEGP: number
}

export interface IShipmentExpense {
  type: string
  amountEGP: number
}

export interface IShipment extends Document {
  shipmentNumber: string
  supplierId: mongoose.Types.ObjectId
  date: Date
  currency: string
  // The booked exchange rate at the time of shipment creation. 
  // This is strictly LOCKED and immutable to provide a baseline for Forex calculations.
  exchangeRate: number
  status: 'Draft' | 'Received' | 'Completed'
  items: IShipmentItem[]
  expenses: IShipmentExpense[]
  totalForeignCost: number
  totalLandedCostEGP: number
  createdAt: Date
  updatedAt: Date
}

const ShipmentSchema = new Schema<IShipment>(
  {
    shipmentNumber: { type: String, required: true, unique: true, trim: true },
    supplierId:    { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    date:          { type: Date, required: true, default: Date.now },
    currency:      { type: String, required: true },
    // Booked exchange rate. Locked at creation. Used as the baseline for Forex Gain/Loss.
    exchangeRate:  { type: Number, required: true, min: 0 },
    status:        { type: String, enum: ['Draft', 'Received', 'Completed'], default: 'Draft', required: true },
    items: [
      {
        productId:       { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity:        { type: Number, required: true, min: 1 },
        unitCostForeign: { type: Number, required: true, min: 0 },
        totalCostForeign:{ type: Number, required: true, min: 0 },
        landedUnitCostEGP: { type: Number, required: true, min: 0 },
        totalItemLandedCostEGP: { type: Number, required: true, min: 0 },
      },
    ],
    expenses: [
      {
        type:      { type: String, required: true, trim: true },
        amountEGP: { type: Number, required: true, min: 0 },
      },
    ],
    totalForeignCost:   { type: Number, required: true, min: 0 },
    totalLandedCostEGP: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
  }
)

// Clear cache in dev
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Shipment
}

const Shipment: Model<IShipment> =
  mongoose.models.Shipment || mongoose.model<IShipment>('Shipment', ShipmentSchema)

export default Shipment
