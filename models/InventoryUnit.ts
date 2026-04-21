import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IInventoryUnit extends Document {
  serialNumber: string | null
  productId: mongoose.Types.ObjectId
  shipmentId: mongoose.Types.ObjectId
  status: 'Pending' | 'Available' | 'Reserved' | 'Sold' | 'RMA' | 'InTransit' | 'WithDistributor'
  locationType: 'MainWarehouse' | 'Branch' | 'Internal' | 'Representative' | 'Distributor'
  locationId: mongoose.Types.ObjectId | null
  landedCostEGP: number
  quantity: number // Added for Bulk/Accessory tracking
  attributes: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

const InventoryUnitSchema = new Schema<IInventoryUnit>(
  {
    serialNumber: { 
      type: String, 
      unique: true, 
      sparse: true, 
      trim: true 
    },
    productId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true 
    },
    shipmentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Shipment', 
      required: false 
    },
    status: { 
      type: String, 
      enum: ['Pending', 'Available', 'Reserved', 'Sold', 'RMA', 'InTransit', 'WithDistributor'], 
      default: 'Available', 
      required: true 
    },
    locationType: {
      type: String,
      enum: ['MainWarehouse', 'Branch', 'Internal', 'Representative', 'Distributor'],
      default: 'MainWarehouse',
      required: true
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: false,
      default: null
    },
    landedCostEGP: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    quantity: { 
      type: Number, 
      required: true, 
      default: 1, 
      min: 1 
    },
    attributes: {
      storage:       { type: String, trim: true },
      color:         { type: String, trim: true },
      condition:     { type: String, enum: ['New', 'Used'], default: 'New' },
      batteryHealth: { type: Number, min: 0, max: 100 },
      notes:         { type: String, trim: true }
    },
  },
  {
    timestamps: true,
  }
)

// Clear cache in dev
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.InventoryUnit
}

const InventoryUnit: Model<IInventoryUnit> =
  mongoose.models.InventoryUnit || mongoose.model<IInventoryUnit>('InventoryUnit', InventoryUnitSchema)

export default InventoryUnit
