'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
import Link from 'next/link'
import { ChevronRight, X, Upload, Loader2, CheckCircle } from 'lucide-react'
import { getWhatsAppURL } from '@/lib/whatsapp'

const IMGBB_KEY = '1705736b8f2b46dcbaeec8a6025aca83'

type Product = {
  _id: string
  name: string
  price: number
  stock: number
  condition?: string
  specs?: string
  imageUrl?: string
  badge?: string
  description?: string
  taxType?: 'PERCENTAGE' | 'FIXED'
  taxValue?: number
  taxAmountEGP?: number
  taxPercentage?: number
}

type Category = {
  name: string
  description?: string
  icon: string
}

function getIcon(iconName: string) {
  const Icon = (LucideIcons as any)[iconName] || LucideIcons.Package
  return Icon
}

function TaxDisplay({ p }: { p: Product }) {
  const taxVal = p.taxValue ?? p.taxAmountEGP ?? 0
  const taxAmt = p.taxType === 'PERCENTAGE'
    ? (p.price * (taxVal / 100))
    : taxVal

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#06B6D4', direction: 'ltr' }}>
        <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, marginLeft: '0.35rem' }}>السعر:</span>
        {p.price.toLocaleString('ar-EG')}
        <span style={{ fontSize: '0.72rem', color: '#94A3B8', marginRight: '0.2rem' }}> ج.م</span>
      </span>
      <span style={{ fontSize: '0.88rem', fontWeight: 700, direction: 'ltr' }}>
        <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginLeft: '0.35rem' }}>الضريبة:</span>
        {taxVal === 0 || !taxVal
          ? <span style={{ color: '#22C55E', fontWeight: 800 }}>بدون</span>
          : <span style={{ color: '#F59E0B' }}>{taxAmt.toLocaleString('ar-EG', { maximumFractionDigits: 0 })} ج.م</span>
        }
      </span>
    </div>
  )
}

