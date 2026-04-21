'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, ShoppingCart, Users, Package, Wallet, Banknote, FileText, Archive,
  Loader2, Link as LinkIcon,
} from 'lucide-react'
import Link from 'next/link'

/* ─── Types ─────────────────────────────────────────────── */
type ApiProduct = {
  _id: string
  name: string
  category: string
  price: number
  stock: number
  badge?: string
}

type ApiSale = {
  _id: string
  customer: string
  phone: string
  date: string
  productName: string
  price: number
  qty: number
  total: number
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    مكتمل:        { bg: 'rgba(34,197,94,0.1)',   color: '#22c55e' },
    'قيد التوصيل': { bg: 'rgba(6,182,212,0.1)',  color: '#06B6D4' },
    معلق:         { bg: 'rgba(6,182,212,0.1)',   color: '#06B6D4' },
    ملغي:         { bg: 'rgba(239,68,68,0.1)',    color: '#ef4444' },
  }
  const s = map[status] ?? { bg: 'rgba(255,255,255,0.05)', color: '#94A3B8' }
  return (
    <span style={{ background: s.bg, color: s.color, padding: '0.3rem 0.8rem', borderRadius: 50, fontSize: '0.75rem', fontWeight: 800 }}>
      {status}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.1)', borderRadius: '1.25rem', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: 12, width: '55%', background: 'rgba(255,255,255,0.05)', borderRadius: 6, marginBottom: '0.75rem' }} />
          <div style={{ height: 28, width: '70%', background: 'rgba(255,255,255,0.08)', borderRadius: 6 }} />
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
      </div>
    </div>
  )
}

function fmt(n: number) {
  return n.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function DashboardPage() {
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [sales, setSales]       = useState<ApiSale[]>([])
  const [statsData, setStatsData] = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [mounted, setMounted]   = useState(false)
  const [today, setToday]       = useState('')
  const [businessType, setBusinessType] = useState('B2B_WHALE')

  useEffect(() => {
    setMounted(true)
    setToday(new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [pRes, sRes, stRes, settsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/sales'),
        fetch('/api/stats'),
        fetch('/api/settings'),
      ])
      const [pData, sData, stData, settsData] = await Promise.all([pRes.json(), sRes.json(), stRes.json(), settsRes.json()])
      setProducts(pData.products ?? [])
      setSales(sData.sales ?? [])
      setStatsData(stData.stats ?? null)
      if (settsData && settsData.businessType) setBusinessType(settsData.businessType)
    } catch (err) {
      console.error('[Dashboard] fetch error', err)
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    { id: 'revenue', label: 'إجمالي المبيعات', value: loading || !statsData ? '—' : fmt(statsData.totalRevenue), unit: 'ج.م', icon: TrendingUp, color: '#06B6D4', bg: 'rgba(6,182,212,0.1)' },
    ...(businessType === 'B2B_WHALE' ? [{ id: 'costs', label: 'إجمالي التكلفة', value: loading || !statsData ? '—' : fmt(statsData.totalCost), unit: 'ج.م', icon: Package, color: '#FB923C', bg: 'rgba(251,146,60,0.1)' }] : []),
    { id: 'expenses', label: 'إجمالي المصروفات', value: loading || !statsData ? '—' : fmt(statsData.totalExpenses), unit: 'ج.م', icon: FileText, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    ...(businessType === 'B2B_WHALE' ? [{ id: 'profit', label: 'صافي الربح', value: loading || !statsData ? '—' : fmt(statsData.netProfit), unit: 'ج.م', icon: Banknote, color: '#22C55E', bg: 'rgba(34,197,94,0.1)' }] : []),
    ...(businessType === 'B2B_WHALE' ? [{ id: 'inventory-value', label: 'قيمة المخزون', value: loading || !statsData ? '—' : fmt(statsData.totalInventoryValue), unit: 'ج.م', icon: Archive, color: '#A855F7', bg: 'rgba(168,85,247,0.1)' }] : []),
  ]

  const recentOrders = sales.slice(0, 6)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', color: '#F8FAFC' }}>

      {/* Page Header */}
      <div>
        <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.22em', color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.4rem' }}>لوحة التحكم الذكية</p>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#FFFFFF', marginBottom: '0.25rem' }}>نظرة عامة</h1>
        <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
          {mounted ? `مرحباً بك في فري زون استور — ${today}` : 'مرحباً بك في لوحة تحكم فري زون استور'}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : stats.map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  style={{ background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.12)', borderRadius: '1.5rem', padding: '1.75rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 700, marginBottom: '0.5rem' }}>{s.label}</p>
                      <p style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1, direction: 'ltr' }}>
                        {s.value} <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{s.unit}</span>
                      </p>
                    </div>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, border: `1px solid ${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={24} color={s.color} strokeWidth={2} />
                    </div>
                  </div>
                </motion.div>
              )
            })
        }
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Recent Mails / Sales */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '1.75rem', overflow: 'hidden' }}
        >
          <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(6,182,212,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(6,182,212,0.05)' }}>
            <h2 style={{ fontWeight: 900, fontSize: '1.15rem', color: '#FFFFFF' }}>أحدث العمليات</h2>
            <Link href="/dashboard/sales" style={{ fontSize: '0.82rem', fontWeight: 800, color: '#06B6D4', textDecoration: 'none', background: 'rgba(6,182,212,0.1)', padding: '0.4rem 1rem', borderRadius: 10 }}>مشاهدة الكل</Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(6,182,212,0.1)' }}>
                  {['العميل', 'المبلغ', 'الحالة'].map(h => <th key={h} style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(sale => (
                  <tr key={sale._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <p style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.9rem' }}>{sale.customer}</p>
                      <p style={{ fontSize: '0.75rem', color: '#64748B' }}>{sale.productName}</p>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 900, color: '#06B6D4', direction: 'ltr' }}>{fmt(sale.total ?? sale.price * sale.qty)} ج.م</td>
                    <td style={{ padding: '1.25rem 1.5rem' }}><StatusBadge status="مكتمل" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && recentOrders.length === 0 && <div style={{ padding: '4rem', textAlign: 'center', color: '#64748B' }}>لا توجد بيانات</div>}
        </motion.div>

        {/* Low Stock Section */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '1.75rem', overflow: 'hidden' }}
        >
          <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(6,182,212,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(6,182,212,0.05)' }}>
            <h2 style={{ fontWeight: 900, fontSize: '1.15rem', color: '#FFFFFF' }}>تنبيهات المخزون</h2>
            <Link href="/dashboard/products" style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FB923C', textDecoration: 'none', background: 'rgba(251,146,60,0.1)', padding: '0.4rem 1rem', borderRadius: 10 }}>إدارة المستودع</Link>
          </div>
          <div>
            {products.slice(0, 7).map(p => (
              <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div>
                  <p style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.9rem' }}>{p.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748B' }}>{p.category}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <span style={{ fontWeight: 900, color: '#F8FAFC' }}>{p.stock} <small style={{ fontWeight: 500, color: '#64748B' }}>وحدة</small></span>
                  <div style={{ width: 60, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 20 }}>
                    <div style={{ width: `${Math.min(p.stock * 5, 100)}%`, height: '100%', background: p.stock < 5 ? '#EF4444' : '#FB923C', borderRadius: 20 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!loading && products.length === 0 && <div style={{ padding: '4rem', textAlign: 'center', color: '#64748B' }}>المستودع فارغ</div>}
        </motion.div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
