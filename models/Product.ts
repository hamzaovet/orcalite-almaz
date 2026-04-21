import mongoose, { Schema, Document, Model } from 'mongoose'
import '@/models/Branch' // ensure Branch model is registered for populate

export interface IProduct extends Document {
  name:      string
  category:  string
  price:     number
  costPrice: number
  stock:     number
  specs?:    string
  imageUrl?: string
  badge?:    string
  categoryId?: mongoose.Types.ObjectId | any
  condition?: 'new' | 'used'
  description?: string
  serialNumber?: string
  storage?: string
  color?: string
  batteryHealth?: string
  supplierId?: mongoose.Types.ObjectId | any
  isSerialized?: boolean
  hasSerialNumbers?: boolean
  branchId?: mongoose.Types.ObjectId | any  // ref: Branch
  ownershipType?: 'Owned' | 'Consignment'
  costForeign?:    number
  wholesaleMargin?: number
  wholesalePriceEGP?: number
  foreignCurrency?: 'AED' | 'USD'
  taxPercentage?:    number // (Deprecated)
  taxType?:          'PERCENTAGE' | 'FIXED'
  taxValue?:         number
  taxAmountEGP?:     number
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>(
  {
    name:     { type: String, required: true,  trim: true },
    category: { type: String, required: true,  trim: true, default: 'موبايلات' },
    price:    { type: Number, required: true,  min: 0 },
    costPrice:{ type: Number, required: true,  min: 0, default: 0 },
    stock:    { type: Number, required: true,  min: 0, default: 0 },
    // Wholesale
    costForeign:       { type: Number, default: 0 },
    wholesaleMargin:   { type: Number, default: 0 },
    wholesalePriceEGP: { type: Number, default: 0 },
    foreignCurrency:   { type: String, enum: ['AED', 'USD'], default: 'AED' },
    specs:    { type: String, required: false, trim: true, default: '' },
    imageUrl: { type: String, required: false, trim: true, default: '' },
    badge:    { type: String, required: false, trim: true, default: '' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    condition:     { type: String, enum: ['new', 'used'], default: 'new', required: true },
    description:   { type: String, default: '' },
    serialNumber:{ type: String, required: false, trim: true, unique: true, sparse: true },
    storage:    { type: String, required: false, trim: true },
    color:      { type: String, required: false, trim: true },
    batteryHealth:{ type: String, required: false, trim: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    isSerialized:  { type: Boolean, default: true },
    hasSerialNumbers: { type: Boolean, default: true },
    branchId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: false },
    ownershipType: { type: String, enum: ['Owned', 'Consignment'], default: 'Owned', required: true },
    taxPercentage:  { type: Number, default: 0 },
    taxType:        { type: String, enum: ['PERCENTAGE', 'FIXED'], default: 'PERCENTAGE' },
    taxValue:       { type: Number, default: 0 },
    taxAmountEGP:   { type: Number, default: 0 },
  },
  {
    timestamps: true,
    // Allow extra fields sent by the client to pass through $set without
    // being silently stripped (strict applies to top-level inserts; for
    // updates we guard this via $set + explicit field list in the route).
    strict: true,
  }
)

// Prevent model re-compilation during Next.js hot reloads while ensuring schema updates are picked up.
// If the schema changed, we need to clear the cached model in development.
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Product
}

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)

export default Product