export function CategoryClient({ category, products, settings }: { category: Category, products: Product[], settings: any }) {
  const [filter, setFilter] = useState<'All' | 'New' | 'Used'>('All')
  const [landingData, setLandingData] = useState<any>(null)
  const [reserveProduct, setReserveProduct] = useState<Product | null>(null)
  const [reserveForm, setReserveForm] = useState({ customerName: '', phone: '' })
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const receiptRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/landing-page')
      .then(res => res.json())
      .then(setLandingData)
      .catch(console.error)
  }, [])

  // Smart Routing Logic
  const mainNum  = settings?.whatsappNumber || landingData?.contact?.whatsapp || '01129592916'
  const salesNum = settings?.salesWhatsapp || mainNum

  const paymentMethods = landingData?.contact?.paymentMethods || 'فودافون كاش / إنستا باي'
  const paymentNumber  = landingData?.contact?.paymentNumber  || mainNum

  const filteredProducts = products.filter(p => {
    if (filter === 'All') return true
    const cond = (p.condition || 'new').toLowerCase()
    return cond === filter.toLowerCase()
  })

  const Icon = getIcon(category.icon)

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  function openReserve(p: Product) {
    setReserveProduct(p)
    setReserveForm({ customerName: '', phone: '' })
    setReceiptFile(null)
    setReceiptPreview('')
    setSuccess(false)
  }

  function handleReceiptSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    setReceiptPreview(URL.createObjectURL(file))
  }

  async function uploadToImgBB(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('image', file)
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd })
    const data = await res.json()
    if (!data.success) throw new Error('فشل رفع صورة الإيصال')
    return data.data.display_url
  }

  async function handleSubmitReservation() {
    if (!reserveForm.customerName.trim()) return showToast('يرجى إدخال الاسم', 'err')
    if (!reserveForm.phone.trim()) return showToast('يرجى إدخال رقم الهاتف', 'err')
    if (!receiptFile) return showToast('يرجى إرفاق صورة إيصال التحويل (مطلوبة)', 'err')

    setSaving(true)
    try {
      setUploading(true)
      const receiptImageUrl = await uploadToImgBB(receiptFile)
      setUploading(false)

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: reserveProduct!._id,
          productName: reserveProduct!.name,
          customerName: reserveForm.customerName.trim(),
          phone: reserveForm.phone.trim(),
          receiptImageUrl
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      
      // WhatsApp Routing (Sales)
      const waMsg = `مرحباً، حجزت جهاز ${reserveProduct!.name} وأرفقت إيصال العربون.\nالاسم: ${reserveForm.customerName}`
      window.open(getWhatsAppURL(salesNum, waMsg), '_blank')
      
      setSuccess(true)
    } catch (err: any) {
      setUploading(false)
      showToast(err.message || 'فشل تأكيد الحجز', 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0a0a0a', paddingBottom: '4rem' }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            style={{
              position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
              zIndex: 9999, background: toast.type === 'ok' ? '#22C55E' : '#EF4444',
              color: '#fff', padding: '0.8rem 2rem', borderRadius: 50,
              fontWeight: 800, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', whiteSpace: 'nowrap'
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header style={{ padding: '3rem 2rem 2rem', background: '#111111', borderBottom: '1px solid rgba(29,29,31,0.07)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#0ea5e9', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1.5rem', background: 'rgba(14,165,233,0.1)', padding: '0.4rem 0.8rem', borderRadius: 50 }}>
            <ChevronRight size={16} /> العودة للرئيسية
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={32} color="#0ea5e9" strokeWidth={1.8} />
            </div>
            <div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#FFFFFF', marginBottom: '0.2rem' }}>{category.name}</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>{category.description || `تصفح جميع الهواتف والمعدات المرتبطة بقسم ${category.name}`}</p>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>
        {/* ── Filter Tabs ── */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
          {(['All', 'New', 'Used'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                background: filter === tab ? 'rgba(14,165,233,0.15)' : 'transparent',
                border: filter === tab ? '1px solid rgba(14,165,233,0.3)' : '1px solid transparent',
                color: filter === tab ? '#0ea5e9' : 'rgba(255,255,255,0.6)',
                fontWeight: 700, padding: '0.6rem 1.4rem', borderRadius: 50,
                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit', fontSize: '0.95rem'
              }}
            >
              {tab === 'All' ? 'الكل' : tab === 'New' ? 'جديد (New)' : 'مستعمل (Used)'}
            </button>
          ))}
        </div>

        {/* ── Product Grid ── */}
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>لا توجد منتجات في هذه الفئة حالياً</p>
          </div>
        ) : (
          <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
            <AnimatePresence>
              {filteredProducts.map((p) => (
                <motion.div
                  key={p._id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.25 }}
                  style={{ background: '#111111', border: '1px solid rgba(29,29,31,0.07)', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
                >
                  {/* Product image / icon area */}
                  <div style={{ background: 'linear-gradient(135deg, #082f49 0%, #0c4a6e 100%)', minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative' }}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain', borderRadius: 8 }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(14,165,233,0.12)', border: '1.5px solid rgba(14,165,233,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={30} color="#0ea5e9" strokeWidth={1.6} />
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: '0.4rem', flexDirection: 'column', alignItems: 'flex-end' }}>
                      {(p.condition?.toLowerCase() === 'used') && (
                        <span style={{
                          background: 'rgba(255,255,255,0.05)',
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: 50,
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          مستعمل
                        </span>
                      )}
                      {p.badge && (
                        <span style={{ background: 'rgba(14,165,233,0.15)', color: '#38bdf8', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: 50, border: '1px solid rgba(56,189,248,0.2)' }}>
                          {p.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product info */}
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.3 }}>{p.name}</h3>
                    {/* Phase 81: Clean specs display — hide internal system notes */}
                    {(() => {
                      const isSystemNote = p.description?.startsWith('تم إنشاؤه تلقائياً')
                      const hasSpecs = p.color || p.storage || p.batteryHealth
                      if (hasSpecs) return (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {p.color && <span style={{ fontSize: '0.7rem', background: 'rgba(168,85,247,0.12)', color: '#C084FC', border: '1px solid rgba(168,85,247,0.2)', padding: '0.15rem 0.55rem', borderRadius: 50 }}>🎨 {p.color}</span>}
                          {p.storage && <span style={{ fontSize: '0.7rem', background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.2)', padding: '0.15rem 0.55rem', borderRadius: 50 }}>💾 {p.storage}</span>}
                          {p.batteryHealth && <span style={{ fontSize: '0.7rem', background: 'rgba(251,146,60,0.12)', color: '#FB923C', border: '1px solid rgba(251,146,60,0.2)', padding: '0.15rem 0.55rem', borderRadius: 50 }}>🔋 {p.batteryHealth}</span>}
                        </div>
                      )
                      if (!isSystemNote && p.description) return (
                        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{p.description}</p>
                      )
                      return null
                    })()}
                    <div style={{ flex: 1 }} />

                    {/* Dynamic Stock Indicator */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.4rem' }}>
                      <TaxDisplay p={p} />
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 800,
                        color: p.stock > 0 ? '#22c55e' : '#ef4444',
                        background: p.stock > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                        padding: '0.35rem 1rem', borderRadius: 50, alignSelf: 'flex-start',
                        border: `1px solid ${p.stock > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                      }}>
                        {p.stock > 0 ? 'متوفرة الآن ✓' : 'غير متوفرة حالياً'}
                      </span>
                    </div>

                    {/* CTA Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {/* Reserve Now — Deposit First */}
                      <button
                        onClick={() => p.stock > 0 && openReserve(p)}
                        disabled={p.stock <= 0}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: '0.4rem', padding: '0.65rem', 
                          background: p.stock > 0 ? 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)' : 'rgba(255,255,255,0.05)',
                          borderRadius: 10, color: p.stock > 0 ? '#fff' : '#475569', 
                          fontWeight: 800, fontSize: '0.82rem',
                          border: 'none', cursor: p.stock > 0 ? 'pointer' : 'not-allowed', 
                          transition: 'all 0.2s', fontFamily: 'inherit',
                          filter: p.stock > 0 ? 'none' : 'grayscale(1)',
                          boxShadow: p.stock > 0 ? '0 4px 16px rgba(6,182,212,0.2)' : 'none'
                        }}
                        onMouseEnter={e => p.stock > 0 && (e.currentTarget.style.boxShadow = '0 8px 24px rgba(6,182,212,0.4)')}
                        onMouseLeave={e => p.stock > 0 && (e.currentTarget.style.boxShadow = '0 4px 16px rgba(6,182,212,0.2)')}
                      >
                        {p.stock > 0 ? 'احجز الآن 🔒' : 'غير متوفر'}
                      </button>
                      {/* WhatsApp inquiry */}
                      <a
                        href={getWhatsAppURL(salesNum, `أريد الاستفسار عن: ${p.name}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: p.stock > 0 ? '0 0 auto' : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '0.65rem', background: 'rgba(255,255,255,0.06)',
                          borderRadius: 10, color: '#94A3B8', fontWeight: 700,
                          fontSize: '0.82rem', textDecoration: 'none', transition: 'background 0.2s',
                          border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'inherit'
                        }}
                        onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.1)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)')}
                      >
                        استفسار
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* ── Deposit-First Reservation Modal ── */}
      <AnimatePresence>
        {reserveProduct && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReserveProduct(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              style={{
                position: 'relative', zIndex: 2, background: '#0B1120',
                borderRadius: 28, width: '100%', maxWidth: 480,
                border: '1px solid rgba(6,182,212,0.25)',
                boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
                maxHeight: '90vh', overflowY: 'auto'
              }}
            >
              {/* Modal header */}
              <div style={{ padding: '2rem 2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.15em', color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.3rem' }}>نظام الحجز المسبق</p>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>احجز الآن 🔒</h2>
                  <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.25rem' }}>{reserveProduct.name}</p>
                </div>
                <button
                  onClick={() => setReserveProduct(null)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 50, padding: '0.5rem', cursor: 'pointer', color: '#94A3B8' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '1.75rem 2rem' }}>
                {success ? (
                  /* ── Success State ── */
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: 'center', padding: '2rem 0' }}
                  >
                    <CheckCircle size={64} color="#22C55E" style={{ margin: '0 auto 1.5rem' }} />
                    <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem' }}>تم استلام طلب الحجز!</h3>
                    <p style={{ color: '#94A3B8', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                      سيتم التحقق من إيصال التحويل والتواصل معك على رقم <strong style={{ color: '#06B6D4' }}>{reserveForm.phone}</strong> لتأكيد الحجز.
                    </p>
                    <button
                      onClick={() => setReserveProduct(null)}
                      style={{ background: '#06B6D4', color: '#fff', border: 'none', borderRadius: 14, padding: '0.9rem 2rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      العودة للتصفح
                    </button>
                  </motion.div>
                ) : (
                  <>
                    {/* ── Payment Instruction Banner ── */}
                    <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 16, padding: '1.25rem 1.5rem', marginBottom: '1.75rem' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#06B6D4', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>للحجز — أرسل العربون على:</p>
                      <p style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff', marginBottom: '0.25rem' }}>{paymentMethods}</p>
                      <p style={{ fontSize: '1.35rem', fontWeight: 900, color: '#06B6D4', letterSpacing: '0.08em' }}>{paymentNumber}</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.5rem' }}>بعد التحويل، ارفع صورة الإيصال أدناه وأكمل بياناتك لتأكيد الحجز.</p>
                    </div>

                    {/* ── Customer Name ── */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#94A3B8', marginBottom: '0.5rem' }}>الاسم بالكامل *</label>
                      <input
                        value={reserveForm.customerName}
                        onChange={e => setReserveForm(f => ({ ...f, customerName: e.target.value }))}
                        placeholder="مثال: أحمد محمد علي"
                        style={{ width: '100%', background: '#111827', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12, padding: '0.9rem 1rem', color: '#fff', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* ── Phone ── */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#94A3B8', marginBottom: '0.5rem' }}>رقم الهاتف *</label>
                      <input
                        value={reserveForm.phone}
                        onChange={e => setReserveForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="010xxxxxxxx"
                        type="tel"
                        dir="ltr"
                        style={{ width: '100%', background: '#111827', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12, padding: '0.9rem 1rem', color: '#fff', outline: 'none', fontSize: '1rem', fontFamily: 'inherit', letterSpacing: '0.08em', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* ── Receipt Upload ── */}
                    <div style={{ marginBottom: '1.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#94A3B8', marginBottom: '0.5rem' }}>
                        صورة إيصال التحويل <span style={{ color: '#EF4444' }}>* (مطلوبة)</span>
                      </label>
                      <input ref={receiptRef} type="file" accept="image/*" onChange={handleReceiptSelect} style={{ display: 'none' }} />

                      {receiptPreview ? (
                        <div style={{ position: 'relative' }}>
                          <img
                            src={receiptPreview}
                            alt="Receipt preview"
                            style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 14, border: '2px solid rgba(6,182,212,0.3)' }}
                          />
                          <button
                            onClick={() => { setReceiptFile(null); setReceiptPreview('') }}
                            style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 50, padding: '0.3rem', cursor: 'pointer', color: '#fff' }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => receiptRef.current?.click()}
                          style={{
                            width: '100%', padding: '2rem', background: 'rgba(6,182,212,0.03)',
                            border: '2px dashed rgba(6,182,212,0.3)', borderRadius: 14,
                            color: '#06B6D4', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s', fontFamily: 'inherit'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(6,182,212,0.06)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(6,182,212,0.03)')}
                        >
                          <Upload size={32} />
                          <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>اضغط لاختيار صورة الإيصال</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>JPG, PNG حتى 10MB</span>
                        </button>
                      )}
                    </div>

                    {/* ── Submit ── */}
                    <button
                      onClick={handleSubmitReservation}
                      disabled={saving}
                      style={{
                        width: '100%', padding: '1.25rem',
                        background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                        border: 'none', borderRadius: 16, color: '#fff', fontWeight: 900,
                        fontSize: '1.1rem', cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1, display: 'flex', justifyContent: 'center',
                        alignItems: 'center', gap: '0.6rem', fontFamily: 'inherit',
                        boxShadow: '0 8px 32px rgba(6,182,212,0.3)', transition: 'all 0.2s'
                      }}
                    >
                      {saving ? (
                        <>{uploading ? 'جاري رفع الإيصال...' : 'جاري التأكيد...'} <Loader2 className="animate-spin" size={20} /></>
                      ) : (
                        'تأكيد الحجز ←'
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
