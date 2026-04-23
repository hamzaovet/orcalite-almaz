'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Inbox, RefreshCw, Loader2, Eye, X, CheckCircle, XCircle, DollarSign, MessageCircle, Trash2, Camera } from 'lucide-react'

type Offer = {
  _id: string
  deviceModel: string
  storage: string
  condition: 'Kaser Zero' | 'Scratched' | 'Needs Repair'
  customerName: string
  whatsapp: string
  photos: string[]
  status: 'New' | 'Priced' | 'Rejected' | 'Purchased'
  offeredPrice?: number
  notes?: string
  createdAt: string
}

const STATUS_CONFIG: Record<Offer['status'], { label: string; color: string; bg: string; border: string }> = {
  'New':       { label: 'جديد',     color: '#06B6D4', bg: 'rgba(6,182,212,0.1)',    border: 'rgba(6,182,212,0.3)' },
  'Priced':    { label: 'تم التسعير', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)' },
  'Rejected':  { label: 'مرفوض',    color: '#EF4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)' },
  'Purchased': { label: 'تم الشراء',  color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)' },
}

const CONDITION_LABELS: Record<string, string> = {
  'Kaser Zero': '✨ كيسر زيرو',
  'Scratched':  '🔅 خدوش بسيطة',
  'Needs Repair': '🔧 يحتاج إصلاح'
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  const [viewPhoto, setViewPhoto] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/offers')
      const data = await res.json()
      setOffers(data.offers ?? [])
    } catch { showToast('فشل تحميل البيانات', 'err') }
    finally { setLoading(false) }
  }

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function openOffer(offer: Offer) {
    setSelectedOffer(offer)
    setPriceInput(offer.offeredPrice ? String(offer.offeredPrice) : '')
    setNotesInput(offer.notes || '')
  }

  async function updateOffer(id: string, patch: any) {
    setSaving(true)
    try {
      const res = await fetch(`/api/offers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setOffers(prev => prev.map(o => o._id === id ? { ...o, ...patch } : o))
      if (selectedOffer?._id === id) setSelectedOffer(prev => prev ? { ...prev, ...patch } : prev)
      showToast('تم التحديث بنجاح', 'ok')
    } catch (err: any) {
      showToast(err.message, 'err')
    } finally { setSaving(false) }
  }

  async function deleteOffer(id: string) {
    if (!confirm('هل تريد حذف هذا العرض نهائياً؟')) return
    try {
      await fetch(`/api/offers/${id}`, { method: 'DELETE' })
      setOffers(prev => prev.filter(o => o._id !== id))
      if (selectedOffer?._id === id) setSelectedOffer(null)
      showToast('تم الحذف', 'ok')
    } catch { showToast('فشل الحذف', 'err') }
  }

  const filteredOffers = filterStatus === 'all' ? offers : offers.filter(o => o.status === filterStatus)
  const counts = { all: offers.length, New: 0, Priced: 0, Rejected: 0, Purchased: 0 }
  offers.forEach(o => counts[o.status]++)

  const inp: React.CSSProperties = { width: '100%', background: '#F8FAFC', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12, padding: '0.75rem 1rem', color: '#0F172A', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.5rem' }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', color: '#1E293B' }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.type === 'ok' ? '#22C55E' : '#EF4444', color: '#0F172A', padding: '0.75rem 2rem', borderRadius: 50, fontWeight: 800, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.15em', color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.4rem' }}>بوابة الشراء C2B</p>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Inbox color="#06B6D4" size={32} /> عروض الشراء
          </h1>
          <p style={{ color: '#475569', marginTop: '0.25rem' }}>عروض شراء أجهزة العملاء المستعملة</p>
        </div>
        <button onClick={load} style={{ background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: 12, padding: '0.75rem 1.25rem', fontWeight: 700, cursor: 'pointer' }}>
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: `الكل (${counts.all})`, color: '#475569' },
          { key: 'New', label: `جديد (${counts.New})`, color: '#06B6D4' },
          { key: 'Priced', label: `تم التسعير (${counts.Priced})`, color: '#F59E0B' },
          { key: 'Rejected', label: `مرفوض (${counts.Rejected})`, color: '#EF4444' },
          { key: 'Purchased', label: `تم الشراء (${counts.Purchased})`, color: '#22C55E' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            style={{
              padding: '0.6rem 1.2rem', borderRadius: 50, cursor: 'pointer', fontWeight: 700,
              fontFamily: 'inherit', fontSize: '0.88rem', transition: 'all 0.2s',
              background: filterStatus === tab.key ? `${tab.color}18` : 'transparent',
              border: `1px solid ${filterStatus === tab.key ? tab.color : '#F1F5F9'}`,
              color: filterStatus === tab.key ? tab.color : '#64748B'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
          <Loader2 size={48} className="animate-spin" color="#06B6D4" />
        </div>
      ) : filteredOffers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '6rem 2rem', background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 24 }}>
          <Inbox size={64} color="rgba(6,182,212,0.2)" style={{ margin: '0 auto 1.5rem' }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>لا توجد عروض بعد</h3>
          <p style={{ color: '#475569' }}>ستظهر هنا عروض العملاء لبيع أجهزتهم فور وصولها</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredOffers.map((offer) => {
            const cfg = STATUS_CONFIG[offer.status]
            return (
              <motion.div
                key={offer._id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: '#F8FAFC', borderRadius: 20, border: `1px solid ${cfg.border}`,
                  overflow: 'hidden', boxShadow: `0 8px 32px ${cfg.bg}`,
                  transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 20px 40px ${cfg.bg}` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 32px ${cfg.bg}` }}
                onClick={() => openOffer(offer)}
              >
                {/* Photo Strip */}
                {offer.photos.length > 0 && (
                  <div style={{ display: 'flex', height: 120, overflow: 'hidden' }}>
                    {offer.photos.slice(0, 3).map((url, i) => (
                      <img key={i} src={url} alt="" style={{ flex: 1, objectFit: 'cover', borderLeft: i > 0 ? '2px solid #0B1120' : 'none' }} />
                    ))}
                  </div>
                )}

                <div style={{ padding: '1.25rem' }}>
                  {/* Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 800 }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#475569' }}>
                      {new Date(offer.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', marginBottom: '0.3rem' }}>{offer.deviceModel}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <span style={{ background: '#F8FAFC', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: 8, fontSize: '0.78rem' }}>{offer.storage}</span>
                    <span style={{ background: '#F8FAFC', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: 8, fontSize: '0.78rem' }}>{CONDITION_LABELS[offer.condition]}</span>
                  </div>

                  <div style={{ color: '#475569', fontSize: '0.85rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <MessageCircle size={14} />
                    <strong style={{ color: '#0F172A' }}>{offer.customerName}</strong>
                    <span>— {offer.whatsapp}</span>
                  </div>

                  {offer.offeredPrice && (
                    <div style={{ marginTop: '0.75rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '0.5rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <DollarSign size={14} color="#22C55E" />
                      <span style={{ color: '#22C55E', fontWeight: 900, fontSize: '0.95rem' }}>
                        {offer.offeredPrice.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Offer Detail Modal ── */}
      <AnimatePresence>
        {selectedOffer && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedOffer(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              style={{ position: 'relative', zIndex: 2, background: '#F8FAFC', borderRadius: 28, width: '100%', maxWidth: 560, border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 40px 100px rgba(0,0,0,0.6)', maxHeight: '92vh', overflowY: 'auto' }}
            >
              {/* Modal Header */}
              <div style={{ padding: '2rem 2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.3rem' }}>تفاصيل العرض</p>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A' }}>{selectedOffer.deviceModel}</h2>
                  <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.2rem' }}>{selectedOffer.storage} · {CONDITION_LABELS[selectedOffer.condition]}</p>
                </div>
                <button onClick={() => setSelectedOffer(null)} style={{ background: '#F8FAFC', border: 'none', borderRadius: 50, padding: '0.5rem', cursor: 'pointer', color: '#475569' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Photos */}
                {selectedOffer.photos.length > 0 && (
                  <div>
                    <label style={lbl}><Camera size={13} style={{ display: 'inline', marginLeft: 4 }} />صور الجهاز</label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {selectedOffer.photos.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Photo ${i + 1}`}
                          onClick={() => setViewPhoto(url)}
                          style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 14, cursor: 'zoom-in', border: '2px solid rgba(6,182,212,0.15)', transition: 'transform 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Customer Info */}
                <div style={{ background: '#F1F5F9', borderRadius: 14, padding: '1rem 1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#475569', fontSize: '0.85rem' }}>الاسم</span>
                    <strong style={{ color: '#0F172A' }}>{selectedOffer.customerName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569', fontSize: '0.85rem' }}>واتساب</span>
                    <a href={`https://wa.me/2${selectedOffer.whatsapp}`} target="_blank" rel="noreferrer" style={{ color: '#22C55E', fontWeight: 800, textDecoration: 'none' }}>
                      {selectedOffer.whatsapp}
                    </a>
                  </div>
                </div>

                {/* Status Selector */}
                <div>
                  <label style={lbl}>تحديث الحالة</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(['New', 'Priced', 'Rejected', 'Purchased'] as const).map(s => {
                      const c = STATUS_CONFIG[s]
                      const isActive = selectedOffer.status === s
                      return (
                        <button
                          key={s}
                          onClick={() => updateOffer(selectedOffer._id, { status: s })}
                          style={{
                            padding: '0.5rem 1rem', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.85rem', transition: 'all 0.2s',
                            background: isActive ? c.bg : 'transparent',
                            border: `1px solid ${isActive ? c.color : '#F1F5F9'}`,
                            color: isActive ? c.color : '#64748B'
                          }}
                        >
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Offered Price */}
                <div>
                  <label style={lbl}>سعر العرض (ج.م)</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="number"
                      value={priceInput}
                      onChange={e => setPriceInput(e.target.value)}
                      placeholder="0"
                      style={{ ...inp, flex: 1 }}
                    />
                    <button
                      onClick={() => updateOffer(selectedOffer._id, { offeredPrice: Number(priceInput), status: 'Priced' })}
                      disabled={saving || !priceInput}
                      style={{ padding: '0.75rem 1.25rem', background: '#F59E0B', border: 'none', borderRadius: 12, color: '#0F172A', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      تأكيد السعر
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={lbl}>ملاحظات داخلية</label>
                  <textarea
                    value={notesInput}
                    onChange={e => setNotesInput(e.target.value)}
                    rows={3}
                    style={{ ...inp, resize: 'vertical', background: '#111827' }}
                    placeholder="أي ملاحظات عن الجهاز..."
                  />
                  <button
                    onClick={() => updateOffer(selectedOffer._id, { notes: notesInput })}
                    style={{ marginTop: '0.5rem', padding: '0.6rem 1.25rem', background: '#ECFEFF', border: '1px solid #CBD5E1', borderRadius: 10, color: '#06B6D4', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    حفظ الملاحظات
                  </button>
                </div>

                {/* Action Row */}
                <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <a
                    href={`https://wa.me/2${selectedOffer.whatsapp}?text=${encodeURIComponent(`مرحباً ${selectedOffer.customerName}، بخصوص عرض جهازك ${selectedOffer.deviceModel}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.9rem', background: '#22C55E', borderRadius: 14, color: '#0F172A', fontWeight: 800, textDecoration: 'none', fontSize: '0.9rem' }}
                  >
                    <MessageCircle size={18} /> تواصل عبر واتساب
                  </a>
                  <button
                    onClick={() => deleteOffer(selectedOffer._id)}
                    style={{ padding: '0.9rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, color: '#EF4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Full Screen Photo Viewer ── */}
      <AnimatePresence>
        {viewPhoto && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewPhoto(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.95)' }} />
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={viewPhoto}
              style={{ position: 'relative', zIndex: 2, maxWidth: '90vw', maxHeight: '90vh', borderRadius: 20, objectFit: 'contain' }}
            />
            <button onClick={() => setViewPhoto(null)} style={{ position: 'absolute', top: 24, left: 24, zIndex: 3, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 50, padding: '0.75rem', cursor: 'pointer', color: '#0F172A' }}>
              <X size={24} />
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
