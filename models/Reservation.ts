import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IReservation extends Document {
  productId: mongoose.Types.ObjectId
  productName: string
  customerName: string
  phone: string
  receiptImageUrl: string
  status: 'Pending Confirmation' | 'Confirmed' | 'Cancelled'
  createdAt: Date
  updatedAt: Date
}

const ReservationSchema = new Schema<IReservation>(
  {
    productId:       { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName:     { type: String, required: true },
    customerName:    { type: String, required: true, trim: true },
    phone:           { type: String, required: true, trim: true },
    receiptImageUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending Confirmation', 'Confirmed', 'Cancelled'],
      default: 'Pending Confirmation'
    }
  },
  { timestamps: true }
)

if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).Reservation
}

const Reservation: Model<IReservation> =
  mongoose.models.Reservation || mongoose.model<IReservation>('Reservation', ReservationSchema)

export default Reservation
