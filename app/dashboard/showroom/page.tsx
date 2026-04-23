'use client'

import { useState, useEffect } from 'react'
import { 
  Package, Search, Filter, Smartphone, Info, 
  ArrowLeft, Palette, HardDrive, BatteryLow, 
  ShoppingBag, CheckCircle2, XCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Product {
  _id: string
  name: string
  price: number
  stock: number
  category: any
  imageUrl?: string
  color?: string
  storage?: string
  batteryHealth?: string
  condition?: string
  description?: string
}

export default function ShowroomPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load products:', err)
        setLoading(false)
      })
  }, [])

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const fmt = (num: number) => num.toLocaleString('ar-EG')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
          <ShoppingBag className="w-12 h-12 text-cyan-500 opacity-20" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" dir="rtl">
      {/* Header Section */}
      <div className="mb-12">
        <h1 className="text-4xl font-black text-foreground mb-2 font-tajawal">معرض المنتجات</h1>
        <p className="text-slate-500">تصفح أحدث الأجهزة والمواصفات المتوفرة في صالة العرض</p>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input 
            type="text" 
            placeholder="ابحث عن هاتف أو قسم..."
            className="w-full bg-surface border border-border-light rounded-2xl py-4 pr-12 pl-4 text-foreground focus:outline-none focus:border-cyan-500/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((product) => (
          <motion.div
            key={product._id}
            whileHover={{ y: -5 }}
            className="bg-white/40 border border-gray-200 rounded-3xl overflow-hidden cursor-pointer hover:border-cyan-500/30 transition-all group"
            onClick={() => setSelectedProduct(product)}
          >
            {/* Image Placeholder/Real Image */}
            <div className="h-56 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center relative">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="max-h-[80%] object-contain" />
              ) : (
                <Smartphone className="w-20 h-20 text-slate-700 group-hover:text-cyan-500/20 transition-colors" />
              )}
              
              {/* Condition Badge */}
              <div className="absolute top-4 left-4">
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  product.condition === 'new' 
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                }`}>
                  {product.condition === 'new' ? 'جديد | NEW' : 'مستعمل | USED'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <span className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-2 block opacity-60">
                {product.category?.name || 'قسم عام'}
              </span>
              <h3 className="text-xl font-bold text-foreground mb-4 line-clamp-1">{product.name}</h3>
              
              {/* Quick Specs */}
              <div className="flex flex-wrap gap-2 mb-6 min-h-[30px]">
                {product.storage && (
                  <span className="bg-gray-100 text-slate-600 text-[10px] py-1 px-2.5 rounded-lg border border-gray-300">
                    💾 {product.storage}
                  </span>
                )}
                {product.color && (
                  <span className="bg-gray-100 text-slate-600 text-[10px] py-1 px-2.5 rounded-lg border border-gray-300">
                    🎨 {product.color}
                  </span>
                )}
              </div>

              {/* Price Area */}
              <div className="flex items-end justify-between border-t border-gray-200/50 pt-4">
                <div>
                  <p className="text-xs text-slate-500 font-bold mb-1">السعر المعلن</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground">{fmt(product.price)}</span>
                    <span className="text-sm font-bold text-slate-500">ج.م</span>
                  </div>
                </div>
                
                <div className={`p-2 rounded-xl border transition-colors ${
                  product.stock > 0 
                  ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500' 
                  : 'bg-red-500/5 border-red-500/10 text-red-500'
                }`}>
                  {product.stock > 0 ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-gray-50/90 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-8 left-8 z-10 p-4 bg-surface hover:bg-surface-hover rounded-2xl text-foreground border border-border-light transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Media Side */}
                <div className="p-12 bg-gradient-to-br from-slate-800/40 to-slate-900 flex items-center justify-center min-h-[400px]">
                  {selectedProduct.imageUrl ? (
                    <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="max-h-full object-contain" />
                  ) : (
                    <Smartphone className="w-40 h-40 text-slate-700 opacity-20" />
                  )}
                </div>

                {/* Info Side */}
                <div className="p-12 flex flex-col">
                  <div className="mb-8">
                    <span className="text-cyan-500 font-bold tracking-widest text-sm mb-4 block uppercase opacity-70">
                      {selectedProduct.category?.name || 'قسم عام'}
                    </span>
                    <h2 className="text-4xl font-black text-foreground mb-2 font-tajawal">{selectedProduct.name}</h2>
                    <div className="flex gap-4">
                       <span className={`px-4 py-1 rounded-full text-xs font-bold ${
                        selectedProduct.condition === 'new' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                       }`}>
                         {selectedProduct.condition === 'new' ? 'منتج جديد' : 'منتج مستعمل'}
                       </span>
                       <span className={`px-4 py-1 rounded-full text-xs font-bold ${
                        selectedProduct.stock > 0 ? 'bg-cyan-500/10 text-cyan-600' : 'bg-red-500/10 text-red-600'
                       }`}>
                         {selectedProduct.stock > 0 ? 'متوفر بالمخزون' : 'نفد من المخزون'}
                       </span>
                    </div>
                  </div>

                  {/* Specifications */}
                  <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="bg-gray-50 p-4 rounded-3xl border border-gray-200/50">
                      <div className="flex items-center gap-3 mb-1 text-slate-500">
                        <Palette size={16} />
                        <span className="text-xs font-bold">اللون</span>
                      </div>
                      <p className="text-foreground font-bold">{selectedProduct.color || '—'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-3xl border border-gray-200/50">
                      <div className="flex items-center gap-3 mb-1 text-slate-500">
                        <HardDrive size={16} />
                        <span className="text-xs font-bold">المساحة</span>
                      </div>
                      <p className="text-foreground font-bold">{selectedProduct.storage || '—'}</p>
                    </div>
                    {selectedProduct.batteryHealth && (
                      <div className="bg-gray-50 p-4 rounded-3xl border border-gray-200/50 col-span-2">
                        <div className="flex items-center gap-3 mb-1 text-slate-500">
                          <BatteryLow size={16} />
                          <span className="text-xs font-bold">حالة البطارية</span>
                        </div>
                        <p className="text-foreground font-bold">{selectedProduct.batteryHealth}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto">
                    <p className="text-sm text-slate-500 font-bold mb-1">السعر النهائي للجمهور</p>
                    <div className="flex items-baseline gap-2 mb-8">
                       <span className="text-6xl font-black text-foreground">{fmt(selectedProduct.price)}</span>
                       <span className="text-xl font-bold text-slate-500">ج.م</span>
                    </div>

                    <button className="w-full py-6 rounded-3xl bg-cyan-500 text-slate-900 font-black text-xl shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition-colors">
                      احجز الآن 🔒
                    </button>
                    <p className="text-center mt-4 text-xs font-bold text-slate-500">
                      * الأسعار قابلة للتحديث وفقاً لتغيرات السوق اليومية
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
