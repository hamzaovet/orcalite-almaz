import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IRepLedger extends Document {
  entityId: mongoose.Types.ObjectId // Reference to Branch
  transactionType: 'IssueGoods' | 'ReturnGoods' | 'CashCollection' | 'Adjustment'
  amount: number // Positive for Debt (Issue), Negative for Credit (Returns/Payments)
  referenceId: mongoose.Types.ObjectId // TransferOrder or CashReceipt
  status: 'Draft' | 'Posted'
  date: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const RepLedgerSchema = new Schema<IRepLedger>(
  {
    entityId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Branch', 
      required: true 
    },
    transactionType: { 
      type: String, 
      enum: ['IssueGoods', 'ReturnGoods', 'CashCollection', 'Adjustment'],
      required: true 
    },
    amount: { 
      type: Number, 
      required: true 
    },
    referenceId: { 
      type: Schema.Types.ObjectId, 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['Draft', 'Posted'], 
      default: 'Posted' 
    },
    date: { 
      type: Date, 
      default: Date.now 
    },
    notes: { 
      type: String, 
      trim: true 
    }
  },
  { timestamps: true }
)

// Index for performance
RepLedgerSchema.index({ entityId: 1, date: -1 })

// Clear cache in dev
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).RepLedger
}

const RepLedger: Model<IRepLedger> =
  mongoose.models.RepLedger || mongoose.model<IRepLedger>('RepLedger', RepLedgerSchema)

export default RepLedger
