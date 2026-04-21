import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ICategory extends Document {
  name: string
  slug: string
  icon: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

const CategorySchema = new Schema<ICategory>(
  {
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, trim: true },
    icon:        { type: String, required: true, trim: true },
    description: { type: String, required: false, trim: true, default: '' },
  },
  {
    timestamps: true,
  }
)

const Category: Model<ICategory> =
  (mongoose.models.Category as Model<ICategory>) ||
  mongoose.model<ICategory>('Category', CategorySchema)

export default Category
