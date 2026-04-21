import { connectDB } from '@/lib/db'
import Category from '@/models/Category'
import Product from '@/models/Product'
import { StoreSettings } from '@/models/StoreSettings'
import { CategoryClient } from './CategoryClient'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CategoryPage(props: { params: Promise<{ slug: string }> }) {
  await connectDB()

  const { slug } = await props.params
  
  // Fetch the Category by slug
  const categoryDoc = await Category.findOne({ slug: slug.toLowerCase() }).lean()
  if (!categoryDoc) {
    notFound()
  }

  // Fetch Products where categoryId matches this Category's ID
  const productsDocs = await Product.find({ categoryId: categoryDoc._id }).sort({ createdAt: -1 }).lean()
  const settingsDoc = await StoreSettings.findOne({}).lean()

  const category = JSON.parse(JSON.stringify(categoryDoc))
  const products = JSON.parse(JSON.stringify(productsDocs))
  const settings = JSON.parse(JSON.stringify(settingsDoc))

  return (
    <CategoryClient 
      category={category} 
      products={products} 
      settings={settings}
    />
  )
}
