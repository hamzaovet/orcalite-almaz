'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Layout, Zap, Star, Shield, ArrowRight, Loader2, Smartphone, Phone, MapPin, TrendingUp, Box } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ContentEditorPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<any>(null)
  const [message, setMessage] = useState('')

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
          <p style={{ color: '#475569', fontWeight: 500 }}>تحكم في هوية "فري زون" البصرية والنصوص الأساسية للموقع</p>
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
                style={{ width: '100%', background: '#080C14', border: '1px solid #F1F5F9', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1.1rem', fontWeight: 800, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>العنوان الفرعي</label>
              <textarea 
                value={data.heroSubtitle} 
                onChange={e => setData({...data, heroSubtitle: e.target.value})}
                rows={3}
                style={{ width: '100%', background: '#080C14', border: '1px solid #F1F5F9', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1rem', fontWeight: 500, outline: 'none', resize: 'none' }}
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
                style={{ width: '100%', background: '#080C14', border: '1px solid #F1F5F9', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1.1rem', fontWeight: 800, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>وصف القسم</label>
              <textarea 
                value={data.brandPromiseDescription} 
                onChange={e => setData({...data, brandPromiseDescription: e.target.value})}
                rows={2}
                style={{ width: '100%', background: '#080C14', border: '1px solid #F1F5F9', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1rem', fontWeight: 500, outline: 'none', resize: 'none' }}
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
                        <input value={adv.title} onChange={e => updateAdvantage(i, 'title', e.target.value)} style={{ width: '100%', background: '#080C14', border: '1px solid #F1F5F9', padding: '0.75rem', borderRadius: 8, color: '#0F172A', fontSize: '0.95rem', fontWeight: 800, outline: 'none' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', color: '#475569' }}>الأيقونة (Lucide)</label>
                        <input value={adv.icon} onChange={e => updateAdvantage(i, 'icon', e.target.value)} style={{ width: '100%', background: '#080C14', border: '1px solid #F1F5F9', padding: '0.75rem', borderRadius: 8, color: '#0F172A', fontSize: '0.95rem', fontWeight: 500, outline: 'none' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', color: '#475569' }}>الوصف</label>
                      <textarea value={adv.description} onChange={e => updateAdvantage(i, 'description', e.target.value)} rows={2} style={{ width: '100%', background: '#080C14', border: '1px solid #F1F5F9', padding: '0.75rem', borderRadius: 8, color: '#0F172A', fontSize: '0.9rem', fontWeight: 500, outline: 'none', resize: 'none' }} />
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
                style={{ width: '100%', background: '#080C14', border: '1px solid #F1F5F9', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1rem', fontWeight: 800, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>رقم الواتساب (بدون كود الدولة)</label>
              <input 
                value={data.contact?.whatsapp} 
                onChange={e => setData({...data, contact: { ...data.contact, whatsapp: e.target.value }})}
                style={{ width: '100%', background: '#080C14', border: '1px solid #F1F5F9', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1rem', fontWeight: 800, outline: 'none' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>العنوان التفصيلي</label>
              <input 
                value={data.contact?.address} 
                onChange={e => setData({...data, contact: { ...data.contact, address: e.target.value }})}
                style={{ width: '100%', background: '#080C14', border: '1px solid #F1F5F9', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1rem', fontWeight: 500, outline: 'none' }}
              />
            </div>
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
                style={{ width: '100%', background: '#080C14', border: '1px solid #F1F5F9', padding: '1rem', borderRadius: 12, color: '#0F172A', fontSize: '1rem', fontWeight: 500, outline: 'none', resize: 'none' }}
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
