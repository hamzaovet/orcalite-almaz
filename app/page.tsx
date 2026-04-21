import { connectDB } from '@/lib/db'
import Category from '@/models/Category'
import Product from '@/models/Product'
import { LandingPage } from '@/models/LandingPage'
import { StoreSettings } from '@/models/StoreSettings'
import { StorefrontClient } from '@/components/StorefrontClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  await connectDB()
  
  // Fetch categories, products, and landing page content
  const categories = await Category.find({}).sort({ createdAt: -1 }).lean()
  const products = await Product.find({}).sort({ createdAt: -1 }).lean()
  const landingPageData = await LandingPage.findOne({}).lean()
  const settingsData = await StoreSettings.findOne({}).lean()

  // Convert Mongoose documents to plain JSON objects
  const plainCategories = JSON.parse(JSON.stringify(categories))
  const plainProducts = JSON.parse(JSON.stringify(products))
  const plainLandingPage = JSON.parse(JSON.stringify(landingPageData))
  const plainSettings = JSON.parse(JSON.stringify(settingsData))

  return (
    <StorefrontClient 
      categories={plainCategories} 
      products={plainProducts} 
      landingPageData={plainLandingPage}
      settings={plainSettings}
    />
  )
}
