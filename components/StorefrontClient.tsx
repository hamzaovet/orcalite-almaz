'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, X, Upload, Loader2, CheckCircle, Sparkles, Smartphone, Wrench } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import Link from 'next/link'
import { getWhatsAppURL } from '@/lib/whatsapp'

const IMGBB_KEY = '1705736b8f2b46dcbaeec8a6025aca83'

type Product = {
  _id: string
  productId?: string
  name: string
  price: number
  stock: number
  condition?: string
  specs?: string
  imageUrl?: string
  badge?: string
  description?: string
  taxPercentage?: number
  taxAmountEGP?: number
  // Per-unit DNA fields (from InventoryUnit.attributes)
  storage?: string
  color?: string
  batteryHealth?: number | null
  notes?: string
  isSerialized?: boolean
}

type Category = {
  _id: string
  name: string
  slug: string
  icon: string
  description: string
}

function getIcon(iconName: string) {
  const Icon = (LucideIcons as any)[iconName] || LucideIcons.Package
  return Icon
}

export function StorefrontClient({ 
  products, 
  categories, 
  landingPageData,
  settings
}: { 
  products: Product[], 
  categories: Category[],
  landingPageData: any,
  settings: any
}) {
  const heroData = landingPageData || {
    heroTitle: 'الوجهة الأولى لحيتان الموبايلات',
    heroSubtitle: 'منصتك الحصرية لأسعار الحرق، تحديث لحظي للسوق، وكميات فورية للتجار والموزعين.'
  }

  // ── Smart Routing Logic ──────────────────────────────────────────────────
  const mainNum        = settings?.whatsappNumber || landingPageData?.contact?.whatsapp || '01129592916'
  const salesNum       = settings?.salesWhatsapp     || mainNum
  const maintenanceNum = settings?.maintenanceWhatsapp || mainNum
  // ─────────────────────────────────────────────────────────────────────────

  // ── C2B Evaluation Modal State ──
  const [evalModal, setEvalModal] = useState(false)
  const [evalForm, setEvalForm] = useState({ deviceModel: '', storage: '', condition: 'Kaser Zero', customerName: '', whatsapp: '' })
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [evalToast, setEvalToast] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  function openEval() { setEvalModal(true); setSubmitted(false); setPhotos([]); setEvalForm({ deviceModel: '', storage: '', condition: 'Kaser Zero', customerName: '', whatsapp: '' }) }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const remaining = 3 - photos.length
    files.slice(0, remaining).forEach(file => {
      setPhotos(prev => [...prev, { file, preview: URL.createObjectURL(file) }])
    })
  }

  async function uploadToImgBB(file: File): Promise<string> {
    const fd = new FormData(); fd.append('image', file)
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd })
    const data = await res.json()
    if (!data.success) throw new Error('فشل رفع الصورة')
    return data.data.display_url
  }

  async function handleSubmitEval() {
    if (!evalForm.deviceModel.trim()) return setEvalToast('أدخل موديل الجهاز')
    if (!evalForm.storage.trim()) return setEvalToast('أدخل السعة التخزينية')
    if (!evalForm.customerName.trim()) return setEvalToast('أدخل اسمك')
    if (!evalForm.whatsapp.trim()) return setEvalToast('أدخل رقم الواتساب')
    setUploading(true)
    try {
      const photoUrls = await Promise.all(photos.map(p => uploadToImgBB(p.file)))
      const res = await fetch('/api/offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...evalForm, photos: photoUrls }) })
      if (!res.ok) throw new Error('فشل إرسال الطلب')

      // WhatsApp Routing (Sales)
      const waMsg = `مرحباً، أريد تقييم جهازي: ${evalForm.deviceModel} (حالة: ${evalForm.condition})`
      window.open(getWhatsAppURL(salesNum, waMsg), '_blank')

      setSubmitted(true)
    } catch (err: any) { setEvalToast(err.message) }
    finally { setUploading(false) }
    setTimeout(() => setEvalToast(null), 3000)
  }

  const inp: React.CSSProperties = { width: '100%', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 12, padding: '0.85rem 1rem', color: '#0F172A', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' as const }
  const lbl: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.5rem' }

  // ── Maintenance Clinic Modal State ──
  const [clinicModal, setClinicModal] = useState(false)
  const [clinicForm, setClinicForm] = useState({ deviceModel: '', issueCategory: 'شاشة', issueDescription: '', customerName: '', whatsapp: '' })
  const [clinicPhotos, setClinicPhotos] = useState<{ file: File; preview: string }[]>([])
  const [clinicUploading, setClinicUploading] = useState(false)
  const [clinicSubmitted, setClinicSubmitted] = useState(false)
  const [clinicToast, setClinicToast] = useState<string | null>(null)
  const clinicPhotoRef = useRef<HTMLInputElement>(null)

  function openClinic() { setClinicModal(true); setClinicSubmitted(false); setClinicPhotos([]); setClinicForm({ deviceModel: '', issueCategory: 'شاشة', issueDescription: '', customerName: '', whatsapp: '' }) }

  function handleClinicPhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const remaining = 3 - clinicPhotos.length
    files.slice(0, remaining).forEach(file => {
      setClinicPhotos(prev => [...prev, { file, preview: URL.createObjectURL(file) }])
    })
  }

  async function handleSubmitClinic() {
    if (!clinicForm.deviceModel.trim()) return setClinicToast('أدخل موديل الجهاز')
    if (!clinicForm.issueDescription.trim()) return setClinicToast('أدخل وصف المشكلة')
    if (!clinicForm.customerName.trim()) return setClinicToast('أدخل اسمك')
    if (!clinicForm.whatsapp.trim()) return setClinicToast('أدخل رقم الواتساب')
    setClinicUploading(true)
    try {
      const photoUrls = await Promise.all(clinicPhotos.map(p => uploadToImgBB(p.file)))
      const res = await fetch('/api/repair-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...clinicForm, photos: photoUrls }) })
      if (!res.ok) throw new Error('فشل إرسال الطلب')
      
      // WhatsApp Routing (Maintenance)
      const waMsg = `مرحباً، أطلب تسعير صيانة لـ ${clinicForm.deviceModel} (المشكلة: ${clinicForm.issueDescription})`
      window.open(getWhatsAppURL(maintenanceNum, waMsg), '_blank')
      
      setClinicSubmitted(true)
    } catch (err: any) { setClinicToast(err.message) }
    finally { setClinicUploading(false) }
    setTimeout(() => setClinicToast(null), 3000)
  }

  // ── Maintenance Tracker Section ──────────────────────────────────────────
  const [trackQuery, setTrackQuery] = useState('')
  const [trackResults, setTrackResults] = useState<any[] | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [trackError, setTrackError] = useState<string | null>(null)

  async function handleTrack() {
    if (!trackQuery.trim()) return
    setTrackLoading(true)
    setTrackError(null)
    try {
      const res = await fetch(`/api/public-maintenance?query=${encodeURIComponent(trackQuery)}`)
      const data = await res.json()
      if (data.success) {
        setTrackResults(data.tickets)
      } else {
        setTrackResults([])
        setTrackError(data.message)
      }
    } catch (err) {
      setTrackError('حدث خطأ في الاتصال بالخادم')
    } finally {
      setTrackLoading(false)
    }
  }

  return (
    <>
      {/* ── Hero Section ── */}
      <section style={{ padding: '4rem 1.5rem', background: '#F0F9FF', display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 1200, height: 'clamp(480px, 65vw, 720px)', borderRadius: '2.5rem', overflow: 'hidden', boxShadow: '0 42px 100px rgba(0,0,0,0.35)' }}>
          <video autoPlay loop muted playsInline preload="auto" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}>
            <source src="/assets/trailer.mp4" type="video/mp4" />
          </video>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.65) 100%)', backdropFilter: 'blur(2px)' }} />
          
          <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', gap: '1.5rem' }}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span style={{ 
                fontSize: '0.85rem', 
                fontWeight: 800, 
                letterSpacing: '0.3em', 
                color: '#06B6D4', 
                textTransform: 'uppercase',
                background: 'rgba(6,182,212,0.1)',
                padding: '0.5rem 1.5rem',
                borderRadius: '50px',
                border: '1px solid rgba(6,182,212,0.2)'
              }}>
                ALMAZ EDITION — 2060
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 25 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2, duration: 0.7 }} 
              style={{ fontSize: 'clamp(2rem, 6vw, 4.2rem)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, maxWidth: 900, textShadow: '0 4px 32px rgba(0,0,0,0.5)' }}
            >
              {heroData.heroTitle}
            </motion.h1>

            {/* Maintenance Tracking Search Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{ width: '100%', maxWidth: 500, position: 'relative' }}
            >
              <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <input 
                  value={trackQuery}
                  onChange={e => setTrackQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTrack()}
                  placeholder="رقم الهاتف أو كود الاستلام (مثلاً 0A1B2C)"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', padding: '0 1.25rem', fontSize: '1rem', fontFamily: 'inherit' }}
                />
                <button 
                  onClick={handleTrack}
                  disabled={trackLoading}
                  style={{ background: '#06B6D4', color: '#fff', border: 'none', borderRadius: 18, padding: '0.8rem 1.5rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {trackLoading ? <Loader2 className="animate-spin" size={18} /> : <LucideIcons.Search size={18} />}
                  متابعة حالة جهازك
                </button>
              </div>

              {/* Float-Down Results */}
              <AnimatePresence>
                {(trackResults || trackError) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    style={{ position: 'absolute', top: '120%', left: 0, right: 0, background: '#FFFFFF', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 24, padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', zIndex: 100, textAlign: 'right' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                       <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#06B6D4' }}>نتائج البحث</span>
                       <button onClick={() => { setTrackResults(null); setTrackError(null) }} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={16} /></button>
                    </div>

                    {trackError ? (
                      <p style={{ color: '#EF4444', fontWeight: 700 }}>{trackError}</p>
                    ) : trackResults && trackResults.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {trackResults.map((t: any) => (
                          <div key={t.idSuffix} style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 16, border: '1px solid #E2E8F0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 900, color: '#0F172A' }}>{t.deviceModel}</span>
                              <span style={{ fontSize: '0.9rem', color: '#06B6D4', fontWeight: 800 }}>#{t.idSuffix}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                               <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.status === 'Ready for Pickup' ? '#22C55E' : '#F59E0B' }} />
                               <span style={{ fontWeight: 800, color: t.status === 'Ready for Pickup' ? '#22C55E' : '#F59E0B' }}>
                                 {t.status === 'Pending' ? 'في انتظار البدء' :
                                  t.status === 'Diagnosing' ? 'جاري الفحص' :
                                  t.status === 'In Repair' ? 'جاري الإصلاح' :
                                  t.status === 'Ready for Pickup' ? 'جاهز للاستلام ✓' :
                                  t.status === 'Delivered' ? 'تم التسليم' : t.status}
                               </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#64748B' }}>لا توجد أجهزة مطابقة</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.6, duration: 0.8 }} 
              style={{ fontSize: 'clamp(1rem, 1.5vw, 1.4rem)', color: 'rgba(255,255,255,0.7)', maxWidth: 700, lineHeight: 1.6, fontWeight: 500 }}
            >
              {heroData.heroSubtitle}
            </motion.p>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, duration: 0.5 }}>
              <a
                href={getWhatsAppURL(salesNum, 'أريد الاستفسار عن عروض ORCA')}
                style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '0.75rem', padding: '1.1rem 3rem', 
                  background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)', 
                  borderRadius: 16, color: '#fff', fontWeight: 900, fontSize: '1.15rem', textDecoration: 'none', 
                  boxShadow: '0 12px 40px rgba(6,182,212,0.4)', transition: 'all 0.3s' 
                }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'translateY(-4px)'; el.style.boxShadow = '0 20px 60px rgba(6,182,212,0.6)' }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = 'translateY(0)'; el.style.boxShadow = '0 12px 40px rgba(6,182,212,0.4)' }}
              >
                {landingPageData?.contact?.whatsapp ? 'تواصل معنا الآن' : 'دخول بورصة الأسعار'}
                <ChevronLeft size={22} strokeWidth={3} />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Advantages Section (Dynamic) ── */}
      <section style={{ padding: '6rem 2rem', background: '#FFFFFF', position: 'relative' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: '#0F172A', marginBottom: '1rem' }}>
              {landingPageData?.brandPromiseTitle || 'مميزات ORCA'}
            </h2>
            <p style={{ color: '#475569', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto' }}>
              {landingPageData?.brandPromiseDescription || 'نحن نقدم حلولاً متكاملة لتجارة الموبايل في مصر'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            {(landingPageData?.advantages || []).map((adv: any, i: number) => {
              const Icon = getIcon(adv.icon)
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  style={{
                    background: 'rgba(30, 41, 59, 0.4)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '2rem',
                    padding: '3rem 2.5rem',
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.transform = 'translateY(-10px)'
                    el.style.background = 'rgba(30, 41, 59, 0.7)'
                    el.style.borderColor = 'rgba(6,182,212,0.3)'
                    el.style.boxShadow = '0 30px 60px rgba(0,0,0,0.3), 0 0 20px rgba(6,182,212,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.transform = 'translateY(0)'
                    el.style.background = 'rgba(30, 41, 59, 0.4)'
                    el.style.borderColor = 'rgba(255,255,255,0.06)'
                    el.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(59,130,246,0.2) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(6,182,212,0.3)' }}>
                    <Icon size={32} color="#06B6D4" strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', marginBottom: '0.75rem' }}>
                      {adv.title}
                    </h3>
                    <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>
                      {adv.description}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Categories Grid ── */}
      <section id="categories" style={{ padding: '6rem 2rem', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.3em', color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.75rem' }}>تصفح الأقسام</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: '#0F172A' }}>منظومة ORCA المتكاملة</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {categories.map((cat, i) => {
              const Icon = getIcon(cat.icon)
              return (
                <motion.div
                  key={cat._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  <Link href={`/category/${cat.slug}`} style={{ textDecoration: 'none' }}>
                    <div
                      style={{
                        position: 'relative', background: '#FFFFFF', border: '1px solid #E2E8F0',
                        borderRadius: '2rem', padding: '2.5rem', display: 'flex', flexDirection: 'column',
                        gap: '1.25rem', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.borderColor = 'rgba(6,182,212,1)'
                        el.style.background = '#0F172A'
                        el.style.transform = 'scale(1.02)'
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.borderColor = 'rgba(255,255,255,0.05)'
                        el.style.background = '#0B1120'
                        el.style.transform = 'scale(1)'
                      }}
                    >
                      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06B6D4' }}>
                        <Icon size={26} strokeWidth={2} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                          {cat.name}
                        </h3>
                        <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.6 }}>
                          {cat.description}
                        </p>
                      </div>
                      <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '50%', background: 'rgba(6,182,212,0.1)', color: '#06B6D4' }}>
                          <ChevronLeft size={20} />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>
      {/* ── C2B: Sell Your Device Section ── */}
      <section style={{ padding: '7rem 2rem', background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 50%, #EFF6FF 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: -10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 50, padding: '0.5rem 1.5rem', marginBottom: '2.5rem' }}>
            <Sparkles size={16} color="#A855F7" />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.15em', color: '#A855F7', textTransform: 'uppercase' }}>بوابة البيع الذكي C2B</span>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3rem)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.2, marginBottom: '1.5rem' }}>
            ليه تنزل وتلف؟ 🚀
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, maxWidth: 680, margin: '0 auto 2.5rem' }}>
            صور تليفونك، ابعت مواصفاته، واسمع <strong style={{ color: '#A855F7' }}>أعلى سعر في السوق</strong> وإنت قاعد في بيتك!
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
            {['📸 صور الجهاز', '⚡ رد فوري', '💰 أعلى سعر', '🏠 من بيتك'].map((pill) => (
              <span key={pill} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: '0.5rem 1.25rem', color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: '0.9rem' }}>{pill}</span>
            ))}
          </motion.div>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
            onClick={openEval}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.85rem', padding: '1.2rem 3.5rem', borderRadius: 20, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #A855F7 0%, #06B6D4 100%)', color: '#fff', fontWeight: 900, fontSize: '1.15rem', fontFamily: 'inherit', boxShadow: '0 16px 48px rgba(168,85,247,0.4)', transition: 'all 0.3s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)'; e.currentTarget.style.boxShadow = '0 24px 64px rgba(168,85,247,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(168,85,247,0.4)' }}
          >
            <Smartphone size={24} />
            ثمن جهازك الآن
          </motion.button>
        </div>
      </section>
      {/* ── Online Maintenance Clinic Section ── */}
      <section style={{ padding: '7rem 2rem', background: 'linear-gradient(135deg, #F0FDF4 0%, #F0F9FF 50%, #F0FDF4 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '15%', left: '8%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '8%', width: 280, height: 280, background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%' }} />

        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: -10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 50, padding: '0.5rem 1.5rem', marginBottom: '2.5rem' }}>
            <Wrench size={16} color="#10B981" />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.15em', color: '#10B981', textTransform: 'uppercase' }}>عيادة الصيانة الأونلاين</span>
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3rem)', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.2, marginBottom: '1.5rem' }}>
            شاشتك مكسورة؟ جهازك فاصل؟ 🔧
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, maxWidth: 680, margin: '0 auto 2.5rem' }}>
            صور العطل وابعتلنا، وهنقولك <strong style={{ color: '#10B981' }}>التكلفة ووقت الاستلام فوراً!</strong> من أريحك ومن غير ما تتعب.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
            {['📸 صور العطل', '⚡ تسعير فوري', '🔧 إصلاح احترافي', '🚀 تسليم سريع'].map((pill) => (
              <span key={pill} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: '0.5rem 1.25rem', color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: '0.9rem' }}>{pill}</span>
            ))}
          </motion.div>
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
            onClick={openClinic}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.85rem', padding: '1.2rem 3.5rem', borderRadius: 20, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)', color: '#fff', fontWeight: 900, fontSize: '1.15rem', fontFamily: 'inherit', boxShadow: '0 16px 48px rgba(16,185,129,0.4)', transition: 'all 0.3s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)'; e.currentTarget.style.boxShadow = '0 24px 64px rgba(16,185,129,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(16,185,129,0.4)' }}
          >
            <Wrench size={24} />
            اطلب تسعير صيانة
          </motion.button>
        </div>
      </section>

      {/* ── Maintenance Clinic Modal ── */}
      <AnimatePresence>
        {clinicModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setClinicModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }}
              style={{ position: 'relative', zIndex: 2, background: '#0B1120', borderRadius: 32, width: '100%', maxWidth: 520, border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 40px 100px rgba(16,185,129,0.15)', maxHeight: '92vh', overflowY: 'auto' }}>
              <div style={{ padding: '2.25rem 2.25rem 1.75rem', background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 50, padding: '0.3rem 0.9rem', marginBottom: '0.75rem' }}>
                    <Wrench size={13} color="#10B981" />
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', color: '#10B981', textTransform: 'uppercase' }}>تسعير فوري</span>
                  </div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '0.2rem' }}>اطلب تسعير صيانة 🔧</h2>
                  <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>صف المشكلة وارفع صورة وسنرد بالتكلفة فوراً</p>
                </div>
                <button onClick={() => setClinicModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 50, padding: '0.5rem', cursor: 'pointer', color: '#94A3B8', flexShrink: 0 }}>
                  <X size={22} />
                </button>
              </div>
              <div style={{ padding: '2rem 2.25rem' }}>
                {clinicSubmitted ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                    <CheckCircle size={72} color="#10B981" style={{ margin: '0 auto 1.5rem' }} />
                    <h3 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem' }}>طلبك وصلنا! 🎉</h3>
                    <p style={{ color: '#94A3B8', lineHeight: 1.8 }}>سيتواصل معك فريق الصيانة على <strong style={{ color: '#10B981' }}>{clinicForm.whatsapp}</strong> بالتكلفة والوقت المتوقع.</p>
                    <button onClick={() => setClinicModal(false)} style={{ marginTop: '2rem', padding: '0.9rem 2.5rem', background: 'linear-gradient(135deg, #10B981, #06B6D4)', border: 'none', borderRadius: 16, color: '#fff', fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}>ممتاز، شكراً!</button>
                  </motion.div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {clinicToast && <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#EF4444', fontWeight: 700, fontSize: '0.88rem' }}>{clinicToast}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={lbl}>موديل الجهاز *</label>
                        <input style={inp} value={clinicForm.deviceModel} onChange={e => setClinicForm(f => ({...f, deviceModel: e.target.value}))} placeholder="iPhone 13 / Samsung S23..." />
                      </div>
                      <div>
                        <label style={lbl}>نوع العطل</label>
                        <select style={{...inp, background: '#1E293B'}} value={clinicForm.issueCategory} onChange={e => setClinicForm(f => ({...f, issueCategory: e.target.value}))}>
                          <option value="شاشة">📱 شاشة</option>
                          <option value="بطارية">🔋 بطارية</option>
                          <option value="سوفت وير">💻 سوفت وير</option>
                          <option value="أخرى">🔧 أخرى</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>اسمك الكريم *</label>
                        <input style={inp} value={clinicForm.customerName} onChange={e => setClinicForm(f => ({...f, customerName: e.target.value}))} placeholder="أحمد محمد" />
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={lbl}>وصف المشكلة بالتفصيل *</label>
                        <textarea style={{...inp, resize: 'vertical' as const, minHeight: 90}} value={clinicForm.issueDescription} onChange={e => setClinicForm(f => ({...f, issueDescription: e.target.value}))} placeholder="مثال: الشاشة اتكسرت بعد سقوط الجهاز، اللمس شغال بس فيه خطوط..." />
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={lbl}>رقم الواتساب *</label>
                        <input style={{...inp, direction: 'ltr', letterSpacing: '0.05em'}} type="tel" value={clinicForm.whatsapp} onChange={e => setClinicForm(f => ({...f, whatsapp: e.target.value}))} placeholder="010xxxxxxxx" />
                      </div>
                    </div>
                    <div>
                      <label style={{...lbl, marginBottom: '0.75rem'}}>📸 صور العطل <span style={{ color: '#64748B', fontWeight: 500 }}>(حتى 3 صور — وضح المشكلة)</span></label>
                      <input ref={clinicPhotoRef} type="file" accept="image/*" multiple onChange={handleClinicPhotoSelect} style={{ display: 'none' }} />
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {clinicPhotos.map((p, i) => (
                          <div key={i} style={{ position: 'relative' }}>
                            <img src={p.preview} style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 14, border: '2px solid rgba(16,185,129,0.3)' }} />
                            <button onClick={() => setClinicPhotos(prev => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: -6, left: -6, background: '#EF4444', border: 'none', borderRadius: 50, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {clinicPhotos.length < 3 && (
                          <button onClick={() => clinicPhotoRef.current?.click()} style={{ width: 88, height: 88, background: 'rgba(16,185,129,0.05)', border: '2px dashed rgba(16,185,129,0.3)', borderRadius: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: '#10B981', transition: 'background 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.1)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.05)')}>
                            <Upload size={20} />
                            <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>صورة</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleSubmitClinic} disabled={clinicUploading}
                      style={{ padding: '1.2rem', background: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)', border: 'none', borderRadius: 18, color: '#fff', fontWeight: 900, fontSize: '1.1rem', cursor: clinicUploading ? 'not-allowed' : 'pointer', opacity: clinicUploading ? 0.7 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.6rem', fontFamily: 'inherit', boxShadow: '0 8px 32px rgba(16,185,129,0.3)' }}
                    >
                      {clinicUploading ? <><Loader2 className="animate-spin" size={20} /> جاري الإرسال...</> : <>ابعت طلب التسعير ✓</>}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── C2B Evaluation Modal ── */}
      <AnimatePresence>
        {evalModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEvalModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }}
              style={{ position: 'relative', zIndex: 2, background: '#0B1120', borderRadius: 32, width: '100%', maxWidth: 520, border: '1px solid rgba(168,85,247,0.3)', boxShadow: '0 40px 100px rgba(168,85,247,0.2)', maxHeight: '92vh', overflowY: 'auto' }}>
              <div style={{ padding: '2.25rem 2.25rem 1.75rem', background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 50, padding: '0.3rem 0.9rem', marginBottom: '0.75rem' }}>
                    <Sparkles size={13} color="#A855F7" />
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', color: '#A855F7', textTransform: 'uppercase' }}>تقييم فوري</span>
                  </div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '0.2rem' }}>ثمن جهازك الآن 📱</h2>
                  <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>أدخل البيانات وسنرد بأعلى سعر خلال دقائق</p>
                </div>
                <button onClick={() => setEvalModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 50, padding: '0.5rem', cursor: 'pointer', color: '#94A3B8', flexShrink: 0 }}>
                  <X size={22} />
                </button>
              </div>
              <div style={{ padding: '2rem 2.25rem' }}>
                {submitted ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                    <CheckCircle size={72} color="#22C55E" style={{ margin: '0 auto 1.5rem' }} />
                    <h3 style={{ fontSize: '1.7rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem' }}>تم استلام طلبك! 🎉</h3>
                    <p style={{ color: '#94A3B8', lineHeight: 1.8 }}>سيتواصل معك فريقنا على <strong style={{ color: '#06B6D4' }}>{evalForm.whatsapp}</strong> بأعلى سعر في السوق.</p>
                    <button onClick={() => setEvalModal(false)} style={{ marginTop: '2rem', padding: '0.9rem 2.5rem', background: 'linear-gradient(135deg, #A855F7, #06B6D4)', border: 'none', borderRadius: 16, color: '#fff', fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}>ممتاز، شكراً!</button>
                  </motion.div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {evalToast && <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#EF4444', fontWeight: 700, fontSize: '0.88rem' }}>{evalToast}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={lbl}>موديل الجهاز *</label>
                        <input style={inp} value={evalForm.deviceModel} onChange={e => setEvalForm(f => ({...f, deviceModel: e.target.value}))} placeholder="iPhone 15 / Samsung S24 Ultra..." />
                      </div>
                      <div>
                        <label style={lbl}>السعة التخزينية</label>
                        <select style={{...inp, background: '#1E293B'}} value={evalForm.storage} onChange={e => setEvalForm(f => ({...f, storage: e.target.value}))}>
                          <option value="">اختر</option>
                          {['64GB','128GB','256GB','512GB','1TB'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>حالة الجهاز</label>
                        <select style={{...inp, background: '#1E293B'}} value={evalForm.condition} onChange={e => setEvalForm(f => ({...f, condition: e.target.value}))}>
                          <option value="Kaser Zero">✨ كيسر زيرو</option>
                          <option value="Scratched">🔅 فيه خدوش بسيطة</option>
                          <option value="Needs Repair">🔧 محتاج إصلاح</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>اسمك الكريم *</label>
                        <input style={inp} value={evalForm.customerName} onChange={e => setEvalForm(f => ({...f, customerName: e.target.value}))} placeholder="أحمد محمد" />
                      </div>
                      <div>
                        <label style={lbl}>رقم الواتساب *</label>
                        <input style={{...inp, direction: 'ltr', letterSpacing: '0.05em'}} type="tel" value={evalForm.whatsapp} onChange={e => setEvalForm(f => ({...f, whatsapp: e.target.value}))} placeholder="010xxxxxxxx" />
                      </div>
                    </div>
                    <div>
                      <label style={{...lbl, marginBottom: '0.75rem'}}>📸 صور الجهاز <span style={{ color: '#64748B', fontWeight: 500 }}>(حتى 3 — أمام / خلف / أي عيوب)</span></label>
                      <input ref={photoRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} style={{ display: 'none' }} />
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {photos.map((p, i) => (
                          <div key={i} style={{ position: 'relative' }}>
                            <img src={p.preview} style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 14, border: '2px solid rgba(168,85,247,0.3)' }} />
                            <button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: -6, left: -6, background: '#EF4444', border: 'none', borderRadius: 50, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {photos.length < 3 && (
                          <button onClick={() => photoRef.current?.click()} style={{ width: 88, height: 88, background: 'rgba(168,85,247,0.05)', border: '2px dashed rgba(168,85,247,0.3)', borderRadius: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: '#A855F7', transition: 'background 0.2s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.1)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.05)')}>
                            <Upload size={20} />
                            <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>صورة</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleSubmitEval} disabled={uploading}
                      style={{ padding: '1.2rem', background: 'linear-gradient(135deg, #A855F7 0%, #06B6D4 100%)', border: 'none', borderRadius: 18, color: '#fff', fontWeight: 900, fontSize: '1.1rem', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.6rem', fontFamily: 'inherit', boxShadow: '0 8px 32px rgba(168,85,247,0.3)' }}
                    >
                      {uploading ? <><Loader2 className="animate-spin" size={20} /> جاري الإرسال...</> : <>ابعت طلب التقييم ★</>}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
