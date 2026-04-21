import mongoose from 'mongoose'

export interface IRepairTicket extends mongoose.Document {
  customerName: string
  phoneNumber: string
  deviceModel: string
  imeiPasscode: string
  issueDescription: string
    estimatedCost: number
    deposit: number
    status: 'Pending' | 'Diagnosing' | 'In Repair' | 'Ready for Pickup' | 'Delivered'
    financialStatus?: 'Pending' | 'Paid'
    spareParts: {
      product: mongoose.Types.ObjectId
      quantity: number
      price: number // price at time of adding
    }[]
    externalParts: {
      name: string
      cost: number
    }[]
    outsourcedRepairCost?: number
    laborMargin?: number
    createdAt: Date
    updatedAt: Date
  }
  
  const repairTicketSchema = new mongoose.Schema<IRepairTicket>(
    {
      customerName: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      deviceModel: { type: String, required: true },
      imeiPasscode: { type: String, required: true },
      issueDescription: { type: String, required: true },
      estimatedCost: { type: Number, required: true, default: 0 },
      deposit: { type: Number, required: true, default: 0 },
      status: { 
        type: String, 
        enum: ['Pending', 'Diagnosing', 'In Repair', 'Ready for Pickup', 'Delivered'],
        default: 'Pending'
      },
      financialStatus: {
        type: String,
        enum: ['Pending', 'Paid'],
        default: 'Pending'
      },
      spareParts: [
        {
          product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
          quantity: { type: Number, required: true, default: 1 },
          price: { type: Number, required: true, default: 0 }
        }
      ],
      externalParts: [
        {
          name: { type: String, required: true },
          cost: { type: Number, required: true, min: 0 }
        }
      ],
      outsourcedRepairCost: { type: Number, default: 0 },
      laborMargin: { type: Number, default: 0 }
    },
    { timestamps: true }
)

if (mongoose.models.RepairTicket) {
  delete mongoose.models.RepairTicket
}

export const RepairTicket = mongoose.model<IRepairTicket>('RepairTicket', repairTicketSchema)
