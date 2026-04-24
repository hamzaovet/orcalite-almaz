import { connectDB } from '@/lib/db'
import Category from '@/models/Category'
import Product from '@/models/Product'
import InventoryUnit from '@/models/InventoryUnit'
import { StoreSettings } from '@/models/StoreSettings'
import { CategoryClient } from './CategoryClient'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CategoryPage(props: { params: Promise<{ slug: string }> }) {
  await connectDB()

  const { slug } = await props.params

  const categoryDoc = await Category.findOne({ slug: slug.toLowerCase() }).lean() as any
  if (!categoryDoc) notFound()

  const settingsDoc = await StoreSettings.findOne({}).lean()

  // ── Pull available InventoryUnits for this category ───────────────────────
  const availableUnits = await InventoryUnit.find({ status: 'Available' })
    .populate({
      path: 'productId',
      model: Product,
      select: 'name price costPrice isSerialized hasSerialNumbers category categoryId condition imageUrl badge',
    })
    .lean() as any[]

  // Filter to units belonging to this category
  const categoryUnits = availableUnits.filter(unit => {
    const prod = unit.productId
    if (!prod) return false
    const prodCatId = String(prod.categoryId?._id || prod.categoryId || '')
    return prodCatId === String(categoryDoc._id)
  })

  // Build per-unit listings (same logic as app/page.tsx)
  const listingMap = new Map<string, any>()

  for (const unit of categoryUnits) {
    const prod = unit.productId
    const isSerialized = prod.isSerialized !== false && prod.hasSerialNumbers !== false

    if (isSerialized) {
      listingMap.set(String(unit._id), {
        _id: String(unit._id),
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
        category: categoryDoc.name,
        categoryId: String(categoryDoc._id),
        isSerialized: true,
      })
    } else {
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
          category: categoryDoc.name,
          categoryId: String(categoryDoc._id),
          isSerialized: false,
        })
      }
      listingMap.get(pid).stock += (unit.quantity || 0)
    }
  }

  const listings = Array.from(listingMap.values()).filter(l => l.stock > 0)

  return (
    <CategoryClient
      category={JSON.parse(JSON.stringify(categoryDoc))}
      products={JSON.parse(JSON.stringify(listings))}
      settings={JSON.parse(JSON.stringify(settingsDoc))}
    />
  )
}
