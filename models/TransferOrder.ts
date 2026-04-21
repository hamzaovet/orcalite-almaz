import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ITransferOrder extends Document {
  orderNumber: string
  fromLocationType: 'MainWarehouse' | 'Branch' | 'Internal' | 'Representative' | 'Distributor'
  toLocationType: 'MainWarehouse' | 'Branch' | 'Internal' | 'Representative' | 'Distributor'
  toLocationId: mongoose.Types.ObjectId // Reference to Branch model for all entities
  status: 'Pending' | 'Completed' | 'Cancelled'
  items: mongoose.Types.ObjectId[] // Array of InventoryUnit IDs
  totalValue: number
  date: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const TransferOrderSchema = new Schema<ITransferOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    fromLocationType: { 
      type: String, 
      enum: ['MainWarehouse', 'Branch', 'Internal', 'Representative', 'Distributor'],
      default: 'MainWarehouse' 
    },
    toLocationType: { 
      type: String, 
      enum: ['MainWarehouse', 'Branch', 'Internal', 'Representative', 'Distributor'],
      required: true 
    },
    toLocationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Branch', 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['Pending', 'Completed', 'Cancelled'], 
      default: 'Pending' 
    },
    items: [{ 
      type: Schema.Types.ObjectId, 
      ref: 'InventoryUnit' 
    }],
    totalValue: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
)

// Clear cache in dev
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).TransferOrder
}

const TransferOrder: Model<ITransferOrder> =
  mongoose.models.TransferOrder || mongoose.model<ITransferOrder>('TransferOrder', TransferOrderSchema)

export default TransferOrder
