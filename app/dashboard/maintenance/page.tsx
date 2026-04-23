'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Wrench, Smartphone, User, Phone, CheckCircle, Clock, Truck, FileText, Printer, PackagePlus, Loader2, X, Globe, Camera, MessageCircle, Trash2 } from 'lucide-react'

type StatusType = 'Pending' | 'Diagnosing' | 'In Repair' | 'Ready for Pickup' | 'Delivered'

interface SparePart {
  _id?: string
  product: any
  quantity: number
  price: number
}

interface RepairTicket {
  _id: string
  customerName: string
  phoneNumber: string
  deviceModel: string
  imeiPasscode: string
  issueDescription: string
  estimatedCost: number
  deposit: number
  status: StatusType
  spareParts: SparePart[]
  externalParts?: { name: string; cost: number }[]
  outsourcedRepairCost?: number
  laborMargin?: number
  createdAt: string
  updatedAt: string
}

const statusMap: Record<StatusType, { label: string, color: string, icon: any }> = {
  'Pending': { label: 'قيد الانتظار', color: '#F59E0B', icon: Clock },
  'Diagnosing': { label: 'فحص وتشخيص', color: '#8B5CF6', icon: Search },
  'In Repair': { label: 'قيد الإصلاح', color: '#3B82F6', icon: Wrench },
  'Ready for Pickup': { label: 'جاهز للاستلام', color: '#10B981', icon: CheckCircle },
  'Delivered': { label: 'تم التسليم', color: '#475569', icon: Truck },
}

