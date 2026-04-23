'use client'

import { useState, useEffect } from 'react'
import { DollarSign, RefreshCw, Loader2, Save, TrendingUp, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function CurrencySettingsPage() {
  const [rate, setRate] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setRate(data.exchangeRate || 1)
    } catch {
      showToast('فشل تحميل الإعدادات', 'err')
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSave() {
    if (rate <= 0) { showToast('يرجى إدخال سعر صرف صحيح', 'err'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchangeRate: rate }),
      })
      if (!res.ok) throw new Error()
      showToast('تم تحديث سعر الصرف وإعادة حساب كافة المنتجات ✓', 'ok')
    } catch {
      showToast('حدث خطأ أثناء الحفظ', 'err')
    } finally {
      setSaving(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'rgba(6, 182, 212, 0.03)', borderRadius: 24, padding: '2.5rem',
    border: '1px solid rgba(6, 182, 212, 0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    maxWidth: 600, margin: '0 auto'
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', color: '#1E293B' }}>
      
      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.type === 'ok' ? '#06B6D4' : '#EF4444', color: '#0F172A', padding: '0.65rem 1.5rem', borderRadius: 50, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.3em', color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.5rem' }}>محرك العملات العالمي</p>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 900, color: '#0F172A' }}>التحكم في سعر الصرف</h1>
        <p style={{ color: '#475569', fontSize: '1rem', marginTop: '0.5rem' }}>إدارة قيمة العملات الأجنبية (USD/AED) مقابل الجنيه المصري</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto', color: '#06B6D4' }} />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={32} color="#06B6D4" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A' }}>قيمة الدولار / الدرهم</h2>
              <p style={{ fontSize: '0.85rem', color: '#475569' }}>سيتم استخدام هذه القيمة لحساب كافة أسعار الجملة تلقائياً</p>
            </div>
          </div>

          <div style={{ marginBottom: '2.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#475569', marginBottom: '0.75rem', display: 'block' }}>سعر الصرف الحالي (EGP)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="number" step="0.01" value={rate} onChange={e => setRate(Number(e.target.value))}
                style={{ width: '100%', padding: '1.25rem 1.5rem', borderRadius: 16, background: 'rgba(0,0,0,0.3)', color: '#0F172A', border: '2px solid rgba(6, 182, 212, 0.2)', fontSize: '2rem', fontWeight: 900, outline: 'none', textAlign: 'center' }}
              />
              <span style={{ position: 'absolute', right: '1.5rem', fontWeight: 900, color: 'rgba(6,182,212,0.4)', fontSize: '1.2rem' }}>ج.م</span>
            </div>
          </div>

          <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 16, padding: '1.25rem', marginBottom: '2.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <AlertCircle size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
              <span style={{ color: '#F59E0B', fontWeight: 800 }}>تنبيه:</span> عند حفظ السعر الجديد، سيقوم النظام تلقائياً بتحديث جميع أسعار الجملة (Wholesale Price) لكل المنتجات المسجلة بناءً على تكلفتها الأجنبية وهامش الربح المحدد لها.
            </p>
          </div>

          <button 
            onClick={handleSave} disabled={saving}
            style={{ width: '100%', padding: '1.25rem', background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 18, fontWeight: 900, fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', boxShadow: '0 8px 32px rgba(6,182,212,0.3)', transition: 'all 0.2s' }}
          >
            {saving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
            {saving ? 'جارٍ تحديث كافة البيانات...' : 'حفظ وتحديث الأسعار عالمياً'}
          </button>
        </motion.div>
      )}

      <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ ...cardStyle, maxWidth: 'none', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.1)', borderRadius: 12 }}><TrendingUp size={24} color="#22C55E" /></div>
          <div><p style={{ fontSize: '0.75rem', color: '#475569' }}>آخر مزامنة ناجحة</p><p style={{ fontWeight: 800 }}>اليوم، {new Date().toLocaleTimeString('ar-EG')}</p></div>
        </div>
        <div style={{ ...cardStyle, maxWidth: 'none', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: '#ECFEFF', borderRadius: 12 }}><RefreshCw size={24} color="#06B6D4" /></div>
          <div><p style={{ fontSize: '0.75rem', color: '#475569' }}>دقة الحساب</p><p style={{ fontWeight: 800 }}>أوتوماتيكي بالكامل (Real-time)</p></div>
        </div>
      </div>

    </div>
  )
}
