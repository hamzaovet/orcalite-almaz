import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUser extends Document {
  name: string
  username: string
  password?: string
  role: 'SuperAdmin' | 'Admin' | 'Manager' | 'Accountant' | 'Inventory' | 'Sales' | 'Technician' | 'Cashier' | 'DEMO'
  branchId?: mongoose.Types.ObjectId | string
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    name:     { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role:     { type: String, enum: ['SuperAdmin', 'Admin', 'Manager', 'Accountant', 'Inventory', 'Sales', 'Technician', 'Cashier', 'DEMO'], default: 'Cashier' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: false },
  },
  { timestamps: true }
)

// Clear stale cached model in dev so schema changes take effect immediately
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as any).User
}

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema)
