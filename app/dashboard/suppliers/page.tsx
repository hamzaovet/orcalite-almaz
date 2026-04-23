'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, X, Search, Loader2, TrendingUp, TrendingDown, Wallet, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import SupplierLedgerModal from '@/components/dashboard/SupplierLedgerModal'

type SupplierType = 'Supplier' | 'Customer' | 'Both'

type Supplier = {
  _id?: string
  name: string
  type: SupplierType
  balance: number
  phone?: string
}

const blankForm: { _id: string; name: string; type: SupplierType; balance: string; phone: string } = {
  _id: '',
  name: '',
  type: 'Supplier',
  balance: '0',
  phone: '',
}

/* ── Balance badge ───────────────────────────────────────────── */
function BalanceBadge({ balance, type }: { balance: number; type: SupplierType }) {
  const isPositive = balance > 0
  const isNegative = balance < 0

  // Correct accounting terminology:
  // Supplier with balance > 0  → we OWE them → they are CREDITOR (دائن)
  // Customer with balance > 0  → they OWE us  → they are DEBTOR  (مدين)
  const isSupplier = type === 'Supplier' || type === 'Both'
  const isCustomer = type === 'Customer' || type === 'Both'

  let label = 'مسوّى'
  let color = '#22C55E'
  let bg    = 'rgba(34,197,94,0.1)'
  let Icon  = Wallet

  if (isPositive) {
    if (isSupplier && !isCustomer) {
      // We owe supplier → they are creditor
      label = 'دائن (مستحق له)'
      color = '#FB923C'
      bg    = 'rgba(251,146,60,0.1)'
      Icon  = TrendingUp
    } else {
      // Customer owes us → they are debtor
      label = 'مدين (مستحق علينا)'
      color = '#EF4444'
      bg    = 'rgba(239,68,68,0.1)'
      Icon  = TrendingDown
    }
  } else if (isNegative) {
    if (isSupplier && !isCustomer) {
      // Supplier owes us (overpaid) → they are debtor
      label = 'مدين (له رصيد لنا)'
      color = '#22C55E'
      bg    = 'rgba(34,197,94,0.1)'
      Icon  = TrendingDown
    } else {
      // We owe customer (credit balance) → creditor
      label = 'دائن (مستحق لهم)'
      color = '#A855F7'
      bg    = 'rgba(168,85,247,0.1)'
      Icon  = TrendingUp
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.8rem', borderRadius: 50, background: bg, color, fontWeight: 800, fontSize: '0.75rem' }}>
      <Icon size={14} strokeWidth={2.5} />
      {Math.abs(balance).toLocaleString('ar-EG', { minimumFractionDigits: 0 })} ج.م
      &nbsp;—&nbsp;{label}
    </span>
  )
}

/* ── Type badge ────────────────────────────────────────────── */
function TypeBadge({ type }: { type: SupplierType }) {
  const map: Record<SupplierType, { label: string; color: string; bg: string }> = {
    Supplier: { label: 'مورد',       color: '#06B6D4', bg: 'rgba(6,182,212,0.1)' },
    Customer: { label: 'عميل',       color: '#A855F7', bg: 'rgba(168,85,247,0.1)' },
    Both:     { label: 'مورد/عميل', color: '#FB923C', bg: 'rgba(251,146,60,0.1)'  },
  }
  const { label, color, bg } = map[type] ?? map.Supplier
  return (
    <span style={{ padding: '0.25rem 0.75rem', borderRadius: 50, background: bg, color, fontWeight: 800, fontSize: '0.72rem' }}>{label}</span>
  )
}

export default function SuppliersPage() {
  const [items, setItems]       = useState<Supplier[]>([])
  const [loading, setLoading]   = useState(true)
  const [ledgerModal, setLedgerModal] = useState<Supplier | null>(null)
  const [modal, setModal]       = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm]         = useState({ ...blankForm })
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toast, setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  useEffect(() => { fetchSuppliers() }, [])

  async function fetchSuppliers() {
    setLoading(true)
    try {
      const res  = await fetch('/api/suppliers')
      const data = await res.json()
      setItems(data.suppliers ?? [])
    } catch {
      showToast('فشل تحميل الموردين', 'err')
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function openNew() {
    setIsEditing(false)
    setForm({ ...blankForm })
    setModal(true)
  }

  function openEdit(s: Supplier) {
    setIsEditing(true)
    setForm({
      _id: s._id ?? '',
      name: s.name,
      type: s.type,
      balance: String(s.balance),
      phone: s.phone ?? '',
    })
    setModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast('اسم الحساب مطلوب', 'err'); return }
    setSaving(true)
    try {
      const body = {
        name:    form.name.trim(),
        type:    form.type,
        balance: Number(form.balance) || 0,
        phone:   form.phone.trim() || undefined,
        ...(isEditing ? { _id: form._id } : {}),
      }

      const res  = await fetch('/api/suppliers', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'فشل الحفظ')

      if (isEditing) {
        setItems(prev => prev.map(s => s._id === form._id ? { ...data.data } : s))
        showToast('تم التحديث بنجاح ✓', 'ok')
      } else {
        setItems(prev => [data.supplier, ...prev])
        showToast('تمت إضافة الحساب ✓', 'ok')
      }
      setModal(false)
    } catch (err: any) {
      showToast(err.message ?? 'حدث خطأ', 'err')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(s => s._id !== id))
      showToast('تم الحذف', 'ok')
    } catch {
      showToast('فشل الحذف', 'err')
    } finally {
      setDeleteId(null)
    }
  }

  const totalOwedByUs  = items.filter(s => s.balance > 0).reduce((acc, s) => acc + s.balance, 0)
  const totalOwedToUs  = items.filter(s => s.balance < 0).reduce((acc, s) => acc + Math.abs(s.balance), 0)
  const filtered     = items.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone ?? '').includes(search))

  /* ── Styles ──────────────────────────────────────────────── */
  const card: React.CSSProperties = {
    background: 'rgba(6, 182, 212, 0.03)', borderRadius: 20, padding: '2rem',
    border: '1px solid rgba(6, 182, 212, 0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '0.8rem 1rem', border: '1px solid rgba(6, 182, 212, 0.15)',
    borderRadius: 12, fontSize: '0.95rem', fontFamily: 'inherit', color: '#0F172A',
    outline: 'none', background: 'rgba(6, 182, 212, 0.05)', boxSizing: 'border-box'
  }
  const lbl: React.CSSProperties = {
    fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.5rem'
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', color: '#1E293B' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: toast.type === 'ok' ? '#06B6D4' : '#EF4444', color: '#0F172A', padding: '0.65rem 1.5rem', borderRadius: 50, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.22em', color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.4rem' }}>الحسابات المالية</p>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0F172A' }}>الموردون والعملاء</h1>
          <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: '0.2rem' }}>{items.length} جهة تعامل نشطة</p>
        </div>
        <button
          onClick={openNew}
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 14, padding: '0.85rem 1.8rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(6,182,212,0.35)' }}
        >
          <Plus size={20} /> إضافة حساب جديد
        </button>
      </div>

      {/* Totals Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { label: 'مستحق لنا (عملاء)', value: totalOwedToUs, color: '#22C55E', icon: TrendingUp },
          { label: 'مستحق علينا (موردين)', value: totalOwedByUs, color: '#FB923C', icon: TrendingDown },
          { label: 'إجمالي الحسابات', value: items.length, color: '#06B6D4', icon: Wallet, isCount: true },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: `${s.color}15`, border: `1px solid ${s.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={24} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 700, marginBottom: '0.4rem' }}>{s.label}</p>
                <p style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F172A', direction: s.isCount ? 'inherit' : 'ltr', lineHeight: 1 }}>
                  {s.isCount ? s.value : s.value.toLocaleString('ar-EG') + ' ج.م'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div style={{ ...card, marginBottom: '2rem', padding: '1rem 1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(6,182,212,0.4)' }} />
          <input
            type="text" placeholder="البحث بالاسم أو رقم الهاتف..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ ...inp, paddingRight: '3rem' }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: '#06B6D4' }}>
            <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ background: 'rgba(6,182,212,0.06)', borderBottom: '1px solid #E2E8F0' }}>
                  {['#', 'الجهة', 'النوع', 'الرصيد الحالي', 'الهاتف', 'إجراءات'].map((h) => (
                    <th key={h} style={{ padding: '1.2rem 1rem', textAlign: 'right', fontWeight: 800, color: '#475569', fontSize: '0.75rem', letterSpacing: '0.1em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s._id ?? i} style={{ borderBottom: '1px solid rgba(6,182,212,0.08)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(6,182,212,0.03)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding: '1.2rem 1rem', color: '#475569', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '1.2rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span onClick={() => setLedgerModal(s)} style={{ fontWeight: 800, color: '#0F172A', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#06B6D4', textDecorationThickness: '2px', textUnderlineOffset: '4px' }}>{s.name}</span>
                        <Link href={`/dashboard/suppliers/${s._id}`} title="كشف حساب تفصيلي" style={{ color: '#06B6D4', opacity: 0.6, display: 'flex', alignItems: 'center' }}>
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1rem' }}><TypeBadge type={s.type} /></td>
                    <td style={{ padding: '1.2rem 1rem' }}><BalanceBadge balance={s.balance} type={s.type} /></td>
                    <td style={{ padding: '1.2rem 1rem', color: '#475569', direction: 'ltr', textAlign: 'right' }}>{s.phone || '—'}</td>
                    <td style={{ padding: '1.2rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <button onClick={() => openEdit(s)} style={{ background: '#ECFEFF', border: 'none', color: '#06B6D4', padding: '0.5rem', borderRadius: 8, cursor: 'pointer' }}><Pencil size={18} /></button>
                        <button onClick={async () => { if(confirm('متأكد من الحذف؟')) { await fetch('/api/suppliers?id=' + s._id, { method: 'DELETE' }); window.location.reload(); } }} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444', padding: '0.5rem', borderRadius: 8, cursor: 'pointer' }}><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length === 0 && <div style={{ textAlign: 'center', padding: '5rem', color: '#475569' }}>لا توجد حسابات مطابقة</div>}
      </div>

      {/* Modal Overlay */}
      <AnimatePresence>
        {modal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(8, 12, 20, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(12px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: '#F8FAFC', borderRadius: 28, width: '100%', maxWidth: 500, padding: '2.5rem', border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 32px 100px rgba(0,0,0,0.15)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontWeight: 900, fontSize: '1.5rem', color: '#0F172A' }}>{isEditing ? 'تعديل الحساب' : 'إضافة حساب جديد'}</h2>
                <button onClick={() => setModal(false)} style={{ background: '#F8FAFC', border: 'none', borderRadius: 50, padding: '0.4rem', cursor: 'pointer', color: '#0F172A' }}><X size={24} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div><label style={lbl}>اسم الحساب / الجهة *</label><input style={inp} placeholder="مثال: شركة النيل للتوريدات" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div>
                  <label style={lbl}>نوع الحساب *</label>
                  <select style={{...inp, background: 'transparent'}} value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
                    <option value="Supplier">مورد (Supplier)</option>
                    <option value="Customer">عميل (Customer)</option>
                    <option value="Both">مورد وعميل (Both)</option>
                  </select>
                </div>
                <div><label style={lbl}>رصيد البداية (ج.م)</label><input style={{...inp, direction: 'ltr'}} type="number" placeholder="0.00" value={form.balance} onChange={e => setForm({...form, balance: e.target.value})} /><p style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.4rem' }}>موجب = مستحق عليهم لنا — سالب = مستحق لهم علينا</p></div>
                <div><label style={lbl}>رقم الهاتف</label><input style={{...inp, direction: 'ltr'}} placeholder="+20..." value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                
                <button
                  onClick={handleSave} disabled={saving}
                  style={{ background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 16, padding: '1.1rem', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', marginTop: '1rem', boxShadow: '0 8px 32px rgba(6,182,212,0.3)' }}
                >
                  {saving ? <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto' }} /> : (isEditing ? 'حفظ التغييرات' : 'إضافة الحساب')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ledgerModal && (
          <SupplierLedgerModal supplier={ledgerModal as any} onClose={() => setLedgerModal(null)} />
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
