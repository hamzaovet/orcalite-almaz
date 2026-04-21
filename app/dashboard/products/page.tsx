'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Package, Search, Upload, Loader2, Scan, DollarSign, Percent, Share2, Send, FileText, Printer } from 'lucide-react'
import { ImeiScanner } from '@/components/dashboard/ImeiScanner'
import { PrintHeader } from '@/components/dashboard/PrintHeader'
import { motion, AnimatePresence } from 'framer-motion'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

const IMGBB_KEY = '1705736b8f2b46dcbaeec8a6025aca83'

/* ─── Types ─────────────────────────────────────────────────── */
type Product = {
  _id?: string
  name: string
  category: string
  price: number
  costPrice?: number
  stock: number
  specs?: string
  imageUrl?: string
  categoryId?: {_id: string, name: string} | string
  supplierId?: {_id: string, name: string} | string
  condition?: string
  branchId?: string | any
  ownershipType?: 'Owned' | 'Consignment' | string
  isSerialized?: boolean
  badge?: string
  serialNumber?: string
  storage?: string
  color?: string
  batteryHealth?: string
  // Wholesale
  costForeign?: number
  wholesaleMargin?: number
  wholesalePriceEGP?: number
  foreignCurrency?: 'AED' | 'USD'
  taxPercentage?:    number
  taxAmountEGP?:     number
}

type FormState = {
  _id:      string
  name:     string
  category: string
  price:    string
  costPrice: string
  stock:    string
  specs:    string
  badge:    string
  imageUrl: string
  categoryId: string
  condition: string
  serialNumber: string
  storage: string
  color: string
  batteryHealth: string
  supplierName: string
  supplierId: string
  isSerialized: boolean
  branchId: string
  ownershipType: 'Owned' | 'Consignment'
  // Wholesale
  costForeign: string
  wholesaleMargin: string
  wholesalePriceEGP: number
  foreignCurrency: 'AED' | 'USD'
  taxType: 'PERCENTAGE' | 'FIXED'
  taxValue: string
  description: string
}

const blankForm: FormState = {
  _id:      '',
  name:     '',
  category: 'موبايلات',
  price:    '',
  costPrice:'',
  stock:    '',
  specs:    '',
  badge:    '',
  imageUrl: '',
  categoryId: '',
  condition: 'new',
  description: '',
  serialNumber: '',
  storage: '',
  color: '',
  batteryHealth: '',
  supplierName: '',
  supplierId: '',
  isSerialized: true,
  branchId: '',
  ownershipType: 'Owned',
  costForeign: '',
  wholesaleMargin: '0',
  wholesalePriceEGP: 0,
  foreignCurrency: 'AED',
  taxType: 'PERCENTAGE',
  taxValue: '0',
}

