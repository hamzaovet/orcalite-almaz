'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Scan, Plus, X, Trash2, ShoppingCart, TrendingUp,
  Loader2, Banknote, CheckCircle2,
  Banknote as Cash, CreditCard, Building2, Zap, Smartphone,
  Package, User, Phone, Calendar, Download, MessageCircle, Printer, Receipt,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImeiScanner } from '@/components/dashboard/ImeiScanner'
import { InvoiceTemplate, type InvoiceData } from '@/components/dashboard/InvoiceTemplate'
import { triggerNativePrint, openWhatsApp } from '@/components/dashboard/invoiceUtils'
import { DeleteConfirmModal } from '@/components/dashboard/DeleteConfirmModal'

/* ── Types ──────────────────────────────────────────────────── */
type PaymentMethod = 'Cash' | 'Visa' | 'Valu' | 'InstaPay' | 'Vodafone Cash'

interface ApiProduct {
  _id: string
  name: string
  category: string
  price: number
  costPrice?: number
  stock: number
  imageUrl?: string
  serialNumber?: string
  storage?: string
  color?: string
  condition?: string
  isSerialized?: boolean
  location?: string
  branchId?: string
  ownershipType?: 'Owned' | 'Consignment'
}

interface CartItem {
  product:             ApiProduct
  qty:                 number
  actualUnitPrice:     number
  inventoryUnitId?:    string // Populated for serialized items
  serialNumber?:       string // Populated for serialized items
  landedCost?:         number // Exact cost from unit OR fallback costPrice
  profit?:             number // (actualUnitPrice - landedCost) * qty
  fulfillmentLocation: string
}

interface SaleRecord {
  _id: string
  customer: string
  phone?: string
  date: string
  invoiceNumber: string
  items: { productName: string; qty: number; actualUnitPrice: number }[]
  totalSalePrice: number
  profit: number
  paymentMethod: PaymentMethod
}

const PAYMENT_META: Record<PaymentMethod, { label: string; color: string; icon: React.ElementType }> = {
  'Cash':         { label: 'كاش',         color: '#22C55E', icon: Cash },
  'Visa':         { label: 'فيزا',         color: '#06B6D4', icon: CreditCard },
  'Valu':         { label: 'ValU',         color: '#A855F7', icon: Building2 },
  'InstaPay':     { label: 'إنستاباي',    color: '#FB923C', icon: Zap },
  'Vodafone Cash':{ label: 'فودافون كاش', color: '#EF4444', icon: Smartphone },
}

function fmt(n: number) {
  return n.toLocaleString('ar-EG', { minimumFractionDigits: 0 })
}

