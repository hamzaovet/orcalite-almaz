'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, Plus, Trash2, Layout, Zap, Star, Shield, ArrowRight, Loader2, Smartphone, Phone, MapPin, TrendingUp, Box, Megaphone, Upload, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const IMGBB_KEY = '1705736b8f2b46dcbaeec8a6025aca83'

export default function ContentEditorPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [newAd, setNewAd] = useState({ title: '', description: '', imageUrl: '', locationLink: '', isActive: true })
  const [uploadingAdImg, setUploadingAdImg] = useState(false)
  const adImgRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/landing-page')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/landing-page', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        setMessage('تم حفظ التغييرات بنجاح')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (err) {
      console.error(err)
      setMessage('فشل في حفظ التغييرات')
    } finally {
      setSaving(false)
    }
  }

  async function handleAdImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAdImg(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd })
      const result = await res.json()
      if (result?.data?.display_url) {
        setNewAd(prev => ({ ...prev, imageUrl: result.data.display_url }))
      }
    } catch {} finally { setUploadingAdImg(false) }
  }

  function addAd() {
    if (!newAd.title.trim()) return
    setData({ ...data, marketingAds: [...(data.marketingAds || []), { ...newAd }] })
    setNewAd({ title: '', description: '', imageUrl: '', locationLink: '', isActive: true })
  }

  function removeAd(i: number) {
    const ads = [...(data.marketingAds || [])]
    ads.splice(i, 1)
    setData({ ...data, marketingAds: ads })
  }

  function toggleAd(i: number) {
    const ads = [...(data.marketingAds || [])]
    ads[i] = { ...ads[i], isActive: !ads[i].isActive }
    setData({ ...data, marketingAds: ads })
  }

  function addAdvantage() {
    setData({
      ...data,
      advantages: [...data.advantages, { title: 'ميزة جديدة', description: 'وصف الميزة هنا', icon: 'Zap' }]
    })
  }

  function removeAdvantage(index: number) {
    const newAdv = [...data.advantages]
    newAdv.splice(index, 1)
    setData({ ...data, advantages: newAdv })
  }

  function updateAdvantage(index: number, field: string, value: string) {
    const newAdv = [...data.advantages]
    newAdv[index] = { ...newAdv[index], [field]: value }
    setData({ ...data, advantages: newAdv })
  }

  if (loading) return (
    <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="animate-spin" size={48} color="#06B6D4" />
    </div>
  )

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', color: '#1E293B' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'var(--font-tajawal)' }}>إدارة المحتوى الديناميكي</h1>
          <p style={{ color: '#475569', fontWeight: 500 }}>تحكم في هوية "ORCA ألمظ" البصرية والنصوص الأساسية للموقع</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.75rem', 
            background: '#06B6D4', color: '#0F172A', borderRadius: 12, border: 'none', 
            fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
            opacity: saving ? 0.7 : 1,
            boxShadow: '0 8px 24px rgba(6,182,212,0.3)'
          }}
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
        </button>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} 
          style={{ padding: '1rem', background: '#ECFEFF', 
          border: `1px solid #06B6D4`, 
          borderRadius: 12, marginBottom: '2rem', textAlign: 'center', color: '#06B6D4', fontWeight: 800 }}>
          {message}
        </motion.div>
      )}

      <div style={{ display: 'grid', gap: '2rem' }}>
        
        {/* ── Hero Settings ── */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 24, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#06B6D4' }}>
            <Layout size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>قسم الهيرو (Hero Section)</h2>
          </div>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>العنوان الرئيسي</label>
              <input 
                value={data.heroTitle} 
                onChange={e => setData({...data, heroTitle: e.target.value})}
                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1.1rem', fontWeight: 800, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>العنوان الفرعي</label>
              <textarea 
                value={data.heroSubtitle} 
                onChange={e => setData({...data, heroSubtitle: e.target.value})}
                rows={3}
                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1rem', fontWeight: 500, outline: 'none', resize: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* ── Brand Promise Settings ── */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 24, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#06B6D4' }}>
            <Star size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>رسالة العلامة التجارية</h2>
          </div>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>عنوان القسم</label>
              <input 
                value={data.brandPromiseTitle} 
                onChange={e => setData({...data, brandPromiseTitle: e.target.value})}
                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1.1rem', fontWeight: 800, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>وصف القسم</label>
              <textarea 
                value={data.brandPromiseDescription} 
                onChange={e => setData({...data, brandPromiseDescription: e.target.value})}
                rows={2}
                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1rem', fontWeight: 500, outline: 'none', resize: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* ── Advantages Settings ── */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 24, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#06B6D4' }}>
              <Zap size={24} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>المميزات (Advantages)</h2>
            </div>
            <button 
              onClick={addAdvantage}
              style={{ padding: '0.5rem 1rem', background: '#ECFEFF', border: '1px solid #06B6D4', color: '#06B6D4', borderRadius: 10, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} /> إضافة ميزة
            </button>
          </div>
          
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <AnimatePresence>
              {data.advantages.map((adv: any, i: number) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '1.5rem', display: 'flex', gap: '1.5rem', position: 'relative' }}
                >
                  <div style={{ flex: 1, display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', color: '#475569' }}>العنوان</label>
                        <input value={adv.title} onChange={e => updateAdvantage(i, 'title', e.target.value)} style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: 8, color: '#0F172A', fontSize: '0.95rem', fontWeight: 800, outline: 'none' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', color: '#475569' }}>الأيقونة (Lucide)</label>
                        <input value={adv.icon} onChange={e => updateAdvantage(i, 'icon', e.target.value)} style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: 8, color: '#0F172A', fontSize: '0.95rem', fontWeight: 500, outline: 'none' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', color: '#475569' }}>الوصف</label>
                      <textarea value={adv.description} onChange={e => updateAdvantage(i, 'description', e.target.value)} rows={2} style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: 8, color: '#0F172A', fontSize: '0.9rem', fontWeight: 500, outline: 'none', resize: 'none' }} />
                    </div>
                  </div>
                  <button 
                    onClick={() => removeAdvantage(index)}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#EF4444', padding: '0.5rem', borderRadius: 8, cursor: 'pointer', height: 'fit-content', alignSelf: 'center' }}
                  >
                    <Trash2 size={20} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Contact Settings ── */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 24, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#06B6D4' }}>
            <Smartphone size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>بيانات التواصل (Contact Info)</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>رقم الهاتف (العرض)</label>
              <input 
                value={data.contact?.phone} 
                onChange={e => setData({...data, contact: { ...data.contact, phone: e.target.value }})}
                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1rem', fontWeight: 800, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>رقم الواتساب (بدون كود الدولة)</label>
              <input 
                value={data.contact?.whatsapp} 
                onChange={e => setData({...data, contact: { ...data.contact, whatsapp: e.target.value }})}
                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1rem', fontWeight: 800, outline: 'none' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>العنوان التفصيلي</label>
              <input 
                value={data.contact?.address} 
                onChange={e => setData({...data, contact: { ...data.contact, address: e.target.value }})}
                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1rem', fontWeight: 500, outline: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* ── Marketing Ads Section ── */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 24, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#A855F7' }}>
              <Megaphone size={24} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>الإعلانات المنبثقة (Marketing Popups)</h2>
            </div>
          </div>

          {/* Existing Ads */}
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            {(data.marketingAds || []).map((ad: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', background: '#FFFFFF', borderRadius: 16, padding: '1rem', border: `1px solid ${ad.isActive ? 'rgba(168,85,247,0.2)' : '#E2E8F0'}`, alignItems: 'center' }}>
                {ad.imageUrl && <img src={ad.imageUrl} alt={ad.title} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>{ad.title}</p>
                  {ad.description && <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>{ad.description}</p>}
                  {ad.locationLink && <p style={{ fontSize: '0.72rem', color: '#06B6D4', marginTop: '0.2rem' }}>📍 {ad.locationLink.substring(0, 40)}...</p>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button onClick={() => toggleAd(i)} title={ad.isActive ? 'تعطيل' : 'تفعيل'} style={{ background: ad.isActive ? 'rgba(168,85,247,0.1)' : 'rgba(100,116,139,0.1)', border: 'none', borderRadius: 8, padding: '0.4rem 0.8rem', cursor: 'pointer', color: ad.isActive ? '#A855F7' : '#64748B', fontWeight: 700, fontSize: '0.75rem' }}>
                    {ad.isActive ? 'مفعّل' : 'معطّل'}
                  </button>
                  <button onClick={() => removeAd(i)} style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: 8, padding: '0.4rem', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {(data.marketingAds || []).length === 0 && (
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>لا توجد إعلانات حتى الآن.</p>
            )}
          </div>

          {/* Add New Ad Form */}
          <div style={{ background: 'rgba(168,85,247,0.04)', border: '1px dashed rgba(168,85,247,0.3)', borderRadius: 16, padding: '1.5rem' }}>
            <p style={{ fontWeight: 800, color: '#A855F7', fontSize: '0.85rem', marginBottom: '1rem' }}>➕ إضافة إعلان جديد</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>عنوان الإعلان *</label>
                <input value={newAd.title} onChange={e => setNewAd(p => ({...p, title: e.target.value}))} placeholder="مثال: عرض خاص على iPhone 15" style={{ width: '100%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '0.7rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>رابط خرائط جوجل (اختياري)</label>
                <input value={newAd.locationLink} onChange={e => setNewAd(p => ({...p, locationLink: e.target.value}))} placeholder="https://maps.google.com/..." style={{ width: '100%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '0.7rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const, direction: 'ltr' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>وصف الإعلان</label>
                <input value={newAd.description} onChange={e => setNewAd(p => ({...p, description: e.target.value}))} placeholder="تفاصيل العرض الخاص..." style={{ width: '100%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '0.7rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            </div>
            {/* Image upload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <input ref={adImgRef} type="file" accept="image/*" onChange={handleAdImageUpload} style={{ display: 'none' }} />
              {newAd.imageUrl ? (
                <div style={{ position: 'relative' }}>
                  <img src={newAd.imageUrl} alt="ad preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '2px solid rgba(168,85,247,0.3)' }} />
                  <button onClick={() => setNewAd(p => ({...p, imageUrl: ''}))} style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={11} /></button>
                </div>
              ) : (
                <button onClick={() => adImgRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', border: '1px dashed rgba(168,85,247,0.4)', borderRadius: 10, padding: '0.6rem 1.2rem', cursor: 'pointer', color: '#A855F7', fontWeight: 700, fontSize: '0.85rem' }}>
                  {uploadingAdImg ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
                  {uploadingAdImg ? 'جاري الرفع...' : 'رفع صورة'}
                </button>
              )}
              <button onClick={addAd} disabled={!newAd.title.trim()} style={{ flex: 1, background: newAd.title.trim() ? '#A855F7' : '#E2E8F0', color: newAd.title.trim() ? '#fff' : '#94A3B8', border: 'none', borderRadius: 10, padding: '0.7rem 1.5rem', fontWeight: 800, cursor: newAd.title.trim() ? 'pointer' : 'not-allowed', fontSize: '0.9rem' }}>
                <Plus size={16} style={{ display: 'inline', marginLeft: '0.3rem' }} /> إضافة الإعلان
              </button>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94A3B8' }}>الإعلان سيظهر في الصفحة الرئيسية لمدة 5 ثوانٍ ثم يختفي لمدة 55 ثانية. تأكد من وجود ملف الصوت notification.mp3 في public/assets/</p>
          </div>
        </div>

        {/* ── Footer Settings ── */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 24, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#06B6D4' }}>
            <Box size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>إعدادات التذييل (Footer Settings)</h2>
          </div>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>وصف "عن الشركة" في الفوتر</label>
              <textarea 
                value={data.footerDescription} 
                onChange={e => setData({...data, footerDescription: e.target.value})}
                rows={3}
                placeholder="أدخل النص التعريفي الذي سيظهر في فوتر الموقع..."
                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1rem', fontWeight: 500, outline: 'none', resize: 'none' }}
              />
            </div>
          </div>
        </div>

      </div>

      <div style={{ marginTop: '4rem', padding: '2rem', borderTop: '1px solid rgba(6,182,212,0.15)', textAlign: 'center' }}>
        <p style={{ color: '#475569', fontSize: '0.9rem', fontWeight: 500 }}>
          * سيتم تحديث الصفحة الرئيسية فور حفظ المديول. تأكد من مراجعة النصوص بدقة.
        </p>
      </div>
    </div>
  )
}