export default function ProductsPage() {
  const [items, setItems]           = useState<Product[]>([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [isEditing, setIsEditing]   = useState(false)
  const [dbCategories, setDbCategories] = useState<{_id: string, name: string}[]>([])
  const [dbSuppliers, setDbSuppliers]   = useState<{_id: string, name: string}[]>([])
  const [dbBranches, setDbBranches]     = useState<{_id: string, name: string}[]>([])
  const [exchangeRate, setExchangeRate] = useState<number>(1)    // AED → EGP
  const [exchangeRateUSD, setExchangeRateUSD] = useState<number>(1) // USD → EGP
  const [form, setForm]             = useState<FormState>(blankForm)
  const [imageFile, setImageFile]   = useState<File | null>(null)
  const [imagePreview, setPreview]  = useState<string>('')
  const [uploading, setUploading]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [search, setSearch]         = useState('')
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [toast, setToast]           = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [waModal, setWaModal]         = useState(false)
  const [waPhone, setWaPhone]         = useState('')
  const [businessType, setBusinessType] = useState('B2B_WHALE')
  const fileRef                     = useRef<HTMLInputElement>(null)
  const pdfTemplateRef              = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    setLoading(true)
    try {
      const [resP, resC, resS, resB, resSet] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/suppliers'),
        fetch('/api/branches'),
        fetch('/api/settings'),
      ])
      const [dataP, dataC, dataS, dataB, dataSet] = await Promise.all([resP.json(), resC.json(), resS.json(), resB.json(), resSet.json()])
      setItems(dataP.products ?? [])
      setDbCategories(dataC.categories ?? [])
      setDbSuppliers(dataS.suppliers ?? [])
      setDbBranches(dataB.branches ?? [])
      setExchangeRate(dataSet.exchangeRate    || 1)
      setExchangeRateUSD(dataSet.exchangeRateUSD || 1)
      if (dataSet.businessType) setBusinessType(dataSet.businessType)
    } catch { showToast('فشل تحميل البيانات', 'err') }
    finally { setLoading(false) }
  }

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function openNew() {
    setIsEditing(false); setForm(blankForm); setImageFile(null); setPreview(''); setModal(true)
  }

  function openEdit(p: Product) {
    setIsEditing(true)
    setForm({
      _id:      p._id      ?? '',
      name:     p.name     ?? '',
      category: p.category ?? 'موبايلات',
      price:    String(p.price  ?? ''),
      costPrice:String(p.costPrice ?? ''),
      stock:    String(p.stock  ?? ''),
      specs:    p.specs    ?? '',
      badge:    p.badge    ?? '',
      imageUrl: p.imageUrl ?? '',
      categoryId: typeof p.categoryId === 'string' ? p.categoryId : p.categoryId?._id ?? '',
      condition: p.condition ? String(p.condition).toLowerCase() : 'new',
      description: p.description ?? '',
      serialNumber: p.serialNumber ?? '',
      storage: p.storage ?? '',
      color: p.color ?? '',
      batteryHealth: p.batteryHealth ?? '',
      supplierName: '',
      supplierId: typeof p.supplierId === 'string' ? p.supplierId : p.supplierId?._id ?? '',
      isSerialized: p.isSerialized ?? false,
      branchId: typeof p.branchId === 'string' ? p.branchId : p.branchId?._id ?? '',
      ownershipType: (p.ownershipType as any) || 'Owned',
      costForeign: String(p.costForeign ?? ''),
      wholesaleMargin: String(p.wholesaleMargin ?? '0'),
      wholesalePriceEGP: p.wholesalePriceEGP ?? 0,
      foreignCurrency: ((p as any).foreignCurrency as 'AED' | 'USD') || 'AED',
      taxType: ((p as any).taxType as 'PERCENTAGE' | 'FIXED') || 'PERCENTAGE',
      taxValue: String((p as any).taxValue ?? (p.taxPercentage ?? '0')),
      description: p.description ?? '',
    })
    setImageFile(null); setPreview(p.imageUrl ?? ''); setModal(true)
  }

  // Selected currency rate drives both the live wholesale price and the auto local cost
  const selectedRate = form.foreignCurrency === 'USD' ? exchangeRateUSD : exchangeRate

  // TRUE LANDED COST (Phase 10.A.9):
  // If costPrice was previously synced from a received shipment (and includes allocated expenses),
  // use it as the base. Otherwise fall back to the raw foreign × rate approximation for new products.
  const dbSyncedLandedCost = Number(form.costPrice) || 0
  const rawForeignLocalCost = useMemo(() => {
    const cf = Number(form.costForeign) || 0
    return cf * selectedRate
  }, [form.costForeign, selectedRate])

  // liveLocalCost = DB landed (true) when synced from shipment, raw calc otherwise
  const liveLocalCost = dbSyncedLandedCost > 0 ? dbSyncedLandedCost : rawForeignLocalCost

  // Live wholesale = true landed cost × (1 + margin%)
  const liveWholesale = useMemo(() => {
    const base = dbSyncedLandedCost > 0 ? dbSyncedLandedCost : rawForeignLocalCost
    const wm = Number(form.wholesaleMargin) || 0
    return base * (1 + wm / 100)
  }, [dbSyncedLandedCost, rawForeignLocalCost, form.wholesaleMargin])

  async function handleSave() {
    if (!form.name.trim() || form.price === '' || form.stock === '') {
      return showToast('يرجى التأكد من اسم المنتج، السعر، والمخزون', 'err')
    }
    setSaving(true)
    try {
      const body = {
        ...form,
        name: form.name.trim(),
        price: Number(form.price),
        // Phase 10.A.9: Save the TRUE landed cost (DB-synced from shipment when available)
        costPrice: liveLocalCost,
        stock: Number(form.stock),
        costForeign: Number(form.costForeign),
        wholesaleMargin: Number(form.wholesaleMargin),
        wholesalePriceEGP: liveWholesale,
        foreignCurrency: form.foreignCurrency,
        description: form.description,
        taxType: form.taxType,
        taxValue: Number(form.taxValue),
        imageUrl: form.imageUrl.trim(),
        _id: isEditing ? form._id : undefined
      }
      const res  = await fetch('/api/products', { method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      fetchProducts(); setModal(false); showToast('تم الحفظ بنجاح ✓', 'ok')
    } catch (err: any) { showToast(err.message, 'err') } finally { setSaving(false) }
  }

  async function uploadToImgBB(file: File): Promise<string> {
    const fd = new FormData(); fd.append('image', file)
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd })
    const data = await res.json()
    return data.data.display_url
  }

  async function handleDelete(id: string) {
    try { await fetch(`/api/products?id=${id}`, { method: 'DELETE' }); fetchProducts(); showToast('تم الحذف', 'ok') }
    catch { showToast('فشل الحذف', 'err') } finally { setDeleteId(null) }
  }

  function exportToWhatsApp() {
    if (items.length === 0) return alert('لا توجد منتجات لتصديرها')
    
    let text = "🟦 FREE ZONE | فري زون للإستيراد 🟦\n\n"
    
    items.forEach(p => {
      const price = p.wholesalePriceEGP || 0
      text += `📱 *${p.name}*\n`
      text += `💰 سعر الجملة: *${price.toLocaleString('ar-EG')}* ج.م\n`
      if (p.condition) text += `✨ الحالة: ${p.condition === 'new' ? 'جديد' : 'مستعمل'}\n`
      text += `──────────────────\n`
    })
    
    text += "\n🚚 متاح الآن للتسليم الفوري"
    
    navigator.clipboard.writeText(text)
      .then(() => alert('تم نسخ اللستة بنجاح!'))
      .catch(() => alert('فشل النسخ إلى الحافظة'))
  }

  function sendToWhatsApp() {
    if (items.length === 0) return alert('لا توجد منتجات لإرسالها')
    setWaPhone('')
    setWaModal(true)
  }

  function executeWaSend() {
    if (!waPhone.trim()) return alert('يرجى إدخال رقم الهاتف')
    
    // Clean phone number: remove non-digits
    let clean = waPhone.replace(/\D/g, '')
    
    // Add Egypt prefix if missing
    if (clean.length === 11 && clean.startsWith('01')) {
      clean = '2' + clean 
    } else if (clean.length === 10 && clean.startsWith('1')) {
      clean = '20' + clean
    }

    const today = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    let message = `🟦 *FREE ZONE | فري زون للإستيراد* 🟦\n`
    message += `🗓️ تاريخ: ${today}\n\n`
    
    items.forEach(p => {
      const price = p.wholesalePriceEGP || 0
      message += `📱 *${p.name}*\n`
      message += `💰 سعر الجملة: *${price.toLocaleString('ar-EG')}* ج.م\n`
      if (p.condition) message += `✨ الحالة: ${p.condition === 'new' ? 'جديد' : 'مستعمل'}\n`
      message += `──────────────────\n`
    })
    
    message += `\n🚚 متاح الآن للتسليم الفوري`
    
    const waUrl = `https://api.whatsapp.com/send?phone=${clean}&text=${encodeURIComponent(message)}`
    window.open(waUrl, '_blank')
    setWaModal(false)
  }

  async function generatePDF() {
    if (items.length === 0) return alert('لا توجد منتجات للتصدير')
    if (!pdfTemplateRef.current) return
    
    setGeneratingPDF(true)
    try {
      const canvas = await html2canvas(pdfTemplateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      })
      
      const imgProps = pdf.getImageProperties(imgData)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`FreeZone_PriceList_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`)
      showToast('تم تحميل PDF بنجاح', 'ok')
    } catch (err) {
      console.error(err)
      showToast('فشل في توليد PDF', 'err')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const filtered = items.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  const card: React.CSSProperties = { background: 'rgba(6,182,212,0.03)', borderRadius: 18, border: '1px solid rgba(6,182,212,0.15)', padding: '1.75rem' }
  const inp: React.CSSProperties = { width: '100%', padding: '0.75rem 1rem', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 12, fontSize: '0.92rem', color: '#FFFFFF', outline: 'none', background: 'rgba(6,182,212,0.05)', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '0.45rem' }
  const td: React.CSSProperties = { padding: '1rem', whiteSpace: 'nowrap', verticalAlign: 'middle' }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', color: '#F8FAFC' }}>
      <PrintHeader title="قائمة الجرد والمنتجات" subtitle={`${items.length} منتج مسجل`} />
      {toast && <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: toast.type === 'ok' ? '#06B6D4' : '#EF4444', color: '#fff', padding: '0.7rem 1.6rem', borderRadius: 50, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>{toast.msg}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900 }}>إدارة المنتجات</h1>
          <p style={{ color: '#94A3B8' }}>{items.length} {businessType === 'B2B_WHALE' ? 'منتج مسجل بالعملات المحلية والدولية' : 'المنتجات المسجلة'}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {businessType === 'B2B_WHALE' && (
            <>
              <button
                onClick={sendToWhatsApp}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.2rem', 
                  background: '#22C55E', borderRadius: 12, color: '#fff', fontWeight: 800, 
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem'
                }}
                onMouseEnter={(e)=>e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={(e)=>e.currentTarget.style.transform='translateY(0)'}
              >
                <Send size={18} /> إرسال للتاجر
              </button>

              <button
                onClick={generatePDF}
                disabled={generatingPDF}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.2rem', 
                  background: '#EF4444', borderRadius: 12, color: '#fff', fontWeight: 800, 
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s', opacity: generatingPDF ? 0.7 : 1, fontSize: '0.85rem'
                }}
                onMouseEnter={(e)=>e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={(e)=>e.currentTarget.style.transform='translateY(0)'}
              >
                {generatingPDF ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />} PDF الجملة
              </button>
            </>
          )}

          
          <button 
            onClick={() => window.print()}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.2rem', 
              background: 'rgba(6,182,212,0.1)', borderRadius: 12, color: '#06B6D4', fontWeight: 800, 
              border: '1px solid rgba(6,182,212,0.3)', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem'
            }}
          >
            <Printer size={18} /> طباعة الجرد
          </button>

          <button 
            onClick={openNew} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', 
              background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)', 
              borderRadius: 12, color: '#fff', fontWeight: 800, border: 'none', 
              cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem'
            }}
            onMouseEnter={(e)=>e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={(e)=>e.currentTarget.style.transform='translateY(0)'}
          >
            <Plus size={18} /> إضافة منتج
          </button>
        </div>
      </div>

      <div style={{ ...card, padding: '1rem', marginBottom: '1.5rem' }}><input type="text" placeholder="بحث باسم المنتج..." value={search} onChange={e=>setSearch(e.target.value)} style={inp} /></div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(6,182,212,0.06)', borderBottom: '1px solid rgba(6,182,212,0.15)' }}>
              {['المنتج', 'القسم', 'السعـر (قطاعي)', 'سعر الجملة', 'المخزون', ''].map(h => <th key={h} style={{ padding: '1.2rem 1rem', textAlign: 'right', fontWeight: 800, color: '#94A3B8', fontSize: '0.75rem' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(6,182,212,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Product name + image */}
                <td style={{ ...td, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    {p.imageUrl
                      ? <img src={p.imageUrl} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                      : <Package size={20} style={{ flexShrink: 0, color: '#94A3B8' }} />}
                    <div>
                      <p style={{ fontWeight: 800, margin: 0 }}>{p.name}</p>
                      <p style={{ fontSize: '0.7rem', color: '#64748B', margin: 0 }}>{p.specs}</p>
                    </div>
                  </div>
                </td>
                {/* Category badge */}
                <td style={td}>
                  <span style={{ background: 'rgba(6,182,212,0.1)', color: '#06B6D4', padding: '0.25rem 0.7rem', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700 }}>
                    {p.category}
                  </span>
                </td>
                {/* Retail price */}
                <td style={{ ...td, fontWeight: 800, direction: 'ltr', color: '#F8FAFC' }}>
                  {p.price.toLocaleString('ar-EG')} <span style={{ fontSize: '0.7rem', color: '#64748B' }}>ج.م</span>
                </td>
                {/* Wholesale price */}
                <td style={{ ...td, fontWeight: 900, color: '#06B6D4', direction: 'ltr' }}>
                  {(p.wholesalePriceEGP || 0) > 0
                    ? <>{(p.wholesalePriceEGP || 0).toLocaleString('ar-EG')} <span style={{ fontSize: '0.7rem', color: 'rgba(6,182,212,0.5)' }}>ج.م</span></>
                    : <span style={{ color: '#334155' }}>—</span>}
                </td>
                {/* Stock */}
                <td style={{ ...td, textAlign: 'center' }}>
                  <span style={{
                    background: p.stock > 5 ? 'rgba(34,197,94,0.1)' : p.stock > 0 ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
                    color: p.stock > 5 ? '#22C55E' : p.stock > 0 ? '#EAB308' : '#EF4444',
                    padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.82rem', fontWeight: 800
                  }}>
                    {p.stock}
                  </span>
                </td>
                {/* Actions */}
                <td style={{ ...td, textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button onClick={() => openEdit(p)} style={{ background: 'rgba(6,182,212,0.1)', border: 'none', color: '#06B6D4', padding: '0.4rem 0.6rem', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Pencil size={15} /></button>
                    <button onClick={async () => { if(confirm('متأكد من الحذف؟')) { await fetch('/api/products?id=' + p._id, { method: 'DELETE' }); window.location.reload(); } }} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444', padding: '0.4rem 0.6rem', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {waModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setWaModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{ background: '#0B1120', borderRadius: 28, width: '100%', maxWidth: 450, padding: '2.5rem', border: '1px solid rgba(6,182,212,0.2)', position: 'relative', zIndex: 2 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontWeight: 900, fontSize: '1.5rem', color: '#fff' }}>إرسال لستة الأسعار</h2>
                <button onClick={() => setWaModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 50, padding: '0.4rem', cursor: 'pointer', color: '#fff' }}><X size={20} /></button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={lbl}>رقم الواتساب للتاجر</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    style={{ ...inp, paddingLeft: '3rem', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.1em' }} 
                    placeholder="010xxxxxxxx" 
                    value={waPhone} 
                    onChange={e => setWaPhone(e.target.value)}
                    type="tel"
                    autoFocus
                  />
                  <Send size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#06B6D4', opacity: 0.5 }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.75rem' }}>سيتم إضافة كود الدولة (2+) تلقائياً في حال عدم وجوده.</p>
              </div>

              <button 
                onClick={executeWaSend}
                style={{ width: '100%', background: '#22C55E', color: '#fff', border: 'none', borderRadius: 16, padding: '1.1rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', transition: 'all 0.2s' }}
                onMouseEnter={(e)=>e.currentTarget.style.boxShadow='0 12px 30px rgba(34,197,94,0.3)'}
                onMouseLeave={(e)=>e.currentTarget.style.boxShadow='none'}
              >
                تأكيد وبدء المحادثة <Send size={22} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(8, 12, 20, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(12px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: '#0B1120', borderRadius: 28, width: '100%', maxWidth: 650, padding: '2.5rem', border: '1px solid rgba(6,182,212,0.2)', maxHeight: '92vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}><h2 style={{ fontWeight: 900, fontSize: '1.5rem' }}>{isEditing ? 'تعديل بيانات المنتج' : 'إضافة منتج للسوق'}</h2><button onClick={()=>setModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 50, padding: '0.4rem', cursor: 'pointer' }}><X size={24} /></button></div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div style={{ gridColumn: '1/-1' }}><label style={lbl}>الاسم التجاري *</label><input style={inp} value={form.name} onChange={e=>setForm({...form, name: e.target.value})} /></div>
                
                {/* ── Image Upload Section (Phase 31) ── */}
                <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                   <label style={lbl}>صورة المنتج (ImgBB Cloud Hosting)</label>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(6,182,212,0.05)', padding: '1rem', borderRadius: 16, border: '1px solid rgba(6,182,212,0.15)' }}>
                      <div 
                        onClick={() => fileRef.current?.click()}
                        style={{ 
                          width: 80, height: 80, borderRadius: 12, border: '2px dashed rgba(6,182,212,0.3)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          background: '#0B1120', overflow: 'hidden', position: 'relative'
                        }}
                      >
                         <input 
                           type="file" 
                           ref={fileRef} 
                           hidden 
                           accept="image/*" 
                           onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               setUploading(true);
                               try {
                                 const url = await uploadToImgBB(file);
                                 setForm(prev => ({ ...prev, imageUrl: url }));
                                 showToast('تم رفع الصورة بنجاح', 'ok');
                               } catch {
                                 showToast('فشل رفع الصورة', 'err');
                               } finally {
                                 setUploading(false);
                               }
                             }
                           }} 
                         />
                         {uploading ? (
                           <Loader2 className="animate-spin" size={24} color="#06B6D4" />
                         ) : form.imageUrl ? (
                           <img src={form.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         ) : (
                           <Upload size={24} color="#94A3B8" />
                         )}
                      </div>
                      <div style={{ flex: 1 }}>
                         <button 
                           onClick={() => fileRef.current?.click()}
                           disabled={uploading}
                           style={{ padding: '0.6rem 1.2rem', borderRadius: 10, background: '#06B6D4', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
                         >
                            {form.imageUrl ? 'تغيير الصورة' : 'رفع صورة المنتج'}
                         </button>
                         <p style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.5rem' }}>ImgBB سيتم استضافة الصورة سحابياً عبر</p>
                      </div>
                   </div>
                </div>
                
                {/* ── Wholesale Engine ─────────────────────────────────── */}
                {businessType === 'B2B_WHALE' && (
                  <div style={{ gridColumn: '1/-1', background: 'rgba(6,182,212,0.05)', padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(6,182,212,0.15)' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 800, color: '#06B6D4', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem' }}>محرك تسعير الجملة</p>
                    <p style={{ fontSize: '0.73rem', color: '#64748B', marginBottom: '1rem' }}>التكلفة الفعلية تُزامن تلقائياً من الشحنة (شاملة جميع المصاريف).</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '1rem', alignItems: 'flex-end' }}>

                      {/* Margin */}
                      <div>
                        <label style={lbl}><Percent size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> هامش الجملة %</label>
                        <input
                          style={{ ...inp, direction: 'ltr' }}
                          value={form.wholesaleMargin}
                          onChange={e => setForm({ ...form, wholesaleMargin: e.target.value })}
                          placeholder="0"
                          type="number"
                          step="0.1"
                        />
                      </div>

                      {/* True Landed Cost (Phase 10.A.9) */}
                      <div>
                        <label style={lbl}>
                          التكلفة الفعلية المحلية (ج.م)
                          {dbSyncedLandedCost > 0
                            ? <span style={{ color: '#22C55E', fontWeight: 700, marginRight: 4 }}>✓ مُزامن من الشحنة</span>
                            : <span style={{ color: 'rgba(6,182,212,0.5)', fontWeight: 400, marginRight: 4 }}>تقديري (بدون مصاريف)</span>}
                        </label>
                        <input
                          readOnly
                          style={{ ...inp, background: dbSyncedLandedCost > 0 ? 'rgba(34,197,94,0.05)' : 'rgba(0,0,0,0.2)', color: dbSyncedLandedCost > 0 ? '#22C55E' : '#94A3B8', cursor: 'not-allowed', border: dbSyncedLandedCost > 0 ? '1px solid rgba(34,197,94,0.3)' : undefined }}
                          value={liveLocalCost > 0 ? liveLocalCost.toFixed(2) : ''}
                          placeholder="يُحسب عند استلام الشحنة"
                        />
                      </div>

                      {/* Live wholesale EGP */}
                      <div style={{ textAlign: 'center', background: 'rgba(6,182,212,0.05)', borderRadius: 12, padding: '0.75rem', border: '1px solid rgba(6,182,212,0.1)' }}>
                        <span style={{ fontSize: '0.65rem', color: '#06B6D4', fontWeight: 800, display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>سعر الجملة EGP</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFFFFF' }}>{liveWholesale > 0 ? liveWholesale.toLocaleString('ar-EG', { maximumFractionDigits: 2 }) : '—'}</span>
                      </div>

                    </div>
                  </div>
                )}

                <div><label style={lbl}>سعر البيع للمستهلك (ج.م)</label><input style={inp} value={form.price || ''} onChange={e=>setForm({...form, price: e.target.value})} type="number" step="0.01" /></div>
                
                <div>
                  <label style={lbl}>قيمة الضريبة</label>
                  <div style={{ display: 'flex', background: '#0B1120', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 12, overflow: 'hidden' }}>
                    <select 
                      style={{ ...inp, border: 'none', background: 'rgba(6,182,212,0.1)', borderRadius: 0, width: '40%', borderRight: '1px solid rgba(6,182,212,0.15)', fontWeight: 800, color: '#06B6D4' }}
                      value={form.taxType} 
                      onChange={e => setForm({...form, taxType: e.target.value as 'PERCENTAGE' | 'FIXED'})}
                    >
                      <option value="PERCENTAGE">نسبة (%)</option>
                      <option value="FIXED">مبلغ ثابت (ج.م)</option>
                    </select>
                    <input 
                      style={{ ...inp, border: 'none', borderRadius: 0, width: '60%', direction: 'ltr' }} 
                      value={form.taxValue} 
                      onChange={e => setForm({...form, taxValue: e.target.value})} 
                      type="number" 
                      placeholder="0" 
                    />
                  </div>
                </div>

                <div><label style={lbl}>المخزون المتوفر</label><input style={inp} value={form.stock} onChange={e=>setForm({...form, stock: e.target.value})} type="number" /></div>
                <div><label style={lbl}>القسم</label><select style={{...inp, background: '#0B1120', appearance: 'none'}} value={form.categoryId} onChange={e=>setForm({...form, categoryId: e.target.value, category: e.target.options[e.target.selectedIndex].text})}><option value="">-- اختر القسم --</option>{dbCategories.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
                <div><label style={lbl}>الفرع / المستودع / العهدة</label><select style={{...inp, background: '#0B1120', appearance: 'none'}} value={form.branchId} onChange={e=>setForm({...form, branchId: e.target.value})}><option value="">-- بدون تخصيص --</option>{dbBranches.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}</select></div>
                
                {/* ── Condition & Description ── */}
                <div>
                  <label style={lbl}>حالة المنتج</label>
                  <select 
                    style={{...inp, background: '#0B1120', appearance: 'none'}} 
                    value={form.condition || 'new'} 
                    onChange={e=>setForm({...form, condition: e.target.value})}
                  >
                    <option value="new">جديد (New)</option>
                    <option value="used">مستعمل (Used)</option>
                  </select>
                </div>
                
                {/* ── Hybrid Inventory Toggle ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', gridColumn: '1/-1', background: 'rgba(168,85,247,0.05)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(168,85,247,0.15)' }}>
                  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                    <input 
                      type="checkbox" 
                      style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                      checked={form.isSerialized}
                      onChange={e => setForm({...form, isSerialized: e.target.checked})}
                    />
                    <span style={{ 
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                      backgroundColor: form.isSerialized ? '#06B6D4' : 'rgba(255,255,255,0.1)', 
                      transition: '.3s', borderRadius: '24px' 
                    }}>
                      <span style={{ 
                        position: 'absolute', height: '16px', width: '16px', 
                        left: form.isSerialized ? '24px' : '4px', bottom: '4px', 
                        backgroundColor: 'white', transition: '.3s', borderRadius: '50%' 
                      }} />
                    </span>
                  </label>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: form.isSerialized ? '#06B6D4' : '#A855F7', display: 'block' }}>
                      تتبع بالأرقام التسلسلية (Has Serial Numbers / IMEI) 
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>قم بإيقاف هذا الخيار للمنتجات التي تُباع بالكمية المستمرة كالإكسسوارات</span>
                  </div>
                </div>
                
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>الوصف والملاحظات</label>
                  <textarea 
                    style={{ ...inp, height: 100, resize: 'vertical', background: '#0B1120' }} 
                    placeholder="مثال: نسخة شرق أوسط شريحتين، أو مستعمل بطارية 90% بدون علبة..."
                    value={form.description || ''}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              
              <button onClick={handleSave} disabled={saving} style={{ width: '100%', background: '#06B6D4', color: '#fff', border: 'none', borderRadius: 16, padding: '1.1rem', fontWeight: 900, marginTop: '2rem', cursor: 'pointer' }}>{saving ? <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} /> : 'تأكيد وحفظ المنتج'}</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } } 
        .animate-spin { animation: spin 1s linear infinite }
        @media print {
          body { background: #fff !important; color: #000 !important; }
          th, td { border: 1px solid #ccc !important; color: #000 !important; background: transparent !important; padding: 6px 8px !important; }
          thead tr { background: #eee !important; }
          th:last-child, td:last-child { display: none; } /* Hide actions column */
        }
      `}</style>
      {/* ── Hidden PDF Template (for Snapshot) ── */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div 
          ref={pdfTemplateRef}
          style={{ 
            width: '210mm', // A4 Width
            padding: '20mm',
            background: '#FFFFFF',
            color: '#1E293B',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            direction: 'rtl',
            textAlign: 'right'
          }}
        >
          {/* PDF Branding */}
          <div style={{ textAlign: 'center', borderBottom: '4px solid #06B6D4', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <img src="/assets/logo.png" alt="FREE ZONE" style={{ height: '80px', marginBottom: '1rem', objectFit: 'contain' }} />
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#06B6D4' }}>قائمة أسعار الجملة المعتمدة</p>
            <p style={{ fontSize: '1rem', color: '#64748B', marginTop: '0.5rem' }}>
               بتاريخ: {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #0F172A' }}>
                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 900, fontSize: '1.1rem' }}>المنتج</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>الحالة</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>سعر الجملة</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>الضريبة</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p, i) => (
                <tr key={p._id} style={{ borderBottom: '1px solid #E2E8F0', background: i % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                  <td style={{ padding: '1.25rem 1rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>{p.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.2rem' }}>{p.description || p.specs || '-'}</div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 700, color: p.condition === 'used' ? '#F59E0B' : '#10B981' }}>
                    {p.condition === 'used' ? 'مستعمل' : 'جديد'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, fontSize: '1.15rem', color: '#06B6D4' }}>
                    {(p.wholesalePriceEGP || 0).toLocaleString('ar-EG')} ج.م
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: '#64748B', fontSize: '0.9rem' }}>
                    {(p.taxPercentage || 0) === 0 ? '(معفي)' : `${(p.taxAmountEGP || 0).toLocaleString('ar-EG')} م`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '3rem', textAlign: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '1.5rem' }}>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>فري زون للإستيراد - السراج مول، مكرم عبيد، مدينة نصر - القاهرة - الأسعار قابلة للتغيير دون إشعار مسبق</p>
          </div>
        </div>
      </div>
    </div>
  )
}

