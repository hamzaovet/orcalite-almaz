'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Tags, Loader2, FolderOpen, Smartphone, Headphones, Settings, Watch, CreditCard, Tag, Laptop, Cpu, Printer, Mouse, Keyboard, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Category {
  _id: string
  name: string
  slug: string
  icon: string
}

const ICON_MAP: Record<string, any> = {
  Smartphone, Headphones, Settings, Watch, CreditCard, Tag, FolderOpen, Laptop, Cpu, Printer, Mouse, Keyboard
}

const DynamicIcon = ({ name, size = 24, color = 'currentColor', className = '' }: any) => {
  const Comp = ICON_MAP[name] || Tag
  return <Comp size={size} color={color} className={className} />
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [isEditing, setIsEditing]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [form, setForm] = useState({ _id: '', name: '', slug: '', icon: 'Tag' })
  const [autoSlug, setAutoSlug] = useState(true) // auto-derive slug from name while untouched
  const [message, setMessage]       = useState<{text: string, type: 'ok' | 'err'} | null>(null)
  const [businessType, setBusinessType] = useState('B2B_WHALE')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [res, settsRes] = await Promise.all([
         fetch('/api/categories'),
         fetch('/api/settings')
      ])
      const data = await res.json()
      const settsData = await settsRes.json()
      
      setCategories(data.categories ?? [])
      if (settsData && settsData.businessType) setBusinessType(settsData.businessType)
    } catch { showMessage('فشل تحميل الأقسام', 'err') }
    finally { setLoading(false) }
  }

  function showMessage(text: string, type: 'ok' | 'err' = 'ok') {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3500)
  }

  function toSlug(val: string) {
    return val
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '') // strip non-ASCII (Arabic chars) — user types Latin slug
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
  }

  function openNew() {
    setIsEditing(false)
    setAutoSlug(true)
    setForm({ _id: '', name: '', slug: '', icon: 'Tag' })
    setModal(true)
  }

  function openEdit(cat: Category) {
    setIsEditing(true)
    setAutoSlug(false)
    setForm({ _id: cat._id, name: cat.name, slug: cat.slug, icon: cat.icon || 'Tag' })
    setModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    const slugToSend = form.slug.trim() || toSlug(form.name.trim())
    if (!slugToSend) { alert('الرجاء إدخال المعرف (slug) يدوياً'); return }
    setSaving(true)
    try {
      const payload = isEditing
        ? { _id: form._id, name: form.name.trim(), slug: slugToSend, icon: form.icon || 'Tag' }
        : { name: form.name.trim(), slug: slugToSend, icon: form.icon || 'Tag' }
      const res = await fetch('/api/categories', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        showMessage(isEditing ? 'تم التحديث بنجاح' : 'تمت الإضافة بنجاح', 'ok')
        setModal(false)
        load()
      } else {
        const err = await res.json()
        showMessage(err.message || 'حدث خطأ أثناء الحفظ', 'err')
      }
    } catch { showMessage('حدث خطأ أثناء الحفظ', 'err') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم قطع ارتباط المنتجات به.')) return
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCategories(prev => prev.filter(c => c._id !== id))
        showMessage('تم حذف القسم', 'ok')
      }
    } catch { showMessage('فشل الحذف', 'err') }
  }

  async function handleSeedDefaults() {
    setLoading(true)
    const defaults = [
      { name: 'أجهزة محمولة', slug: 'mobile-devices', icon: 'Smartphone' },
      { name: 'إكسسوارات', slug: 'accessories', icon: 'Headphones' },
      { name: 'قطع غيار', slug: 'spare-parts', icon: 'Settings' },
      { name: 'أجهزة ذكية', slug: 'smart-devices', icon: 'Watch' },
      { name: 'خدمات وشحن', slug: 'services', icon: 'CreditCard' }
    ]
    try {
      for (const cat of defaults) {
         await fetch('/api/categories', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(cat)
         })
      }
      showMessage('تم تأسيس الأقسام الافتراضية بنجاح', 'ok')
      load()
    } catch { showMessage('حدث خطأ أثناء التأسيس', 'err') }
  }

  /* ── Styles ───────────────────────────────────────────────── */
  const inp: React.CSSProperties = {
    width: '100%', padding: '0.8rem 1rem', border: '1px solid rgba(6, 182, 212, 0.2)',
    borderRadius: 12, fontSize: '0.95rem', fontFamily: 'inherit', color: '#FFFFFF',
    outline: 'none', background: 'rgba(6, 182, 212, 0.05)',
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', color: '#F8FAFC' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.2em', color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.4rem' }}>أقسام الكتالوج</p>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFFFFF' }}>الأقسام الرئيسية</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {categories.length === 0 && businessType === 'B2C_RETAIL' && !loading && (
            <button
              onClick={handleSeedDefaults}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'linear-gradient(135deg, #A855F7 0%, #06B6D4 100%)', color: '#fff', border: 'none', borderRadius: 12, padding: '0.8rem 1.6rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(168,85,247,0.3)', transition: 'transform 0.2s' }}
              onMouseEnter={(e)=>e.currentTarget.style.transform='scale(1.05)'}
              onMouseLeave={(e)=>e.currentTarget.style.transform='scale(1)'}
            >
              <Sparkles size={20} /> تأسيس الأقسام الافتراضية
            </button>
          )}

          <button
            onClick={openNew}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#06B6D4', color: '#fff', border: 'none', borderRadius: 12, padding: '0.8rem 1.6rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(6,182,212,0.35)', transition: 'transform 0.2s' }}
            onMouseEnter={(e)=>e.currentTarget.style.transform='scale(1.05)'}
            onMouseLeave={(e)=>e.currentTarget.style.transform='scale(1)'}
          >
            <Plus size={20} /> إضافة قسم جديد
          </button>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ padding: '1rem', background: message.type === 'ok' ? 'rgba(6,182,212,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${message.type === 'ok' ? '#06B6D4' : '#EF4444'}`, borderRadius: 12, marginBottom: '2rem', textAlign: 'center', color: message.type === 'ok' ? '#06B6D4' : '#EF4444', fontWeight: 700 }}>
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#06B6D4' }}>
          <Loader2 size={48} className="animate-spin" style={{ margin: '0 auto' }} />
        </div>
      ) : categories.length === 0 ? (
        <div style={{ background: 'rgba(6, 182, 212, 0.03)', borderRadius: 24, border: '1px solid rgba(6, 182, 212, 0.15)', textAlign: 'center', padding: '6rem 2rem' }}>
          <FolderOpen size={64} color="rgba(6,182,212,0.3)" style={{ margin: '0 auto 1.5rem' }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.5rem' }}>لا توجد أقسام مسجلة</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem', maxWidth: 400, margin: '0 auto' }}>يمكنك إضافة الأقسام يدوياً أو استخدام التأسيس التلقائي إذا كنت تاجر تجزئة.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {categories.map((cat) => (
            <motion.div 
              key={cat._id} 
              layout 
              style={{
                position: 'relative',
                background: '#111827', // dark slate
                borderRadius: 24, 
                padding: '2rem',
                border: '1px solid rgba(6, 182, 212, 0.2)', 
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                transition: 'all 0.3s ease-out',
                cursor: 'pointer'
              }}
              onMouseEnter={(e)=>{
                e.currentTarget.style.transform = 'scale(1.05) translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(6, 182, 212, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.5)';
              }}
              onMouseLeave={(e)=>{
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.2)';
              }}
            >
              {/* Massive subtle icon in background */}
              <div style={{ position: 'absolute', right: '-1rem', bottom: '-1rem', opacity: 0.05, pointerEvents: 'none' }}>
                <DynamicIcon name={cat.icon || 'Tag'} size={140} color="#06B6D4" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0.05) 100%)', border: '1px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <DynamicIcon name={cat.icon || 'Tag'} size={32} color="#06B6D4" />
                </div>
                
                {/* Discrete Actions */}
                <div style={{ display: 'flex', gap: '0.4rem', opacity: 0.8 }}>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(cat); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#06B6D4', padding: '0.5rem', borderRadius: 10, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(6,182,212,0.1)'} onMouseLeave={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}><Pencil size={18} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(cat._id); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#EF4444', padding: '0.5rem', borderRadius: 10, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(239,68,68,0.1)'} onMouseLeave={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}><Trash2 size={18} /></button>
                </div>
              </div>
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFFFFF', marginBottom: '0.4rem' }}>{cat.name}</h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(6,182,212,0.7)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{cat.slug}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(8, 12, 20, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(12px)' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{ background: '#0B1120', borderRadius: 28, width: '100%', maxWidth: 500, padding: '2.5rem', border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <h2 style={{ fontWeight: 900, fontSize: '1.6rem', color: '#FFFFFF' }}>{isEditing ? 'تعديل القسم' : 'إضافة قسم جديد'}</h2>
                <button onClick={() => setModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 50, padding: '0.5rem', cursor: 'pointer', color: '#fff' }}><X size={24} /></button>
              </div>

              <form onSubmit={handleSave} style={{ display: 'grid', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.9rem', color: '#94A3B8', fontWeight: 700 }}>اسم القسم</label>
                  <input
                    autoFocus
                    value={form.name}
                    onChange={e => {
                      const name = e.target.value
                      setForm(prev => ({
                        ...prev,
                        name,
                        slug: autoSlug ? toSlug(name) : prev.slug,
                      }))
                    }}
                    style={inp}
                    placeholder="مثال: هواتف ذكية"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.9rem', color: '#94A3B8', fontWeight: 700 }}>
                    المعرف (Slug)
                  </label>
                  <input
                    value={form.slug}
                    onChange={e => {
                      setAutoSlug(false)
                      setForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, '') }))
                    }}
                    style={{ ...inp, fontFamily: 'monospace', color: '#06B6D4', letterSpacing: '0.04em' }}
                    placeholder="مثال: apple-smartphones"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.9rem', color: '#94A3B8', fontWeight: 700 }}>الأيقونة</label>
                  <div style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', padding: '0.5rem 0', scrollbarWidth: 'thin' }}>
                    {Object.keys(ICON_MAP).map(iconName => {
                       const isSelected = form.icon === iconName;
                       return (
                         <div 
                           key={iconName}
                           onClick={() => setForm(pf => ({...pf, icon: iconName}))}
                           style={{
                             padding: '0.8rem',
                             borderRadius: 16,
                             cursor: 'pointer',
                             border: `2px solid ${isSelected ? '#06B6D4' : 'rgba(255,255,255,0.05)'}`,
                             background: isSelected ? 'rgba(6,182,212,0.1)' : '#111827',
                             flexShrink: 0,
                             transition: 'all 0.2s'
                           }}
                         >
                           <DynamicIcon name={iconName} size={28} color={isSelected ? '#06B6D4' : '#64748B'} />
                         </div>
                       )
                    })}
                  </div>
                </div>

                <div style={{ paddingTop: '1rem' }}>
                  <button
                    type="submit" disabled={saving}
                    style={{ width: '100%', background: '#06B6D4', color: '#fff', border: 'none', borderRadius: 16, padding: '1.25rem', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(6,182,212,0.3)' }}
                  >
                    {saving ? <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto' }} /> : (isEditing ? 'حفظ التغييرات' : 'إضافة القسم للحساب')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
