'use client'

import { useState, useEffect } from 'react'
import { 
  Building2, 
  Calendar, 
  Users, 
  MapPin, 
  ShieldAlert, 
  Clock, 
  RefreshCcw,
  Search,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Store {
  _id: string
  name: string
  storeId: string
  clientName: string
  renewalDate: string
  isSuspended: boolean
  maxUsers: number
  maxBranches: number
  subscriptionType: 'Monthly' | 'Annual'
  balance: number
}

export default function SuperAdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/superadmin/stores')
      const data = await res.json()
      if (data.stores) setStores(data.stores)
    } catch (err) {
      console.error('Failed to fetch stores', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSuspension = async (store: Store) => {
    setUpdatingId(store._id)
    try {
      const res = await fetch(`/api/superadmin/stores/${store._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended: !store.isSuspended })
      })
      if (res.ok) fetchStores()
    } catch (err) {
      console.error('Update failed', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusBadge = (store: Store) => {
    const now = new Date()
    const renewal = new Date(store.renewalDate)
    const diffDays = Math.floor((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (store.isSuspended) return { label: 'معلق يدوياً', color: '#ef4444', icon: <ShieldAlert size={14} /> }
    if (diffDays <= -2) return { label: 'ملغي (تجاوز السماح)', color: '#ef4444', icon: <XCircle size={14} /> }
    if (diffDays <= 0) return { label: 'فترة سماح', color: '#EA580C', icon: <Clock size={14} /> }
    if (diffDays <= 7) return { label: 'قرب الانتهاء', color: '#F59E0B', icon: <Clock size={14} /> }
    return { label: 'نشط', color: '#22c55e', icon: <CheckCircle2 size={14} /> }
  }

  const filteredStores = stores.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#06B6D4]" />
    </div>
  )

  return (
    <div style={{ direction: 'rtl', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>لوحة تحكم SaaS (العراب)</h1>
          <p style={{ color: '#94A3B8', marginTop: '0.4rem' }}>إدارة اشتراكات العملاء ومراقبة الحالة التقنية والمالية</p>
        </div>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} color="#64748B" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="بحث عن متجر أو عميل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '0.75rem 3rem 0.75rem 1rem', background: '#0B1120',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: '#fff', outline: 'none'
            }}
          />
        </div>
      </header>

      <div style={{ background: '#0B1120', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th style={{ padding: '1.25rem', color: '#64748B', fontWeight: 700, fontSize: '0.85rem' }}>المتجر / العميل</th>
              <th style={{ padding: '1.25rem', color: '#64748B', fontWeight: 700, fontSize: '0.85rem' }}>الحالة</th>
              <th style={{ padding: '1.25rem', color: '#64748B', fontWeight: 700, fontSize: '0.85rem' }}>التجديد</th>
              <th style={{ padding: '1.25rem', color: '#64748B', fontWeight: 700, fontSize: '0.85rem' }}>التراخيص</th>
              <th style={{ padding: '1.25rem', color: '#64748B', fontWeight: 700, fontSize: '0.85rem' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredStores.map((store) => {
                const status = getStatusBadge(store)
                return (
                  <motion.tr 
                    key={store._id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,182,212,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Building2 size={20} color="#06B6D4" />
                        </div>
                        <div>
                          <p style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{store.name}</p>
                          <p style={{ color: '#64748B', fontSize: '0.8rem' }}>{store.clientName}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem', 
                        padding: '0.35rem 0.75rem', borderRadius: '8px', 
                        background: `${status.color}15`, color: status.color, 
                        fontSize: '0.78rem', fontWeight: 700, border: `1px solid ${status.color}30` 
                      }}>
                        {status.icon}
                        {status.label}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#E2E8F0', fontSize: '0.9rem' }}>
                        <Calendar size={14} color="#64748B" />
                        {new Date(store.renewalDate).toLocaleDateString('ar-EG')}
                      </div>
                      <p style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '0.2rem' }}>الباقة: {store.subscriptionType === 'Annual' ? 'سنوية' : 'شهرية'}</p>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ textAlign: 'center' }}>
                          <Users size={14} color="#06B6D4" style={{ margin: '0 auto 0.2rem' }} />
                          <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>{store.maxUsers}</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <MapPin size={14} color="#22C55E" style={{ margin: '0 auto 0.2rem' }} />
                          <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>{store.maxBranches}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                         <button 
                            onClick={() => toggleSuspension(store)}
                            disabled={updatingId === store._id}
                            style={{ 
                              padding: '0.5rem 1rem', borderRadius: '8px', 
                              background: store.isSuspended ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', 
                              border: `1px solid ${store.isSuspended ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                              color: store.isSuspended ? '#22c55e' : '#ef4444',
                              fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.4rem'
                            }}
                          >
                            {updatingId === store._id ? <RefreshCcw size={14} className="animate-spin" /> : (store.isSuspended ? 'إلغاء التعليق' : 'تعليق النظام')}
                          </button>
                          <button style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}><MoreVertical size={18} /></button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </tbody>
        </table>

        {filteredStores.length === 0 && (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748B' }}>
            <Building2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p>لا توجد متاجر مفعلة حالياً.</p>
          </div>
        )}
      </div>
    </div>
  )
}
