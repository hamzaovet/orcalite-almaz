import { connectDB } from '@/lib/db'
import Category from '@/models/Category'
import Product from '@/models/Product'
import InventoryUnit from '@/models/InventoryUnit'
import { LandingPage } from '@/models/LandingPage'
import { StoreSettings } from '@/models/StoreSettings'
import { StorefrontClient } from '@/components/StorefrontClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  await connectDB()
  
  const categories     = await Category.find({}).sort({ createdAt: -1 }).lean()
  const landingPageData = await LandingPage.findOne({}).lean()
  const settingsData   = await StoreSettings.findOne({}).lean()

  // ── Fetch available InventoryUnits for serialized products ──────────────
  // Each unit = one physical device with its own DNA (color, storage, battery)
  const availableUnits = await InventoryUnit.find({ status: 'Available' })
    .populate({
      path: 'productId',
      model: Product,
      select: 'name price costPrice isSerialized hasSerialNumbers category categoryId condition imageUrl badge',
      populate: { path: 'categoryId', model: Category, select: 'name slug' }
    })
    .lean() as any[]

  // Build storefront listings from InventoryUnits
  // For serialized products: one card per InventoryUnit (each device is unique)
  // For bulk products: one card per product, using quantity from the unit
  const listingMap = new Map<string, any>()

  for (const unit of availableUnits) {
    const prod = unit.productId
    if (!prod) continue

    const isSerialized = prod.isSerialized !== false && prod.hasSerialNumbers !== false

    if (isSerialized) {
      // Each InventoryUnit → one listing card (unique device DNA)
      listingMap.set(String(unit._id), {
        _id: String(unit._id),          // use unit ID as the card key
        productId: String(prod._id),
        name: prod.name,
        price: prod.price,
        stock: unit.quantity ?? 1,
        condition: unit.attributes?.condition || prod.condition || 'New',
        storage: unit.attributes?.storage || '',
        color: unit.attributes?.color || '',
        batteryHealth: unit.attributes?.batteryHealth ?? null,
        notes: unit.attributes?.notes || '',
        imageUrl: prod.imageUrl || '',
        badge: prod.badge || '',
        category: prod.categoryId?.name || prod.category || '',
        categoryId: String(prod.categoryId?._id || prod.categoryId || ''),
        isSerialized: true,
      })
    } else {
      // Bulk products: aggregate by productId (show one card, sum quantities)
      const pid = String(prod._id)
      if (!listingMap.has(pid)) {
        listingMap.set(pid, {
          _id: pid,
          productId: pid,
          name: prod.name,
          price: prod.price,
          stock: 0,
          condition: prod.condition || 'New',
          imageUrl: prod.imageUrl || '',
          badge: prod.badge || '',
          category: prod.categoryId?.name || prod.category || '',
          categoryId: String(prod.categoryId?._id || prod.categoryId || ''),
          isSerialized: false,
        })
      }
      listingMap.get(pid).stock += (unit.quantity || 0)
    }
  }

  const listings = Array.from(listingMap.values())
    .filter(l => l.stock > 0)  // only show items with actual stock

  return (
    <StorefrontClient 
      categories={JSON.parse(JSON.stringify(categories))}
      products={JSON.parse(JSON.stringify(listings))}
      landingPageData={JSON.parse(JSON.stringify(landingPageData))}
      settings={JSON.parse(JSON.stringify(settingsData))}
    />
  )
}