export default function MaintenancePage() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'online'>('kanban')
  const [tickets, setTickets] = useState<RepairTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [onlineRequests, setOnlineRequests] = useState<any[]>([])
  const [onlineLoading, setOnlineLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  const [viewPhoto, setViewPhoto] = useState<string | null>(null)
  const [reqQuote, setReqQuote] = useState('')
  const [reqSaving, setReqSaving] = useState(false)
  const [reqToast, setReqToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentTicket, setCurrentTicket] = useState<Partial<RepairTicket> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Products for Spare Parts
  const [products, setProducts] = useState<any[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProductQty, setSelectedProductQty] = useState(1)
  const [addingPart, setAddingPart] = useState(false)
  
  const [costTab, setCostTab] = useState<'inventory' | 'external' | 'outsourced' | 'labor'>('inventory')
  const [extPartName, setExtPartName] = useState('')
  const [extPartCost, setExtPartCost] = useState(0)

  // System Settings for Receipt
  const [storeSettings, setStoreSettings] = useState<any>(null)

  useEffect(() => {
    fetchData()
    fetchProducts()
    fetchSettings()
    fetchOnlineRequests()
  }, [])

  useEffect(() => {
    if (isModalOpen && currentTicket) {
      const spSum = (currentTicket.spareParts || []).reduce((sum, sp) => sum + (sp.price * sp.quantity), 0)
      const epSum = (currentTicket.externalParts || []).reduce((sum, ep) => sum + ep.cost, 0)
      const outSum = currentTicket.outsourcedRepairCost || 0
      const laborSum = currentTicket.laborMargin || 0
      const total = spSum + epSum + outSum + laborSum
      if (currentTicket.estimatedCost !== total) {
        setCurrentTicket(prev => prev ? { ...prev, estimatedCost: total } : prev)
      }
    }
  }, [
    currentTicket?.spareParts,
    currentTicket?.externalParts,
    currentTicket?.outsourcedRepairCost,
    currentTicket?.laborMargin,
    currentTicket?.status,
    isModalOpen
  ])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/maintenance')
      const data = await res.json()
      if (data.tickets) setTickets(data.tickets)
    } finally {
      setLoading(false)
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      if (data.products) setProducts(data.products)
    } catch {}
  }
  
  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (data) setStoreSettings(data)
    } catch {}
  }

  async function fetchOnlineRequests() {
    setOnlineLoading(true)
    try {
      const res = await fetch('/api/repair-requests')
      const data = await res.json()
      if (data.requests) setOnlineRequests(data.requests)
    } catch {} finally { setOnlineLoading(false) }
  }

  async function updateOnlineRequest(id: string, patch: any) {
    setReqSaving(true)
    try {
      const res = await fetch(`/api/repair-requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setOnlineRequests(prev => prev.map(r => r._id === id ? { ...r, ...patch } : r))
      if (selectedRequest?._id === id) setSelectedRequest((prev: any) => prev ? { ...prev, ...patch } : prev)
      setReqToast({ msg: 'تم التحديث', type: 'ok' })
      setTimeout(() => setReqToast(null), 2500)
    } catch (err: any) {
      setReqToast({ msg: err.message, type: 'err' })
      setTimeout(() => setReqToast(null), 3000)
    } finally { setReqSaving(false) }
  }

  async function deleteOnlineRequest(id: string) {
    if (!confirm('حذف هذا الطلب؟')) return
    await fetch(`/api/repair-requests/${id}`, { method: 'DELETE' })
    setOnlineRequests(prev => prev.filter(r => r._id !== id))
    setSelectedRequest(null)
  }

  async function handleSaveTicket(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      const isNew = !currentTicket?._id
      const method = isNew ? 'POST' : 'PUT'
      const url = isNew ? '/api/maintenance' : `/api/maintenance/${currentTicket._id}`
      
      const payload = {
        ...currentTicket,
        estimatedCost: Number(currentTicket?.estimatedCost || 0),
        deposit: Number(currentTicket?.deposit || 0)
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.success) {
        if (isNew) {
          setTickets([data.ticket, ...tickets])
        } else {
          setTickets(tickets.map(t => t._id === data.ticket._id ? data.ticket : t))
        }
        setIsModalOpen(false)
      } else {
        alert(data.error || 'Failed to save ticket')
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAddPart() {
    if (!currentTicket || !selectedProductId) return
    const product = products.find(p => p._id === selectedProductId)
    if (!product) return

    const price = product.retailPrice || product.price || 0
    const newPart = { product: product, quantity: selectedProductQty, price }
    
    setCurrentTicket(prev => prev ? {
      ...prev,
      spareParts: [...(prev.spareParts || []), newPart]
    } : prev)
    
    setSelectedProductId('')
    setSelectedProductQty(1)
  }

  function handlePrintReceipt(ticket: RepairTicket) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <html dir="rtl">
        <head>
          <title>إيصال استلام صيانة</title>
          <style>
            body { font-family: 'Tajawal', sans-serif; margin: 0; padding: 20px; color: #000; background: #fff; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { margin: 0 0 10px 0; font-size: 24px; }
            .header img { max-height: 80px; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .row div { font-size: 16px; }
            .ticket-id { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 20px; background: #f0f0f0; padding: 10px; border-radius: 8px; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; font-size: 18px; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
            th { background: #f9f9f9; }
            .footer { text-align: center; font-size: 14px; margin-top: 40px; border-top: 2px dashed #000; padding-top: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            ${storeSettings?.storeLogoUrl ? `<img src="${storeSettings.storeLogoUrl}" alt="Logo"/>` : ''}
            <h1>${storeSettings?.storeName || 'مركز الصيانة'} - إيصال استلام</h1>
            <div>رقم الاتصال: ${storeSettings?.whatsappNumber || ''}</div>
          </div>
          
          <div class="ticket-id">تذكرة صيانة #${ticket._id.slice(-6).toUpperCase()}</div>
          
          <div class="row">
            <div><strong>تاريخ الاستلام:</strong> ${new Date(ticket.createdAt).toLocaleString('ar-EG')}</div>
            <div><strong>حالة الطلب:</strong> ${statusMap[ticket.status].label}</div>
          </div>

          <div class="section">
            <div class="section-title">بيانات العميل</div>
            <div class="row">
              <div><strong>الاسم:</strong> ${ticket.customerName}</div>
              <div><strong>رقم الجوال:</strong> ${ticket.phoneNumber}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">بيانات الجهاز</div>
            <div class="row">
              <div><strong>الموديل:</strong> ${ticket.deviceModel}</div>
              <div><strong>الرقم التسلسلي / الرمز:</strong> ${ticket.imeiPasscode}</div>
            </div>
            <div style="margin-top: 10px;">
              <strong>وصف العطل:</strong><br/>
              ${ticket.issueDescription}
            </div>
          </div>

          <div class="section">
            <div class="section-title">التكاليف المقدرة</div>
            <div class="row">
              <div><strong>التكلفة التقديرية للإصلاح:</strong> ${ticket.estimatedCost} ج.م</div>
              <div><strong>العربون المدفوع:</strong> ${ticket.deposit} ج.م</div>
            </div>
          </div>

          ${ticket.spareParts && ticket.spareParts.length > 0 ? `
            <div class="section">
              <div class="section-title">قطع الغيار المستخدمة</div>
              <table>
                <tr><th>القطعة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
                ${ticket.spareParts.map((p: any) => `
                  <tr>
                    <td>${p.product.name}</td>
                    <td>${p.quantity}</td>
                    <td>${p.price} ج.م</td>
                    <td>${p.price * p.quantity} ج.م</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          ` : ''}

          <div class="footer">
            <p>يرجى الاحتفاظ بهذا الإيصال لاستلام جهازك.</p>
            <p>شكراً لثقتكم بنا!</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const filteredTickets = tickets.filter(t => 
    search === '' || 
    t.customerName.toLowerCase().includes(search.toLowerCase()) ||
    t.phoneNumber.includes(search) ||
    t.deviceModel.toLowerCase().includes(search.toLowerCase()) ||
    t._id.includes(search)
  )

  const columns: StatusType[] = ['Pending', 'Diagnosing', 'In Repair', 'Ready for Pickup', 'Delivered']

  return (
    <div style={{ padding: '0', color: '#1E293B' }}>
      {/* ─ Online Requests Toast ─ */}
      <AnimatePresence>
        {reqToast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: reqToast.type === 'ok' ? '#22C55E' : '#EF4444', color: '#0F172A', padding: '0.75rem 2rem', borderRadius: 50, fontWeight: 800, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
            {reqToast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0F172A', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Wrench color="#06B6D4" size={32} /> مركز الصيانة
          </h1>
          <p style={{ color: '#475569', fontSize: '0.95rem' }}>أدر طلبات الإصلاح وصيانة الأجهزة من هنا.</p>
        </div>
        {activeTab === 'kanban' && (
          <button
            onClick={() => {
              setCurrentTicket({ status: 'Pending', customerName: '', phoneNumber: '', deviceModel: '', imeiPasscode: '', issueDescription: '', estimatedCost: 0, deposit: 0 })
              setIsModalOpen(true)
            }}
            style={{ background: 'linear-gradient(90deg, #06B6D4 0%, #3B82F6 100%)', color: '#0F172A', border: 'none', borderRadius: 14, padding: '0.9rem 1.6rem', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 10px 25px rgba(6,182,212,0.3)' }}
          >
            <Plus size={20} strokeWidth={2.5} /> استلام جهاز جديد
          </button>
        )}
      </div>

      {/* ─ Tabs ─ */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: '#F1F5F9', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '0.4rem', width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('kanban')}
          style={{ padding: '0.6rem 1.5rem', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 800, fontFamily: 'inherit', fontSize: '0.9rem', transition: 'all 0.2s', background: activeTab === 'kanban' ? '#06B6D4' : 'transparent', color: activeTab === 'kanban' ? '#fff' : '#64748B' }}
        >
          <Wrench size={16} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 6 }} />
          تذاكر الصيانة
        </button>
        <button
          onClick={() => setActiveTab('online')}
          style={{ padding: '0.6rem 1.5rem', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 800, fontFamily: 'inherit', fontSize: '0.9rem', transition: 'all 0.2s', background: activeTab === 'online' ? '#10B981' : 'transparent', color: activeTab === 'online' ? '#fff' : '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Globe size={16} />
          طلبات التسعير الأونلاين
          {onlineRequests.filter(r => r.status === 'New').length > 0 && (
            <span style={{ background: '#EF4444', color: '#0F172A', borderRadius: 50, padding: '0.1rem 0.5rem', fontSize: '0.72rem', fontWeight: 900, marginRight: 4 }}>{onlineRequests.filter(r => r.status === 'New').length}</span>
          )}
        </button>
      </div>

      {/* ─ Search Bar (Kanban only) ─ */}
      {activeTab === 'kanban' && (
        <div style={{ marginBottom: '2rem', position: 'relative', width: '100%', maxWidth: '500px' }}>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم الجوال، اسم العميل، او الجهاز..."
            style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 14, color: '#0F172A', fontSize: '1rem', outline: 'none', transition: 'all 0.3s' }}
            onFocus={e => e.currentTarget.style.borderColor = '#06B6D4'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <Search size={20} color="#64748B" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      )}

      {activeTab === 'kanban' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#475569' }}>
            <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            جاري تحميل التذاكر...
          </div>
        ) : (
          /* Kanban Board */
          <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem', minHeight: '600px' }}>
            {columns.map(status => {
            const colTickets = filteredTickets.filter(t => t.status === status)
            const st = statusMap[status]
            const Icon = st.icon
            return (
              <div key={status} style={{ flex: '0 0 320px', background: 'rgba(15,23,42,0.6)', borderRadius: 20, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', height: 'fit-content', maxHeight: '100%' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(15,23,42,0.95)', borderTopLeftRadius: 20, borderTopRightRadius: 20, backdropFilter: 'blur(10px)', zIndex: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: st.color, boxShadow: `0 0 10px ${st.color}` }} />
                    <h2 style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>{st.label}</h2>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', background: '#F8FAFC', padding: '0.2rem 0.6rem', borderRadius: 20 }}>{colTickets.length}</span>
                </div>

                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
                  {colTickets.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.85rem', padding: '2rem 0' }}>لا يوجد طلبات</div>
                  ) : (
                    <AnimatePresence>
                      {colTickets.map(ticket => (
                        <motion.div
                          layoutId={ticket._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={ticket._id}
                          onClick={() => { setCurrentTicket(ticket); setIsModalOpen(true); }}
                          style={{
                            background: '#1E293B',
                            borderRadius: 16,
                            padding: '1.25rem',
                            border: '1px solid #F1F5F9',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = st.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#F1F5F9'; e.currentTarget.style.transform = 'translateY(0)' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                            <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700, letterSpacing: '0.05em' }}>#{ticket._id.slice(-6).toUpperCase()}</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: st.color }}>{ticket.estimatedCost} ج.م</span>
                          </div>
                          <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Smartphone size={16} color="#94A3B8" /> {ticket.deviceModel}
                          </h3>
                          <p style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
                            <User size={14} /> {ticket.customerName}
                          </p>
                          <div style={{ margin: '0 -1.25rem', padding: '1rem 1.25rem 0', borderTop: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <span style={{ fontSize: '0.75rem', color: '#475569' }}>{new Date(ticket.createdAt).toLocaleDateString('ar-EG')}</span>
                             {ticket.spareParts && ticket.spareParts.length > 0 && (
                                <span style={{ fontSize: '0.75rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}>
                                  <PackagePlus size={14} /> {ticket.spareParts.length} قطع
                                </span>
                             )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        )
      )}

      {/* ─ Online Quote Requests Tab ─ */}
      {activeTab === 'online' && (
        <div>
          {onlineLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#475569' }}><Loader2 size={40} className="animate-spin" style={{ margin: '0 auto' }} /></div>
          ) : onlineRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '6rem', background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: 24 }}>
              <Globe size={64} color="rgba(16,185,129,0.2)" style={{ margin: '0 auto 1.5rem' }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>لا توجد طلبات تسعير بعد</h3>
              <p style={{ color: '#475569' }}>ستظهر هنا طلبات التسعير القادمة من الموقع فور وصولها</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.5rem' }}>
              {onlineRequests.map(req => {
                const stCfg = ({ New: { label: 'جديد', color: '#06B6D4', bg: 'rgba(6,182,212,0.1)' }, Quoted: { label: 'تم التسعير', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' }, Rejected: { label: 'مرفوض', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' }, Converted: { label: 'تحول لتذكرة', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' } } as any)[req.status] || { label: req.status, color: '#475569', bg: 'transparent' }
                return (
                  <motion.div key={req._id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    style={{ background: '#F8FAFC', borderRadius: 20, border: `1px solid ${stCfg.color}40`, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    onClick={() => { setSelectedRequest(req); setReqQuote(req.quote ? String(req.quote) : '') }}
                  >
                    {req.photos?.length > 0 && (
                      <div style={{ display: 'flex', height: 110, overflow: 'hidden' }}>
                        {req.photos.slice(0, 3).map((url: string, i: number) => (
                          <img key={i} src={url} style={{ flex: 1, objectFit: 'cover', borderLeft: i > 0 ? '2px solid #0B1120' : 'none' }} />
                        ))}
                      </div>
                    )}
                    <div style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ background: stCfg.bg, color: stCfg.color, padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800 }}>{stCfg.label}</span>
                        <span style={{ fontSize: '0.72rem', color: '#475569' }}>{new Date(req.createdAt).toLocaleDateString('ar-EG')}</span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A', marginBottom: '0.3rem' }}>{req.deviceModel}</h3>
                      <span style={{ background: '#F8FAFC', color: '#475569', padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.75rem', display: 'inline-block', marginBottom: '0.5rem' }}>{req.issueCategory}</span>
                      <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, marginBottom: '0.75rem' }}>{req.issueDescription?.slice(0, 80)}{req.issueDescription?.length > 80 ? '...' : ''}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 700 }}>{req.customerName}</span>
                        <a href={`https://wa.me/2${req.whatsapp}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', background: '#22C55E', borderRadius: 8, color: '#0F172A', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 800 }}>
                          <MessageCircle size={14} /> واتساب
                        </a>
                      </div>
                      {req.quote && <div style={{ marginTop: '0.6rem', padding: '0.4rem 0.75rem', background: 'rgba(34,197,94,0.08)', borderRadius: 8, color: '#22C55E', fontWeight: 900, fontSize: '0.9rem' }}>التسعير: {req.quote.toLocaleString('ar-EG')} ج.م</div>}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Online Request Detail Modal */}
          <AnimatePresence>
            {selectedRequest && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedRequest(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }} />
                <motion.div initial={{ opacity: 0, scale: 0.92, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 30 }}
                  style={{ position: 'relative', zIndex: 2, background: '#F1F5F9', borderRadius: 28, width: '100%', maxWidth: 540, border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 40px 100px rgba(0,0,0,0.6)', maxHeight: '92vh', overflowY: 'auto' }}>
                  <div style={{ padding: '2rem 2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', color: '#10B981', textTransform: 'uppercase', marginBottom: '0.3rem' }}>طلب تسعير أونلاين</p>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A' }}>{selectedRequest.deviceModel}</h2>
                      <p style={{ color: '#475569', fontSize: '0.85rem' }}>{selectedRequest.issueCategory} — {selectedRequest.customerName}</p>
                    </div>
                    <button onClick={() => setSelectedRequest(null)} style={{ background: '#F8FAFC', border: 'none', borderRadius: 50, padding: '0.5rem', cursor: 'pointer', color: '#475569' }}><X size={20} /></button>
                  </div>
                  <div style={{ padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {selectedRequest.photos?.length > 0 && (
                      <div>
                        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: '0.75rem' }}>صور العطل</p>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {selectedRequest.photos.map((url: string, i: number) => (
                            <img key={i} src={url} onClick={() => setViewPhoto(url)}
                              style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 14, cursor: 'zoom-in', border: '2px solid rgba(16,185,129,0.2)' }} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ background: '#F1F5F9', borderRadius: 14, padding: '1rem 1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '0.5rem', fontWeight: 700 }}>وصف المشكلة</p>
                      <p style={{ color: '#0F172A', lineHeight: 1.7 }}>{selectedRequest.issueDescription}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(['New', 'Quoted', 'Rejected', 'Converted'] as const).map(s => {
                        const cfg = ({ New: { label: 'جديد', color: '#06B6D4' }, Quoted: { label: 'تم التسعير', color: '#F59E0B' }, Rejected: { label: 'مرفوض', color: '#EF4444' }, Converted: { label: 'تحول لتذكرة', color: '#22C55E' } } as any)[s]
                        const isActive = selectedRequest.status === s
                        return (
                          <button key={s} onClick={() => updateOnlineRequest(selectedRequest._id, { status: s })}
                            style={{ padding: '0.5rem 1rem', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: '0.85rem', background: isActive ? `${cfg.color}18` : 'transparent', border: `1px solid ${isActive ? cfg.color : '#F1F5F9'}`, color: isActive ? cfg.color : '#64748B' }}>
                            {cfg.label}
                          </button>
                        )
                      })}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem' }}>التسعير المقترح (ج.م)</p>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <input type="number" value={reqQuote} onChange={e => setReqQuote(e.target.value)} placeholder="0" style={{ flex: 1, background: '#111827', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '0.75rem 1rem', color: '#0F172A', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit' }} />
                        <button onClick={() => updateOnlineRequest(selectedRequest._id, { quote: Number(reqQuote), status: 'Quoted' })} disabled={reqSaving || !reqQuote} style={{ padding: '0.75rem 1.25rem', background: '#F59E0B', border: 'none', borderRadius: 12, color: '#0F172A', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>تأكيد السعر</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <a href={`https://wa.me/2${selectedRequest.whatsapp}?text=${encodeURIComponent(`مرحباً ${selectedRequest.customerName}، بخصوص تسعير صيانة ${selectedRequest.deviceModel}${reqQuote ? `، التكلفة المقدرة: ${reqQuote} ج.م` : '، سنوافيك بالتسعير قريباً.'}`)}`} target="_blank" rel="noreferrer"
                        style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.9rem', background: '#22C55E', borderRadius: 14, color: '#0F172A', fontWeight: 800, textDecoration: 'none', fontSize: '0.9rem' }}>
                        <MessageCircle size={18} /> تواصل عبر واتساب
                      </a>
                      <button onClick={() => deleteOnlineRequest(selectedRequest._id)} style={{ padding: '0.9rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, color: '#EF4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                      <button onClick={() => {
                        setActiveTab('kanban')
                        setCurrentTicket({ status: 'Pending', customerName: selectedRequest.customerName, phoneNumber: selectedRequest.whatsapp, deviceModel: selectedRequest.deviceModel, imeiPasscode: '', issueDescription: selectedRequest.issueDescription, estimatedCost: selectedRequest.quote || 0, deposit: 0 })
                        setSelectedRequest(null)
                        setIsModalOpen(true)
                      }} style={{ padding: '0.9rem 1.25rem', background: '#ECFEFF', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 14, color: '#06B6D4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                        <Wrench size={18} /> تحويل إلى تذكرة
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Full Screen Photo Viewer */}
          <AnimatePresence>
            {viewPhoto && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewPhoto(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.95)' }} />
                <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} src={viewPhoto} style={{ position: 'relative', zIndex: 2, maxWidth: '90vw', maxHeight: '90vh', borderRadius: 20, objectFit: 'contain' }} />
                <button onClick={() => setViewPhoto(null)} style={{ position: 'absolute', top: 24, left: 24, zIndex: 3, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 50, padding: '0.75rem', cursor: 'pointer', color: '#0F172A' }}><X size={24} /></button>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Modal View/Edit */}
      <AnimatePresence>
        {isModalOpen && currentTicket && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(5,8,15,0.85)', backdropFilter: 'blur(8px)' }} onClick={() => setIsModalOpen(false)} />
            
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ background: '#F1F5F9', borderRadius: 24, width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', zIndex: 10, border: '1px solid #E2E8F0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            >
              <div style={{ position: 'sticky', top: 0, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', padding: '1.5rem 2rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20 }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {currentTicket._id ? `تذكرة #${currentTicket._id.slice(-6).toUpperCase()}` : 'تذكرة استلام جديدة'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {currentTicket._id && (
                    <button onClick={() => handlePrintReceipt(currentTicket as RepairTicket)} style={{ background: '#ECFEFF', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.2)', padding: '0.6rem 1rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, cursor: 'pointer' }}>
                      <Printer size={16} /> طباعة إيصال
                    </button>
                  )}
                  <button onClick={() => setIsModalOpen(false)} style={{ background: '#F8FAFC', border: 'none', color: '#475569', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
                </div>
              </div>

              <div style={{ padding: '2rem' }}>
                <form id="ticket-form" onSubmit={handleSaveTicket} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  
                  {/* Status */}
                  <div style={{ gridColumn: '1 / -1', background: '#ECFEFF', padding: '1.5rem', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                    <label style={{ display: 'block', marginBottom: '0.8rem', fontSize: '0.9rem', fontWeight: 800, color: '#06B6D4' }}>حالة التذكرة</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                      {columns.map(status => {
                        const st = statusMap[status]
                        const isActive = currentTicket.status === status
                        return (
                          <div key={status} onClick={() => setCurrentTicket({...currentTicket, status})}
                            style={{ padding: '0.8rem 1.2rem', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: isActive ? 800 : 600, border: `1px solid ${isActive ? st.color : '#F8FAFC'}`, background: isActive ? `rgba(${st.color === '#F59E0B'?'245,158,11':st.color==='#8B5CF6'?'139,92,246':st.color==='#3B82F6'?'59,130,246':st.color==='#10B981'?'16,185,129':'100,116,139'}, 0.1)` : 'transparent', color: isActive ? st.color : '#94A3B8', transition: 'all 0.2s' }}
                          >
                            <st.icon size={18} /> {st.label}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>اسم العميل</label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} color="#64748B" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                      <input required type="text" value={currentTicket.customerName} onChange={e => setCurrentTicket({...currentTicket, customerName: e.target.value})} style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 3rem', background: '#1E293B', border: '1px solid #E2E8F0', borderRadius: 12, color: '#0F172A', fontSize: '1rem', outline: 'none' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>رقم الجوال</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={18} color="#64748B" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                      <input required type="text" value={currentTicket.phoneNumber} onChange={e => setCurrentTicket({...currentTicket, phoneNumber: e.target.value})} style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 3rem', background: '#1E293B', border: '1px solid #E2E8F0', borderRadius: 12, color: '#0F172A', fontSize: '1rem', outline: 'none', direction: 'ltr', textAlign: 'right' }} />
                    </div>
                  </div>

                  {/* Device Info */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>موديل الجهاز</label>
                    <input required type="text" value={currentTicket.deviceModel} onChange={e => setCurrentTicket({...currentTicket, deviceModel: e.target.value})} placeholder="مثال: iPhone 13 Pro Max" style={{ width: '100%', padding: '0.9rem', background: '#1E293B', border: '1px solid #E2E8F0', borderRadius: 12, color: '#0F172A', fontSize: '1rem', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>الرقم التسلسلي / رمز الدخول</label>
                    <input required type="text" value={currentTicket.imeiPasscode} onChange={e => setCurrentTicket({...currentTicket, imeiPasscode: e.target.value})} placeholder="IMEI أو الباسورد" style={{ width: '100%', padding: '0.9rem', background: '#1E293B', border: '1px solid #E2E8F0', borderRadius: 12, color: '#0F172A', fontSize: '1rem', outline: 'none' }} />
                  </div>
                  
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>وصف العطل (Issue Description)</label>
                    <textarea required value={currentTicket.issueDescription} onChange={e => setCurrentTicket({...currentTicket, issueDescription: e.target.value})} rows={3} style={{ width: '100%', padding: '0.9rem', background: '#1E293B', border: '1px solid #E2E8F0', borderRadius: 12, color: '#0F172A', fontSize: '1rem', outline: 'none', resize: 'vertical' }} />
                  </div>

                  {/* Financials */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>العربون المدفوع (Deposit)</label>
                    <input required type="number" min={0} value={currentTicket.deposit} onChange={e => setCurrentTicket({...currentTicket, deposit: parseFloat(e.target.value)})} style={{ width: '100%', padding: '0.9rem', background: '#1E293B', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: '1rem', outline: 'none', direction: 'ltr', textAlign: 'right', fontWeight: 800, color: '#F59E0B' }} />
                  </div>

                </form>

                {/* Costs & Parts Section */}
                <div style={{ marginTop: '2.5rem', paddingTop: '2.5rem', borderTop: '2px dashed rgba(255,255,255,0.1)' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Wrench color="#06B6D4" size={20} /> تسعير وتفاصيل الإصلاح
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                      <button type="button" onClick={() => setCostTab('inventory')} style={{ padding: '0.7rem 1.2rem', borderRadius: 12, border: 'none', background: costTab === 'inventory' ? '#06B6D4' : '#F8FAFC', color: costTab === 'inventory' ? '#fff' : '#94A3B8', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><PackagePlus size={16} /> قطع من المخزن</button>
                      <button type="button" onClick={() => setCostTab('external')} style={{ padding: '0.7rem 1.2rem', borderRadius: 12, border: 'none', background: costTab === 'external' ? '#F59E0B' : '#F8FAFC', color: costTab === 'external' ? '#fff' : '#94A3B8', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>شراء سريع</button>
                      <button type="button" onClick={() => setCostTab('outsourced')} style={{ padding: '0.7rem 1.2rem', borderRadius: 12, border: 'none', background: costTab === 'outsourced' ? '#8B5CF6' : '#F8FAFC', color: costTab === 'outsourced' ? '#fff' : '#94A3B8', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>صيانة خارجية</button>
                      <button type="button" onClick={() => setCostTab('labor')} style={{ padding: '0.7rem 1.2rem', borderRadius: 12, border: 'none', background: costTab === 'labor' ? '#10B981' : '#F8FAFC', color: costTab === 'labor' ? '#fff' : '#94A3B8', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>المصنعية</button>
                    </div>

                    {costTab === 'inventory' && (
                      <div>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end', background: '#F8FAFC', padding: '1rem', borderRadius: 16, border: '1px solid #E2E8F0' }}>
                          <div style={{ flex: 2 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>اختر القطعة (من المخزون)</label>
                            <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} style={{ width: '100%', padding: '0.8rem', background: '#1E293B', border: '1px solid #E2E8F0', borderRadius: 12, color: '#0F172A', fontSize: '0.95rem', outline: 'none' }}>
                              <option value="">-- اختر صنف --</option>
                              {products.map(p => (
                                <option key={p._id} value={p._id}>{p.name} (المخزون: {p.stock}) - {p.retailPrice} ج.م</option>
                              ))}
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>الكمية</label>
                            <input type="number" min={1} value={selectedProductQty} onChange={e => setSelectedProductQty(Number(e.target.value))} style={{ width: '100%', padding: '0.8rem', background: '#1E293B', border: '1px solid #E2E8F0', borderRadius: 12, color: '#0F172A', fontSize: '0.95rem', outline: 'none' }} />
                          </div>
                          <button type="button" onClick={handleAddPart} disabled={addingPart || !selectedProductId} style={{ background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 12, padding: '0.8rem 1.6rem', fontWeight: 800, cursor: addingPart || !selectedProductId ? 'not-allowed' : 'pointer', height: 'fit-content' }}>
                            {addingPart ? <Loader2 size={18} className="animate-spin" /> : 'إضافة'}
                          </button>
                        </div>
                        {currentTicket.spareParts && currentTicket.spareParts.length > 0 && (
                          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                            <thead>
                              <tr style={{ background: '#F8FAFC', color: '#475569', fontSize: '0.85rem' }}>
                                <th style={{ padding: '0.8rem', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>الصنف</th>
                                <th style={{ padding: '0.8rem', textAlign: 'center' }}>الكمية</th>
                                <th style={{ padding: '0.8rem', textAlign: 'center' }}>السعر</th>
                                <th style={{ padding: '0.8rem', textAlign: 'center', borderRadius: '8px 0 0 8px' }}>الإجمالي</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentTicket.spareParts.map((sp: any, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                  <td style={{ padding: '1rem 0.8rem', color: '#0F172A', fontWeight: 700 }}>{sp.product?.name || 'صنف محذوف'}</td>
                                  <td style={{ padding: '1rem 0.8rem', textAlign: 'center', color: '#475569' }}>{sp.quantity}</td>
                                  <td style={{ padding: '1rem 0.8rem', textAlign: 'center', color: '#475569' }}>{sp.price} ج.م</td>
                                  <td style={{ padding: '1rem 0.8rem', textAlign: 'center', color: '#10B981', fontWeight: 800 }}>{sp.price * sp.quantity} ج.م</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {costTab === 'external' && (
                      <div>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end', background: '#F8FAFC', padding: '1rem', borderRadius: 16, border: '1px solid #E2E8F0' }}>
                          <div style={{ flex: 2 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>اسم القطعة الخارجية</label>
                            <input type="text" value={extPartName} onChange={e => setExtPartName(e.target.value)} placeholder="مثال: شاشة ايفون 13 برو ماكس" style={{ width: '100%', padding: '0.8rem', background: '#1E293B', border: '1px solid #E2E8F0', borderRadius: 12, color: '#0F172A', fontSize: '0.95rem', outline: 'none' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>التكلفة (ج.م)</label>
                            <input type="number" min={0} value={extPartCost} onChange={e => setExtPartCost(Number(e.target.value))} style={{ width: '100%', padding: '0.8rem', background: '#1E293B', border: '1px solid #E2E8F0', borderRadius: 12, color: '#0F172A', fontSize: '0.95rem', outline: 'none' }} />
                          </div>
                          <button type="button" onClick={() => {
                            if (!extPartName || extPartCost <= 0) return
                            setCurrentTicket(prev => prev ? {
                              ...prev,
                              externalParts: [...(prev.externalParts || []), { name: extPartName, cost: extPartCost }]
                            } : prev)
                            setExtPartName('')
                            setExtPartCost(0)
                          }} style={{ background: '#F59E0B', color: '#0F172A', border: 'none', borderRadius: 12, padding: '0.8rem 1.6rem', fontWeight: 800, cursor: 'pointer', height: 'fit-content' }}>
                            إضافة أونلاين
                          </button>
                        </div>
                        {currentTicket.externalParts && currentTicket.externalParts.length > 0 && (
                          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                            <thead>
                              <tr style={{ background: '#F8FAFC', color: '#475569', fontSize: '0.85rem' }}>
                                <th style={{ padding: '0.8rem', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>القطعة</th>
                                <th style={{ padding: '0.8rem', textAlign: 'center', borderRadius: '8px 0 0 8px' }}>التكلفة</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentTicket.externalParts.map((ep: any, i: number) => (
                                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                  <td style={{ padding: '1rem 0.8rem', color: '#0F172A', fontWeight: 700 }}>{ep.name}</td>
                                  <td style={{ padding: '1rem 0.8rem', textAlign: 'center', color: '#F59E0B', fontWeight: 800 }}>{ep.cost} ج.م</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {costTab === 'outsourced' && (
                      <div style={{ background: '#F8FAFC', padding: '1.5rem', borderRadius: 16, border: '1px solid #E2E8F0' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>تكلفة الصيانة الخارجية (Outsourced Repair Cost)</label>
                        <input type="number" min={0} value={currentTicket.outsourcedRepairCost || 0} onChange={e => setCurrentTicket({...currentTicket, outsourcedRepairCost: Number(e.target.value)})} style={{ width: '100%', maxWidth: '300px', padding: '0.9rem', background: '#1E293B', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: '1rem', outline: 'none', fontWeight: 800, color: '#8B5CF6' }} />
                        <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.8rem' }}>* سيتم خصم هذه التكلفة من الخزينة تلقائياً عند التسليم.</p>
                      </div>
                    )}

                    {costTab === 'labor' && (
                      <div style={{ background: '#F8FAFC', padding: '1.5rem', borderRadius: 16, border: '1px solid #E2E8F0' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>تحديد هامش المصنعية (Labor Margin)</label>
                        <input type="number" min={0} value={currentTicket.laborMargin || 0} onChange={e => setCurrentTicket({...currentTicket, laborMargin: Number(e.target.value)})} style={{ width: '100%', maxWidth: '300px', padding: '0.9rem', background: '#1E293B', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: '1rem', outline: 'none', fontWeight: 800, color: '#10B981' }} />
                        <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.8rem' }}>* صافي ربح المصنعية من هذه التذكرة.</p>
                      </div>
                    )}

                    {/* Total Calculator */}
                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#475569' }}>إجمالي التكلفة المتوقعة (الإصلاح + المصنعية + القطع):</span>
                      <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10B981' }}>{currentTicket.estimatedCost || 0} ج.م</span>
                    </div>

                  </div>
              </div>

              <div style={{ position: 'sticky', bottom: 0, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', padding: '1.5rem 2rem', borderTop: '1px solid #F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: '1rem', zIndex: 20 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 12, padding: '0.8rem 2rem', fontWeight: 700, cursor: 'pointer' }}>
                  إلغاء
                </button>
                <button type="submit" form="ticket-form" disabled={isSaving} style={{ background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 12, padding: '0.8rem 2.5rem', fontWeight: 800, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 8px 20px rgba(6,182,212,0.3)' }}>
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : currentTicket._id ? 'حفظ التعديلات' : 'إنشاء التذكرة'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
