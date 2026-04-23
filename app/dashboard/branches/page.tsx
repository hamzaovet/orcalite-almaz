'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, GitBranch, Loader2, MapPin, Building2, UserCheck, Warehouse, Truck, History, Smartphone, Scan } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TransferModal } from './components/TransferModal'
import { generateLedgerHTML, generateTransferReceiptHTML, generateMasterLedgerHTML } from '@/utils/printGenerator'

type BranchType = 'Branch' | 'Warehouse' | 'Distributor' | 'Representative' | 'Internal'

interface Branch {
  _id: string
  name: string
  type: BranchType
  address?: string
  custodyCount?: number
  createdAt: string
}

function TypeBadge({ type }: { type: BranchType }) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    Internal:       { label: 'فرع داخلي',    color: '#06B6D4', bg: 'rgba(6,182,212,0.1)',   icon: Building2 },
    Branch:         { label: 'فرع بيع',      color: '#06B6D4', bg: 'rgba(6,182,212,0.1)',   icon: Building2 },
    Warehouse:      { label: 'مستودع مخزون', color: '#A855F7', bg: 'rgba(168,85,247,0.1)',  icon: Warehouse },
    Distributor:    { label: 'موزع معتمد',  color: '#FB923C', bg: 'rgba(251,146,60,0.1)', icon: GitBranch },
    Representative: { label: 'مندوب مبيعات', color: '#22C55E', bg: 'rgba(34,197,94,0.1)',  icon: UserCheck },
  }
  const meta = map[type as string] || map.Branch
  const Icon = meta.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', borderRadius: 50, background: meta.bg, color: meta.color, fontWeight: 800, fontSize: '0.72rem', border: `1px solid ${meta.color}20` }}>
      <Icon size={12} />
      {meta.label}
    </span>
  )
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [transferModal, setTransferModal] = useState(false)
  const [historyDrawer, setHistoryDrawer] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [historyOrders, setHistoryOrders] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [form, setForm]         = useState({ _id: '', name: '', type: 'Internal' as BranchType, address: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/branches', { cache: 'no-store' })
      const data = await res.json()
      setBranches(data.branches ?? [])
    } catch { showToast('فشل تحميل البيانات', 'err') }
    finally { setLoading(false) }
  }

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  function openNew() {
    setIsEditing(false)
    setForm({ _id: '', name: '', type: 'Internal', address: '' })
    setModal(true)
  }

  function openEdit(b: Branch) {
    setIsEditing(true)
    setForm({ _id: b._id, name: b.name, type: b.type || 'Internal', address: b.address ?? '' })
    setModal(true)
  }

  function openTransfer(b: Branch) {
    setSelectedBranch(b)
    setTransferModal(true)
  }

  async function openHistory(b: Branch) {
    setSelectedBranch(b)
    setHistoryDrawer(true)
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/inventory/transfer?branchId=${b._id}`)
      const data = await res.json()
      setHistoryOrders(data.orders || [])
    } catch { showToast('فشل تحميل سجل التحويلات', 'err') }
    finally { setHistoryLoading(false) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const method = isEditing ? 'PUT' : 'POST'
      const body   = isEditing
        ? { _id: form._id, name: form.name.trim(), type: form.type, address: form.address.trim() }
        : { name: form.name.trim(), type: form.type, address: form.address.trim() }
      const res  = await fetch('/api/branches', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      showToast(isEditing ? 'تم التحديث بنجاح ✓' : 'تمت الإضافة بنجاح ✓', 'ok')
      setModal(false); load()
    } catch { showToast('حدث خطأ أثناء الحفظ', 'err') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من الحذف؟')) return
    try {
      await fetch(`/api/branches?id=${id}`, { method: 'DELETE' })
      showToast('تم الحذف بنجاح', 'ok')
      setBranches(prev => prev.filter(b => b._id !== id))
    } catch { showToast('فشل الحذف', 'err') }
  }

  /* ── Print/Ledger Handlers ── */
  function handlePrintLedger() {
    if (!selectedBranch) return
    const totalVal = historyOrders.reduce((sum, o) => {
      const isOut = o.fromLocationType === 'MainWarehouse'
      return isOut ? sum + (o.totalValue || 0) : sum - (o.totalValue || 0)
    }, 0)
    const html = generateLedgerHTML(selectedBranch, historyOrders, totalVal)
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 500)
    }
  }

  function handleReprint(order: any) {
    if (!selectedBranch) return
    const data = {
      orderNumber: order.orderNumber,
      date: new Date(order.date).toLocaleDateString('ar-EG'),
      time: new Date(order.date).toLocaleTimeString('ar-EG'),
      targetName: selectedBranch.name,
      targetType: (selectedBranch as any).type || 'Branch',
      items: (order.items || []).map((u: any) => ({
        productName: u.productId?.name || 'Unknown Item',
        serialNumber: u.serialNumber || 'N/A'
      })),
      totalValue: order.totalValue || 0,
      mode: order.fromLocationType === 'MainWarehouse' ? 'Out' : 'In' as 'Out' | 'In',
      notes: order.notes
    }
    const html = generateTransferReceiptHTML(data)
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 500)
    }
  }

  async function handlePrintMasterStatement() {
    if (!selectedBranch) return
    try {
      showToast('جاري تحضير الكشف المجمع...', 'ok')
      const res = await fetch(`/api/branches/${selectedBranch._id}/statement`)
      const d = await res.json()
      if (d.success) {
        const html = generateMasterLedgerHTML(d.branchName, d.statement)
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(html)
          win.document.close()
          win.focus()
          setTimeout(() => win.print(), 500)
        }
      } else {
        showToast(d.message || 'فشل تحميل البيانات', 'err')
      }
    } catch {
      showToast('خطأ في الاتصال بالسيرفر', 'err')
    }
  }

  /* ── Styles ── */
  const card: React.CSSProperties = {
    background: '#FFFFFF', borderRadius: 24, padding: '2rem',
    border: '1px solid #E2E8F0', boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '0.8rem 1rem', border: '1px solid #E2E8F0',
    borderRadius: 12, fontSize: '0.95rem', fontFamily: 'inherit', color: '#0F172A',
    outline: 'none', background: '#ECFEFF', boxSizing: 'border-box'
  }
  const lbl: React.CSSProperties = {
    fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.5rem'
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', color: '#1E293B' }}>
      
      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.type === 'ok' ? '#06B6D4' : '#EF4444', color: '#0F172A', padding: '0.65rem 1.5rem', borderRadius: 50, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.22em', color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Enterprise Distribution Core</p>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0F172A' }}>توزيع العُهدة والوكلاء</h1>
          <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: '0.2rem' }}>إصدار أذونات الصرف ومتابعة مخزون المندوبين والفروع</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 14, padding: '0.85rem 1.8rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 24px rgba(6,182,212,0.3)' }}><Plus size={20} /> إضافة كيان</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#06B6D4' }}><Loader2 size={40} className="animate-spin" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '1.5rem' }}>
          {branches.map(b => (
            <motion.div key={b._id} whileHover={{ y: -5 }} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: 50, height: 50, borderRadius: 14, background: '#ECFEFF', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={24} color="#06B6D4" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A' }}>{b.name}</h3>
                        <TypeBadge type={b.type} />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => openEdit(b)} style={{ background: '#F8FAFC', border: 'none', color: '#475569', padding: '0.5rem', borderRadius: 8, cursor: 'pointer' }}><Pencil size={18} /></button>
                  <button onClick={() => handleDelete(b._id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444', padding: '0.5rem', borderRadius: 8, cursor: 'pointer' }}><Trash2 size={18} /></button>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '1.25rem', borderRadius: 16, marginBottom: '1.5rem', border: '1px solid #E2E8F0' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>العُهدة الحالية (Stock)</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: b.custodyCount ? '#06B6D4' : '#64748B' }}>{b.custodyCount || 0} جهاز</span>
                 </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1.5rem' }}>📍 {b.address || 'تحت التغطية'}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
                  <button onClick={() => openTransfer(b)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.75rem', borderRadius: 12, border: 'none', background: '#06B6D4', color: '#0F172A', fontWeight: 900, cursor: 'pointer' }}>
                    <Truck size={18} /> صرف بضاعة
                  </button>
                  <button onClick={() => openHistory(b)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.75rem', borderRadius: 12, border: '1px solid #CBD5E1', background: 'transparent', color: '#06B6D4', fontWeight: 800, cursor: 'pointer' }}>
                    <History size={16} /> السجل
                  </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Main Form Modal */}
      <AnimatePresence>
        {modal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(8, 12, 20, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(12px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: '#F8FAFC', borderRadius: 28, width: '100%', maxWidth: 480, padding: '2.5rem', border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 32px 100px rgba(0,0,0,0.15)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontWeight: 900, fontSize: '1.5rem', color: '#0F172A' }}>{isEditing ? 'تعديل البيانات' : 'إضافة كيان جديد'}</h2>
                <button onClick={() => setModal(false)} style={{ background: '#F8FAFC', border: 'none', borderRadius: 50, padding: '0.4rem', cursor: 'pointer', color: '#0F172A' }}><X size={24} /></button>
              </div>

              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div><label style={lbl}>اسم الكيان (الفرع/الموزع) *</label><input style={inp} required value={form.name} onChange={e=>setForm({...form, name: e.target.value})} /></div>
                <div>
                  <label style={lbl}>نوع التشغيل *</label>
                  <select style={{...inp, background: 'transparent'}} value={form.type} onChange={e=>setForm({...form, type: e.target.value as any})}>
                    <option value="Internal">فرع داخلي (Internal Branch)</option>
                    <option value="Distributor">وكيل/موزع (Distributor)</option>
                    <option value="Representative">مندوب مبيعات (Representative)</option>
                    <option value="Warehouse">مستودع (Warehouse)</option>
                  </select>
                </div>
                <div><label style={lbl}>العنوان / التغطية الجغرافية</label><input style={inp} value={form.address} onChange={e=>setForm({...form, address: e.target.value})} /></div>
                
                <button type="submit" disabled={saving} style={{ background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 16, padding: '1.1rem', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', marginTop: '1rem' }}>
                  {saving ? <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} /> : (isEditing ? 'حفظ التغييرات' : 'إضافة للنظام')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transfer Stock Modal */}
      <AnimatePresence>
        {transferModal && selectedBranch && (
          <TransferModal 
            branch={selectedBranch} 
            onClose={() => setTransferModal(false)} 
            onSuccess={load} 
          />
        )}
      </AnimatePresence>

      {/* History Drawer */}
      <AnimatePresence>
        {historyDrawer && selectedBranch && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(8, 12, 20, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }} onClick={() => setHistoryDrawer(false)}>
             <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               style={{ width: '100%', maxWidth: 500, background: '#F8FAFC', height: '100%', padding: '2.5rem', borderLeft: '1px solid rgba(6,182,212,0.2)', boxShadow: '-20px 0 50px rgba(0,0,0,0.5)', overflowY: 'auto' }}
               onClick={e => e.stopPropagation()}
             >
                {(() => {
                  const totalVal = historyOrders.reduce((sum, o) => {
                    const isOut = o.fromLocationType === 'MainWarehouse'
                    return isOut ? sum + (o.totalValue || 0) : sum - (o.totalValue || 0)
                  }, 0)

                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                         <div>
                            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F172A' }}>كشف حركة عُهد</h2>
                            <p style={{ color: '#06B6D4', fontWeight: 800, fontSize: '0.9rem' }}>{selectedBranch.name}</p>
                         </div>
                         <button onClick={() => setHistoryDrawer(false)} style={{ background: '#F8FAFC', border: 'none', borderRadius: 50, padding: '0.5rem', cursor: 'pointer', color: '#0F172A' }}><X size={24} /></button>
                      </div>

                      {/* Financial Banner */}
                      <div style={{ background: '#ECFEFF', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 20, padding: '1.5rem', marginBottom: '2rem' }}>
                         <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.1em' }}>إجمالي قيمة العُهد الحالية</p>
                         <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0F172A' }}>{(totalVal || 0).toLocaleString()} <span style={{ fontSize: '1rem', color: '#06B6D4' }}>EGP</span></h3>
                      </div>

                      <button onClick={handlePrintLedger} style={{ width: '100%', padding: '1.1rem', background: '#F8FAFC', color: '#06B6D4', border: '1px solid #06B6D4', borderRadius: 16, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                         طباعة كشف السلع (Inventory Only)
                      </button>

                      <button onClick={handlePrintMasterStatement} style={{ width: '100%', padding: '1.2rem', background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 20, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '2.5rem', boxShadow: '0 10px 30px rgba(6,182,212,0.3)' }}>
                         🖨️ طباعة كشف اﻟحساب اﻟمجمع (Master Ledger)
                      </button>
                    </>
                  )
                })()}

                {historyLoading ? (
                  <div style={{ padding: '4rem', textAlign: 'center', color: '#06B6D4' }}><Loader2 size={32} className="animate-spin" style={{ margin: '0 auto' }} /></div>
                ) : historyOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.3 }}>
                    <History size={60} style={{ margin: '0 auto 1.5rem' }} />
                    <p style={{ fontWeight: 800 }}>لا يوجد سجل عمليات لهذا الكيان</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                     {historyOrders.map((order, idx) => (
                       <div key={idx} style={{ background: '#F1F5F9', borderRadius: 16, padding: '1.25rem', border: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                             <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#06B6D4', letterSpacing: '0.05em' }}>#{order.orderNumber}</span>
                             <span style={{ fontSize: '0.75rem', color: '#475569' }}>{new Date(order.date).toLocaleDateString('ar-EG')}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                             <div style={{ width: 8, height: 8, borderRadius: '50%', background: order.fromLocationType === 'MainWarehouse' ? '#22C55E' : '#FB923C' }} />
                             <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{order.fromLocationType === 'MainWarehouse' ? 'صرف بضاعة' : 'إرجاع عُهدة'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                             <span style={{ color: '#475569' }}>عدد الأجهزة:</span>
                             <span style={{ fontWeight: 800 }}>{order.items?.length || 0}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '1rem' }}>
                             <span style={{ color: '#475569' }}>قيمة العملية:</span>
                             <span style={{ fontWeight: 900, color: order.fromLocationType === 'MainWarehouse' ? '#22C55E' : '#FB923C' }}>
                               {(order.totalValue || 0).toLocaleString()} EGP
                             </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#475569', fontStyle: 'italic', marginBottom: '1rem' }}>{order.notes}</div>
                          
                          {/* Item Detail List */}
                          <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: 10, fontSize: '0.75rem', color: '#475569', marginBottom: '1rem', border: '1px dashed #F8FAFC' }}>
                             <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                                {(order.items || []).map((unit: any, uIdx: number) => (
                                  <li key={uIdx} style={{ marginBottom: 4 }}>
                                     • {unit.productId?.name} <span style={{ fontFamily: 'monospace', opacity: 0.8, color: '#06B6D4' }}>({unit.serialNumber})</span>
                                  </li>
                                ))}
                             </ul>
                          </div>

                          <button onClick={() => handleReprint(order)} style={{ background: '#ECFEFF', border: '1px solid rgba(6,182,212,0.2)', color: '#06B6D4', width: '100%', padding: '0.5rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                             🖨️ طباعة الإذن (Reprint)
                          </button>
                       </div>
                     ))}
                  </div>
                )}
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .animate-spin { animation: spin 1s linear infinite }
      `}</style>
    </div>
  )
}