export default function SalesPage() {
  const [products,  setProducts]  = useState<ApiProduct[]>([])
  const [sales,     setSales]     = useState<SaleRecord[]>([])
  const [loading,   setLoading]   = useState(true)
  const [cart,      setCart]      = useState<CartItem[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const [checkoutModal, setCheckoutModal] = useState(false)
  const [successModal,  setSuccessModal]  = useState(false)
  const [completedSale, setCompletedSale] = useState<InvoiceData | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  // Customer form
  const [customer,      setCustomer]      = useState('')
  const [phone,         setPhone]         = useState('')
  const [date,          setDate]          = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash')

  const [submitting,    setSubmitting]    = useState(false)
  const [toast,         setToast]         = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [search,        setSearch]        = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [dbBranches,    setDbBranches]    = useState<{_id: string, name: string}[]>([])
  const [storeSettings, setStoreSettings] = useState<{ storeName?: string; storeLogoUrl?: string }>({})
  const [branchInventoryMap, setBranchInventoryMap] = useState<Record<string, number>>({})
  const [availableUnits, setAvailableUnits] = useState<any[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [rP, rS, rB, resSettings] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/sales'),
        fetch('/api/branches'),
        fetch('/api/settings'),
      ])
      const [dP, dS, dB, dSettings] = await Promise.all([rP.json(), rS.json(), rB.json(), resSettings.json()])
      setProducts(dP.products ?? [])
      setSales(dS.sales ?? [])
      setDbBranches(dB.branches ?? [])
      if (dB.branches?.length > 0) {
        setSelectedBranch(dB.branches[0]._id)
      }
      if (dSettings && !dSettings.error) {
        setStoreSettings(dSettings)
      }
    } catch { showToast('فشل تحميل البيانات', 'err') }
    finally { setLoading(false) }
  }, [])

  async function handleDeleteSale(password: string) {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/sales/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'فشل الحذف')
      showToast('تم حذف الفاتورة واسترجاع المخزون بنجاح', 'ok')
      setSales(prev => prev.filter(s => s._id !== deleteId))
    } catch (err: any) {
      showToast(err.message, 'err')
    } finally {
      setDeleteId(null)
    }
  }

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!selectedBranch || selectedBranch === 'all') {
      setBranchInventoryMap({});
      return;
    }
    fetch(`/api/inventory?locationId=${selectedBranch}\u0026status=Available`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.units) {
          setAvailableUnits(data.units);
          const newMap: Record<string, number> = {};
          data.units.forEach((u: any) => {
            const pId = String(u.productId?._id || u.productId);
            newMap[pId] = (newMap[pId] || 0) + (Number(u.quantity) || 1);
          });
          setBranchInventoryMap(newMap);
        }
      })
      .catch(err => console.error("Inventory Fetch Error:", err));
  }, [selectedBranch]);

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  function addToCart(product: ApiProduct | any) {
    if (!selectedBranch || selectedBranch === 'all') {
      showToast('يرجى تحديد الفرع أولاً لإتمام البيع', 'err');
      return;
    }

    // If it's a specific unit from disaggregated view
    if (product.isUnit && product.inventoryUnitId) {
      setCart(prev => {
        if (prev.some(i => i.inventoryUnitId === product.inventoryUnitId)) {
          showToast('هذا الجهاز موجود بالفعل في السلة', 'err')
          return prev
        }
        return [...prev, {
          product: product,
          qty: 1,
          actualUnitPrice: product.price,
          inventoryUnitId: product.inventoryUnitId,
          serialNumber: product.serialNumber,
          landedCost: product.landedCost || product.costPrice,
          profit: product.price - (product.landedCost || product.costPrice || 0),
          fulfillmentLocation: selectedBranch
        }]
      })
      showToast(`تمت إضافة الجهاز: ${product.name}`, 'ok')
      return
    }

    const localStock = branchInventoryMap[String(product._id)] || 0
    if (localStock <= 0) {
      showToast(`${product.name} — نفد المخزون في هذا الفرع`, 'err')
      return 
    }

    const isSerial = product.isSerialized ?? Boolean(product.serialNumber)
    setCart(prev => {
      const existing = prev.find(i => i.product._id === product._id)
      if (existing) {
        if (isSerial) { showToast('الجهاز مُسلسل — لا يمكن التكرار', 'err'); return prev }
        return prev.map(i => i.product._id === product._id ? { ...i, qty: Math.min(i.qty + 1, localStock) } : i)
      }
      return [...prev, { product, qty: 1, actualUnitPrice: product.price, fulfillmentLocation: selectedBranch }]
    })
    showToast(`تمت إضافة ${product.name}`, 'ok')
  }

  function removeFromCart(id: string) { setCart(prev => prev.filter(i => i.product._id !== id)) }
  function updateQty(id: string, qty: number) { if (qty < 1) return; setCart(prev => prev.map(i => i.product._id === id ? { ...i, qty } : i)) }
  function updatePrice(id: string, price: number) { setCart(prev => prev.map(i => i.product._id === id ? { ...i, actualUnitPrice: price } : i)) }
  function updateLocation(id: string, loc: string) { setCart(prev => prev.map(i => i.product._id === id ? { ...i, fulfillmentLocation: loc } : i)) }

  async function handleScan(serial: string) {
    if (!serial.trim()) return
    if (!selectedBranch || selectedBranch === 'all') {
      showToast('يرجى تحديد الفرع أولاً لإتمام البيع', 'err');
      return;
    }
    setShowScanner(false)
    setSearch('') // Clear search display

    try {
      // 1. HYBRID SEARCH: Check InventoryUnit first (IMEI)
      const resInv = await fetch(`/api/inventory?serialNumber=${serial}&status=Available`)
      const dataInv = await resInv.json()

      if (dataInv.success && dataInv.units?.length > 0) {
        const unit = dataInv.units[0]
        const product = products.find(p => p._id === unit.productId?._id)
        if (!product) throw new Error('المنتج المرتبط بالوحدة غير موجود')

        setCart(prev => {
          // Check if this specific unit is already in cart
          if (prev.some(i => i.inventoryUnitId === unit._id)) {
            showToast('هذا الجهاز موجود بالفعل في السلة', 'err')
            return prev
          }
          return [...prev, {
            product,
            qty: 1,
            actualUnitPrice: product.price,
            inventoryUnitId: unit._id,
            serialNumber: unit.serialNumber,
            landedCost: unit.landedCostEGP,
            profit: product.price - unit.landedCostEGP,
            fulfillmentLocation: product.branchId || 'Main Store'
          }]
        })
        showToast(`✓ تم العثور على IMEI: ${product.name}`, 'ok')
        return
      }

      // 2. FALLBACK: Search Products by Code/Name
      const foundProduct = products.find(p => p.name === serial || p.serialNumber === serial)
      if (foundProduct) {
        addToCart(foundProduct)
        return
      }

      throw new Error('لم يتم العثور على IMEI أو منتج بهذا الرمز')
    } catch (err: any) {
      showToast(err.message, 'err')
    }
  }

  const totalList  = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  const totalSale  = cart.reduce((s, i) => s + i.actualUnitPrice * i.qty, 0)
  const totalCost  = cart.reduce((s, i) => s + (i.product.costPrice ?? 0) * i.qty, 0)
  const totalProfit = totalSale - totalCost
  const totalDiscount = totalList - totalSale

  async function handleCheckout() {
    if (!customer.trim()) { showToast('اسم العميل مطلوب', 'err'); return }
    if (cart.length === 0) { showToast('السلة فارغة', 'err'); return }
    setSubmitting(true)
    try {
      const payload = {
        customer,
        phone,
        date,
        paymentMethod,
        branchId: selectedBranch,
        items: cart.map(i => ({
          productId: i.product._id,
          inventoryUnitId: i.inventoryUnitId,
          qty: i.qty,
          actualUnitPrice: i.actualUnitPrice
        }))
      }

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message)

      setCompletedSale({ 
        invoiceNumber: json.sale.invoiceNumber, 
        date: new Date().toLocaleDateString('ar-EG'), 
        time: new Date().toLocaleTimeString('ar-EG'), 
        customer, 
        phone: phone || undefined, 
        paymentMethod, 
        items: cart.map(i => ({ 
          productName: i.product.name, 
          serialNumber: i.serialNumber, 
          storage: i.product.storage, 
          color: i.product.color, 
          batteryHealth: (i.product as any).batteryHealth,
          condition: i.product.condition === 'new' ? 'New' : 'Used', 
          qty: i.qty, 
          unitPrice: i.product.price, 
          actualUnitPrice: i.actualUnitPrice 
        })), 
        totalListPrice: totalList, 
        totalSalePrice: totalSale, 
        discount: totalDiscount, 
        profit: totalProfit,
        branchName: dbBranches.find(b => b._id === selectedBranch)?.name || 'المركز الرئيسي'
      })
      setCheckoutModal(false); setSuccessModal(true); setCart([]); setCustomer(''); setPhone(''); setPaymentMethod('Cash'); loadData()
    } catch (err: any) { showToast(err.message, 'err') } finally { setSubmitting(false) }
  }

  // 2. Filter the UI array
  const displayedItems: any[] = [];
  
  products.forEach(p => {
    const isPhone = p.category?.includes('محمولة') || p.category?.includes('ذكية');
    
    if (isPhone && selectedBranch && selectedBranch !== 'all') {
      // Disaggregation Phase: Find all units for this phone in this branch
      const units = availableUnits.filter(u => String(u.productId?._id || u.productId) === String(p._id));
      units.forEach(u => {
        // Search Filter at Unit Level
        const searchMatch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                           (u.serialNumber ?? '').toLowerCase().includes(search.toLowerCase());
        
        if (searchMatch) {
          displayedItems.push({
            ...p,
            _id: u._id,
            masterId: p._id,
            serialNumber: u.serialNumber,
            attributes: {
              capacity: u.storage,
              color: u.color,
              battery: u.batteryHealth
            },
            batteryHealth: u.batteryHealth,
            color: u.color,
            storage: u.storage,
            price: u.sellPrice || p.price,
            isUnit: true,
            inventoryUnitId: u._id,
            landedCost: u.landedCostEGP
          });
        }
      });
    } else {
      // Aggregation Phase: Accessories, Spare Parts, or No Branch Selected
      const searchMatch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.serialNumber ?? '').includes(search);
      if (!searchMatch) return;

      const currentStock = (selectedBranch && selectedBranch !== 'all') ? (branchInventoryMap[String(p._id)] || 0) : p.stock;
      if (currentStock > 0 || !selectedBranch || selectedBranch === 'all') {
         displayedItems.push({ ...p, currentStock });
      }
    }
  });

  const finalDisplayed = displayedItems.filter(item => {
    if (activeCategory === 'All') return true;
    return (activeCategory === 'Mobiles' && (item.category?.includes('محمولة') || item.category?.includes('ذكية'))) || 
           (activeCategory === 'Accessories' && item.category?.includes('إكسسوار')) || 
           (activeCategory === 'Spare Parts' && item.category?.includes('غيار'));
  });

  /* ── Styles ── */
  const card: React.CSSProperties = {
    background: '#FFFFFF', borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '0.8rem 1rem', border: '1px solid #E2E8F0',
    borderRadius: 12, fontSize: '0.95rem', fontFamily: 'inherit', color: '#0F172A',
    outline: 'none', background: '#ECFEFF', boxSizing: 'border-box'
  }
  const lbl: React.CSSProperties = {
    fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.4rem'
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', color: '#1E293B', padding: '0 1.5rem' }}>
      <div className="no-print">

      
      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.type === 'ok' ? '#06B6D4' : '#EF4444', color: '#0F172A', padding: '0.65rem 1.5rem', borderRadius: 50, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.22em', color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.4rem' }}>البيع والفوترة المباشرة</p>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0F172A' }}>نظام المبيعات</h1>
        </div>
        <button onClick={() => setShowScanner(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#ECFEFF', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 14, padding: '0.85rem 1.8rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Scan size={20} /> مسح IMEI الذكي
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) auto', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
         <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
           {['All', 'Mobiles', 'Accessories', 'Spare Parts'].map(cat => (
             <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '0.6rem 1.2rem', borderRadius: 12, border: 'none', background: activeCategory === cat ? '#06B6D4' : 'rgba(6,182,212,0.1)', color: activeCategory === cat ? '#fff' : '#06B6D4', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
               {cat === 'All' ? 'الكل' : cat === 'Mobiles' ? 'هواتف محمولة' : cat === 'Accessories' ? 'إكسسوارات' : 'قطع غيار'}
             </button>
           ))}
         </div>
         <select style={{ ...inp, width: 'auto', borderColor: '#06B6D4', fontWeight: 800, padding: '0.6rem 1.2rem' }} value={selectedBranch} onChange={e => {setSelectedBranch(e.target.value); setCart([])}}>
           <option value="all">جميع الفروع (للعرض فقط)</option>
           {dbBranches.map(b => (
             <option key={b._id} value={b._id}>{b.name}</option>
           ))}
         </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        
        <div>
          <div style={{ ...card, padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', border: '2px solid rgba(6,182,212,0.3)' }}>
            <Scan color="#06B6D4" size={24} />
            <input 
              autoFocus 
              type="text" 
              placeholder="امسح IMEI أو ابحث عن منتج..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleScan(search)}
              style={{ ...inp, border: 'none', background: 'transparent', fontSize: '1.1rem', fontWeight: 800 }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {finalDisplayed.map(p => {
              const currentStock = p.isUnit ? 1 : p.currentStock;
              return (
              <motion.div key={p._id} whileHover={{ y: -5 }} onClick={() => addToCart(p)}
                style={{ ...card, padding: '1rem', cursor: 'pointer', borderColor: (p.isUnit ? cart.some(c=>c.inventoryUnitId===p._id) : cart.some(c=>c.product._id===p._id)) ? '#06B6D4' : 'rgba(6,182,212,0.15)' }}
              >
                <div style={{ height: 100, background: '#ECFEFF', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', position: 'relative' }}>
                  {p.imageUrl ? <img src={p.imageUrl} style={{ maxHeight: '80%', objectFit: 'contain' }} /> : <Package size={32} color="#06B6D4" />}
                  {!p.isUnit && (
                    <span style={{ position: 'absolute', top: 8, left: 8, background: '#06B6D4', color: '#0F172A', fontSize: '0.65rem', fontWeight: 900, padding: '0.2rem 0.5rem', borderRadius: 50 }}>
                      {currentStock} وحدة
                    </span>
                  )}
                  {p.isUnit && (
                    <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                       {p.attributes?.battery && <span style={{ background: '#22C55E', color: '#0F172A', fontSize: '0.55rem', fontWeight: 900, padding: '0.1rem 0.3rem', borderRadius: 4 }}>{p.attributes.battery}%</span>}
                    </div>
                  )}
                </div>
                <p style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                {p.isUnit && (
                  <>
                    <p className="text-xs text-gray-500">
                      {p.attributes?.capacity || ''} | {p.attributes?.color || ''} | {p.attributes?.battery ? p.attributes.battery + '%' : ''}
                    </p>
                    <div className="mt-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">IMEI: {p.serialNumber}</span>
                    </div>
                  </>
                )}
                <p style={{ fontWeight: 900, fontSize: '1.1rem', color: '#06B6D4', direction: 'ltr', textAlign: 'right' }}>{fmt(p.price)} <small style={{ fontSize: '0.6rem' }}>ج.م</small></p>
              </motion.div>
            )})}
          </div>
        </div>

        {/* Cart Section */}
        <div style={{ position: 'sticky', top: '2rem' }}>
          <div style={{ ...card, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
              <ShoppingCart size={24} color="#06B6D4" />
              <h2 style={{ fontWeight: 900, fontSize: '1.2rem' }}>تفاصيل الطلب</h2>
            </div>

            <div style={{ maxHeight: 350, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cart.map(item => (
                <div key={item.product._id} style={{ background: '#F8FAFC', borderRadius: 14, padding: '0.85rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>{item.product.name}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                        {item.serialNumber && (
                           <span style={{ fontSize: '0.65rem', background: '#ECFEFF', color: '#06B6D4', padding: '0.1rem 0.4rem', borderRadius: 4, fontWeight: 700 }}>IMEI: {item.serialNumber}</span>
                        )}
                        {(item.product.storage || item.product.color) && (
                           <span style={{ fontSize: '0.65rem', color: '#475569' }}>
                             {[item.product.storage, item.product.color].filter(Boolean).join(' | ')}
                           </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.product._id)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}><X size={16} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!item.product.serialNumber && <input type="number" value={item.qty} onChange={e=>updateQty(item.product._id, Number(e.target.value))} style={{ ...inp, width: 60, padding: '0.4rem' }} />}
                    <input type="number" value={item.actualUnitPrice} onChange={e=>updatePrice(item.product._id, Number(e.target.value))} style={{ ...inp, flex: 1, padding: '0.4rem', direction: 'ltr' }} />
                  </div>
                </div>
              ))}
              {cart.length === 0 && <p style={{ textAlign: 'center', color: '#475569', padding: '2rem' }}>السلة فارغة</p>}
            </div>

            {cart.length > 0 && (
              <div style={{ background: '#ECFEFF', borderRadius: 16, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 900, color: '#0F172A' }}><span>الإجمالي</span><span style={{ direction: 'ltr' }}>{fmt(totalSale)} ج.م</span></div>
                {totalDiscount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FB923C', fontWeight: 800, fontSize: '0.85rem' }}><span>الخصم</span><span style={{ direction: 'ltr' }}>- {fmt(totalDiscount)} ج.م</span></div>}
                <div style={{ height: '1px', background: '#ECFEFF', margin: '0.25rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>صافي الربح المتوقع</span>
                  <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', padding: '0.2rem 0.6rem', borderRadius: 10, fontSize: '0.95rem', fontWeight: 950 }}>{fmt(totalProfit)} ج.م +</span>
                </div>
              </div>
            )}

            <button onClick={() => setCheckoutModal(true)} disabled={cart.length === 0}
              style={{ padding: '1.1rem', background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 16, fontWeight: 900, cursor: 'pointer', fontSize: '1.1rem', boxShadow: '0 8px 32px rgba(6,182,212,0.3)', opacity: cart.length===0?0.5:1 }}
            >إتمام العملية</button>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {checkoutModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(8, 12, 20, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(12px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: '#F8FAFC', borderRadius: 28, width: '100%', maxWidth: 500, padding: '2.5rem', border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 32px 100px rgba(0,0,0,0.15)' }}
            >
              <h2 style={{ fontWeight: 900, fontSize: '1.5rem', marginBottom: '2rem' }}>بيانات العميل والدفع</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div><label style={lbl}>اسم العميل *</label><input style={inp} value={customer} onChange={e=>setCustomer(e.target.value)} /></div>
                  <div><label style={lbl}>تاريخ العملية *</label><input type="date" style={{...inp, direction:'ltr'}} value={date} onChange={e=>setDate(e.target.value)} /></div>
                </div>
                <div><label style={lbl}>رقم الهاتف</label><input style={{...inp, direction:'ltr'}} value={phone} onChange={e=>setPhone(e.target.value)} /></div>
                
                <div>
                  <label style={lbl}>طريقة الدفع *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {Object.entries(PAYMENT_META).map(([m, meta]) => (
                      <button key={m} onClick={() => setPaymentMethod(m as any)} style={{ padding: '0.85rem', borderRadius: 12, fontWeight: 800, cursor: 'pointer', border: paymentMethod===m ? `2px solid ${meta.color}` : '2px solid #F8FAFC', background: paymentMethod===m ? `${meta.color}15` : '#F1F5F9', color: paymentMethod===m ? meta.color : '#64748B' }}>{meta.label}</button>
                    ))}
                  </div>
                </div>

                <button onClick={handleCheckout} disabled={submitting} style={{ background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 16, padding: '1.1rem', fontWeight: 900, cursor: 'pointer', marginTop: '1rem' }}>
                  {submitting ? <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} /> : 'تأكيد وحفظ الفاتورة'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {successModal && completedSale && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(8, 12, 20, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(16px)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ ...card, maxWidth: 450, textAlign: 'center', padding: '3rem' }}
            >
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid #22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><CheckCircle2 size={40} color="#22C55E" /></div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.5rem' }}>تمت العملية بنجاح</h2>
              <p style={{ color: '#475569', marginBottom: '2rem' }}>رقم الفاتورة: #{completedSale.invoiceNumber}</p>
              
              <div style={{ display: 'grid', gap: '1rem' }}>
                <button onClick={() => triggerNativePrint(completedSale.invoiceNumber)} style={{ padding: '1rem', background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><Download size={18} /> طباعة الفاتورة | Print Invoice</button>
                <button onClick={() => openWhatsApp(completedSale.phone || '', completedSale)} style={{ padding: '1rem', background: '#22C55E', color: '#0F172A', border: 'none', borderRadius: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><MessageCircle size={18} /> إرسال عبر واتساب</button>
                <button onClick={() => {setSuccessModal(false); setCompletedSale(null)}} style={{ padding: '0.8rem', background: 'transparent', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 14, fontWeight: 700, cursor: 'pointer' }}>إغلاق</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div> {/* End .no-print */}

      {showScanner && <ImeiScanner onClose={() => setShowScanner(false)} onScanSuccess={handleScan} />}

      {/* Recent Sales Log */}
      <div style={{ marginTop: '3rem', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 24, padding: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '1.5rem', color: '#06B6D4', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Receipt size={20} /> سجل المبيعات الأخيرة
        </h2>
        {sales.length === 0 ? (
          <p style={{ color: '#475569', textAlign: 'center', padding: '2rem' }}>لا توجد مبيعات مسجلة</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', background: '#F8FAFC' }}>
                  <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 800, borderRadius: '0 12px 12px 0' }}>رقم الفاتورة</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 800 }}>التاريخ</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 800 }}>العميل</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 800 }}>الإجمالي</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 800 }}>الدفع</th>
                  <th style={{ padding: '0.85rem 1rem', color: '#475569', fontWeight: 800, textAlign: 'center', borderRadius: '12px 0 0 12px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 20).map((sale: any) => (
                  <tr key={sale._id} style={{ borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' }}>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span style={{ fontWeight: 900, color: '#06B6D4', fontSize: '0.85rem' }}>{sale.invoiceNumber || '#'}</span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', color: '#475569', whiteSpace: 'nowrap' }}>
                      {new Date(sale.date || sale.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', fontWeight: 800 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={14} color="#94A3B8" />
                        {sale.customer}
                      </div>
                    </td>
                    <td style={{ padding: '1.1rem 1rem', fontWeight: 900, color: '#0F172A', fontSize: '1rem' }}>
                      {(sale.totalAmount || sale.totalSalePrice || 0).toLocaleString('ar-EG')} ج.م
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 800,
                        padding: '0.25rem 0.6rem', borderRadius: 8,
                        background: sale.paymentMethod === 'Cash' ? 'rgba(34,197,94,0.1)' : 'rgba(6,182,212,0.1)',
                        color: sale.paymentMethod === 'Cash' ? '#22C55E' : '#06B6D4'
                      }}>
                        {sale.paymentMethod === 'Cash' ? 'نقدي' : sale.paymentMethod === 'Visa' ? 'فيزا' : sale.paymentMethod === 'InstaPay' ? 'إنستاباي' : sale.paymentMethod || 'نقدي'}
                      </span>
                    </td>
                    <td style={{ padding: '1.1rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => triggerNativePrint(sale.invoiceNumber)}
                          style={{ 
                            background: '#06B6D4', color: '#0F172A', border: 'none', padding: '0.55rem 1rem', borderRadius: 12, 
                            fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', boxShadow: '0 8px 20px rgba(6,182,212,0.2)'
                          }}
                        >
                          <Printer size={14} /> طباعة الفاتورة
                        </button>
                        
                        <button 
                          onClick={() => setDeleteId(sale._id)} 
                          style={{ 
                            background: '#1e1b4b', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)', padding: '0.55rem 1rem', borderRadius: 12, 
                            cursor: 'pointer', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' 
                          }}
                        >
                          <Trash2 size={14} /> حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hidden Invoice DOM for PDF Capture */}
      {completedSale && (
        <div className="print-only">
           <InvoiceTemplate data={completedSale} storeName={storeSettings.storeName} storeLogoUrl={storeSettings.storeLogoUrl} />
        </div>
      )}

      <DeleteConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteSale}
        title="حذف فاتورة المبيعات"
        description="تحذير: سيتم حذف الفاتورة واسترجاع المخزون وإلغاء حركة الخزينة. هذه العملية لا يمكن التراجع عنها."
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
