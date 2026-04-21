'use client'

import { useState, useEffect } from 'react'
import { Plus, Briefcase, Search, Loader2, Calendar, DollarSign, Wallet2, CheckCircle2, FileClock, AlertCircle, Trash2, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { connectDB } from '@/lib/db'
import { ShipmentModal } from '@/components/dashboard/ShipmentModal'
import { MagicImportScannerModal } from '@/components/dashboard/MagicImportScannerModal'

type Shipment = {
  _id: string
  shipmentNumber: string
  supplierId: { _id: string; name: string }
  date: string
  currency: 'AED' | 'USD'
  exchangeRate: number
  status: 'Draft' | 'Received' | 'Completed'
  totalForeignCost: number
  totalLandedCostEGP: number
  items: any[]
  expenses: any[]
}

export default function ProcurementPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [suppliers, setSuppliers] = useState<{ _id: string; name: string }[]>([])
  const [products, setProducts] = useState<{ _id: string; name: string }[]>([])
  const [currencies, setCurrencies] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [toast, setToast] = useState<{ msg: string, type: 'ok' | 'err' } | null>(null)
  const [magicOpen, setMagicOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [resShip, resSup, resProd, resSet] = await Promise.all([
        fetch('/api/shipments'),
        fetch('/api/suppliers'),
        fetch('/api/products'),
        fetch('/api/currencies')
      ])
      
      const [dataShip, dataSup, dataProd, dataCur] = await Promise.all([
        resShip.json(), resSup.json(), resProd.json(), resSet.json()
      ])

      setShipments(dataShip.shipments || [])
      setSuppliers(dataSup.suppliers || [])
      setProducts(dataProd.products || [])
      setCurrencies(dataCur.currencies || [])
    } catch (err) {
      showToast('فشل تحميل بيانات المشتريات', 'err')
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSaveShipment = async (formData: any) => {
    const isEditing = !!formData._id
    const method = isEditing ? 'PUT' : 'POST'
    
    // For PUT, the body expects { id, status, ...updates }
    const body = isEditing ? { id: formData._id, ...formData } : formData

    try {
      const res = await fetch('/api/shipments', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'فشل الحفظ')
      
      showToast(formData.status === 'Received' ? 'تم استلام الرسالة وإنشاء المخزون بنجاح ✓' : 'تم حفظ المسودة بنجاح', 'ok')
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      showToast(err.message, 'err')
      throw err
    }
  }

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [shipmentToDelete, setShipmentToDelete] = useState<{id: string, number: string} | null>(null)

  async function handleDeleteShipment(id: string, number: string) {
    setShipmentToDelete({ id, number })
    setDeleteModalOpen(true)
  }

  async function confirmDelete() {
    if (!shipmentToDelete) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/shipments/${shipmentToDelete.id}`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'فشل الحذف')

      showToast('تم حذف الرسالة وتنظيف المخزون بنجاح ✓', 'ok')
      setDeleteModalOpen(false)
      setShipmentToDelete(null)
      fetchData()
    } catch (err: any) {
      showToast(err.message, 'err')
    } finally {
      setLoading(false)
    }
  }

  function handleMagicComplete(extracted: any) {
    // We Map the extracted data into a shape that ShipmentModal can accept as "initialData"
    const prefilledShipment = {
      shipmentNumber: extracted.shipmentNumber,
      supplierId: extracted.supplierId,
      currency: extracted.currency,
      exchangeRate: extracted.exchangeRate,
      date: extracted.date || new Date().toISOString().split('T')[0],
      status: 'Draft',
      items: extracted.items.map((it: any) => ({
        productId: it.productId,
        quantity: it.quantity,
        unitCostForeign: it.unitCostForeign
      })),
      expenses: extracted.expenses || [{ type: 'Shipping', amountEGP: 0 }]
    }

    setSelectedShipment(prefilledShipment as any)
    setMagicOpen(false)
    setModalOpen(true)
    showToast('تم استخراج بيانات الشحنة وتوزيع التكاليف بنجاح ✨', 'ok')
  }

  const filtered = shipments.filter(s => {
    const matchesSearch = s.shipmentNumber.toLowerCase().includes(search.toLowerCase()) || 
                          s.supplierId?.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem', color: '#06B6D4' }}>
      <Loader2 size={48} className="animate-spin" />
      <p style={{ fontWeight: 800 }}>جاري تحميل cockpit المشتريات...</p>
    </div>
  )

  const card = { background: 'rgba(6,182,212,0.03)', borderRadius: 18, border: '1px solid rgba(6,182,212,0.15)', padding: '1.5rem' }
  const th = { padding: '1.2rem 1rem', textAlign: 'right', fontWeight: 800, color: '#94A3B8', fontSize: '0.75rem', borderBottom: '1px solid rgba(6,182,212,0.1)' }
  const td = { padding: '1.2rem 1rem', verticalAlign: 'middle', borderBottom: '1px solid rgba(255,255,255,0.04)' }

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1100, background: toast.type === 'ok' ? '#06B6D4' : '#EF4444', color: '#fff', padding: '0.7rem 1.6rem', borderRadius: 50, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'float-in 0.3s' }}>
          {toast.msg}
        </div>
      )}

      {/* Header Container */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
             <div style={{ background: 'rgba(6,182,212,0.1)', padding: '0.6rem', borderRadius: 12 }}><Briefcase color="#06B6D4" size={24} /></div>
             <h1 style={{ fontSize: '2.2rem', fontWeight: 950, letterSpacing: '-0.02em' }}>إدارة الرسائل الاستيرادية</h1>
          </div>
          <p style={{ color: '#64748B', fontWeight: 500 }}>لوحة متابعة المشتريات الدولية وتكاليف الاستيراد (Procurement Control Room)</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => setMagicOpen(true)}
            style={{ padding: '0.85rem 1.5rem', background: 'rgba(168,85,247,0.1)', color: '#A855F7', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 14, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 10px 20px -5px rgba(168, 85, 247, 0.2)' }}
          >
            <Sparkles size={18} /> ✨ مسح بوليصة/فاتورة شحن
          </button>
          
          <button 
            onClick={() => { setSelectedShipment(null); setModalOpen(true) }}
            style={{ padding: '0.85rem 1.75rem', background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)', borderRadius: 14, color: '#fff', fontWeight: 900, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 10px 20px -5px rgba(6, 182, 212, 0.4)' }}
          >
            <Plus size={20} strokeWidth={3} /> إضافة رسالة استيرادية
          </button>
        </div>
      </div>

      {/* Stats Quick Look */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
         {[
           { label: 'إجمالي المشحونات', value: shipments.length, icon: Briefcase, color: '#06B6D4' },
           { label: 'بانتظار الاستلام', value: shipments.filter(s => s.status === 'Draft').length, icon: FileClock, color: '#F59E0B' },
           { label: 'رسائل مستلمة', value: shipments.filter(s => s.status === 'Received').length, icon: CheckCircle2, color: '#10B981' },
           { label: 'إجمالي القيمة (EGP)', value: shipments.reduce((sum, s) => sum + s.totalLandedCostEGP, 0).toLocaleString(), icon: Wallet2, color: '#fff' }
         ].map((stat, i) => (
           <div key={i} style={{ ...card, display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: `${stat.color}15`, padding: '0.8rem', borderRadius: 14 }}><stat.icon color={stat.color} size={22} /></div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700, marginBottom: '0.15rem' }}>{stat.label}</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 900 }}>{stat.value}</p>
              </div>
           </div>
         ))}
      </div>

      {/* Filters & Search */}
      <div style={{ ...card, display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', padding: '1.25rem' }}>
         <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} color="#64748B" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="البحث برقم الرسالة أو المورد..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(6,182,212,0.1)', borderRadius: 12, padding: '0.75rem 2.8rem 0.75rem 1rem', color: '#fff', outline: 'none' }} 
            />
         </div>
         <select 
           value={statusFilter} 
           onChange={e => setStatusFilter(e.target.value)} 
           style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(6,182,212,0.1)', borderRadius: 12, padding: '0.75rem 1rem', color: '#fff', minWidth: 150 }}
         >
           <option value="All">كل الحالات</option>
           <option value="Draft">مسودة (Draft)</option>
           <option value="Received">تم الاستلام (Received)</option>
           <option value="Completed">مكتمل (Completed)</option>
         </select>
      </div>

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(6,182,212,0.05)' }}>
              {['رقم الرسالة', 'المورد', 'التاريخ', 'العملة وسعر الصرف', 'إجمالي أجنبي', 'التكلفة الإجمالية (ج.م)', 'الحالة', 'الإجراءات'].map(h => <th key={h} style={th as any}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s._id} style={{ transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,182,212,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={td as any} onDoubleClick={() => { setSelectedShipment(s); setModalOpen(true) }}>
                   <div style={{ fontWeight: 900, color: '#fff' }}>{s.shipmentNumber}</div>
                   <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{s._id.slice(-6)}</div>
                </td>
                <td style={td as any}>{s.supplierId?.name || 'مورد مجهول'}</td>
                <td style={td as any}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600 }}>
                      <Calendar size={14} />
                      {new Date(s.date).toLocaleDateString('ar-EG')}
                   </div>
                </td>
                <td style={td as any}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ background: s.currency === 'USD' ? 'rgba(34,197,94,0.1)' : 'rgba(6,182,212,0.1)', color: s.currency === 'USD' ? '#22C55E' : '#06B6D4', padding: '0.2rem 0.5rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 900 }}>{s.currency}</span>
                      <span style={{ fontWeight: 800, color: '#64748B' }}>{s.exchangeRate.toFixed(3)}</span>
                   </div>
                </td>
                <td style={td as any}>
                   <div style={{ fontWeight: 900, direction: 'ltr' }}>{s.totalForeignCost.toLocaleString()} <span style={{ color: '#64748B', fontWeight: 500, fontSize: '0.7rem' }}>{s.currency}</span></div>
                </td>
                <td style={td as any}>
                   <div style={{ fontWeight: 950, color: '#06B6D4', direction: 'ltr', fontSize: '1.05rem' }}>{s.totalLandedCostEGP.toLocaleString()} <span style={{ color: 'rgba(6,182,212,0.5)', fontWeight: 500, fontSize: '0.7rem' }}>ج.م</span></div>
                </td>
                <td style={td as any}>
                   <span style={{ 
                     padding: '0.4rem 0.8rem', borderRadius: 10, fontSize: '0.75rem', fontWeight: 900,
                     background: s.status === 'Received' ? 'rgba(6,182,212,0.1)' : s.status === 'Completed' ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
                     color: s.status === 'Received' ? '#06B6D4' : s.status === 'Completed' ? '#10B981' : '#94A3B8',
                     border: `1px solid ${s.status === 'Received' ? 'rgba(6,182,212,0.2)' : s.status === 'Completed' ? 'rgba(16,185,129,0.2)' : 'rgba(148,163,184,0.2)'}`
                   }}>
                     {s.status === 'Received' ? 'تم الاستلام' : s.status === 'Completed' ? 'مكتمل' : 'مسودة'}
                   </span>
                </td>
                <td style={td as any}>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => { setSelectedShipment(s); setModalOpen(true) }} style={{ background: 'rgba(6,182,212,0.1)', border: 'none', color: '#06B6D4', padding: '0.5rem 0.8rem', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>فتح</button>
                      <button onClick={() => handleDeleteShipment(s._id, s.shipmentNumber)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '0.5rem', borderRadius: 10, cursor: 'pointer' }}><Trash2 size={18} /></button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ShipmentModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSave={handleSaveShipment}
        suppliers={suppliers}
        products={products}
        initialData={selectedShipment}
        currencies={currencies}
      />

      <AnimatePresence>
        {magicOpen && (
          <MagicImportScannerModal 
            onClose={() => setMagicOpen(false)}
            onComplete={handleMagicComplete}
            suppliers={suppliers}
            products={products}
            currencies={currencies}
          />
        )}
      </AnimatePresence>

      {/* Luxury Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 8, 15, 0.95)', backdropFilter: 'blur(10px)', padding: '1.5rem' }}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{ background: '#0B1120', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 24, width: '100%', maxWidth: '450px', padding: '2.5rem', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }}
            >
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '80px', height: '80px', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <AlertCircle size={40} color="#EF4444" />
              </div>
              
              <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#fff', marginBottom: '1rem' }}>تأكيد الحذف النهائي</h3>
              
              <p style={{ color: '#94A3B8', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                هل أنت متأكد من حذف الرسالة رقم <span style={{ color: '#fff', fontWeight: 900 }}>({shipmentToDelete?.number})</span>؟ 
                <br />
                <span style={{ color: '#EF4444', fontWeight: 700 }}>سيتم حذف كافة كروت المخزون المرتبطة بها نهائياً.</span> لا يمكن التراجع عن هذا الإجراء.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  onClick={() => { setDeleteModalOpen(false); setShipmentToDelete(null) }}
                  style={{ flex: 1, padding: '0.85rem', borderRadius: 14, border: '1px solid #334155', background: 'transparent', color: '#94A3B8', fontWeight: 700, cursor: 'pointer' }}
                >
                  إلغاء التراجع
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={loading}
                  style={{ flex: 1.5, padding: '0.85rem', borderRadius: 14, border: 'none', background: '#EF4444', color: '#fff', fontWeight: 950, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.4)' }}
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 'حذف نهائي (Execute)'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <style>{`
        @keyframes float-in { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes spin { from {transform:rotate(0deg)} to {transform:rotate(360deg)} } .animate-spin { animation: spin 1s linear infinite }
      `}</style>
    </div>
  )
}

