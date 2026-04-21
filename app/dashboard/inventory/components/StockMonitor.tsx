'use client'

import { motion } from 'framer-motion'
import { Activity, Package, CheckCircle2 } from 'lucide-react'

interface ProductStat {
  _id: string
  name: string
  scanned: number
  total: number
}

interface StockMonitorProps {
  shipments?: any[]
  selectedShipment?: string
  onShipmentSelect?: (id: string) => void
  shipmentNumber?: string
  products: any[]
  stats: Record<string, { scanned: number, total: number }>
}

export function StockMonitor({ shipments, selectedShipment, onShipmentSelect, shipmentNumber, products, stats }: StockMonitorProps) {
  // CEO Phase 65: Aggregate UI rows by Product ID
  const aggregatedProducts = products.reduce((acc: any[], item: any) => {
    const pid = String(item.productId?._id || item.productId || '')
    const existing = acc.find(p => String(p.productId?._id || p.productId || '') === pid)
    
    if (existing) {
      existing.quantity += (item.quantity || 0)
    } else {
      acc.push({ ...JSON.parse(JSON.stringify(item)) }) // Deep clone to avoid mutating prop
    }
    return acc
  }, [])

  return (
    <div style={{ background: 'rgba(6,182,212,0.02)', borderLeft: '1px solid rgba(6,182,212,0.1)', height: '100%', padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <Activity color="#06B6D4" size={20} />
        <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#FFFFFF' }}>مراقب الشحنة الحية</h3>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.4rem' }}>رقم الشحنة</p>
        
        {shipments && onShipmentSelect ? (
          <select 
            value={selectedShipment || ''} 
            onChange={(e) => onShipmentSelect(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 12, padding: '0.75rem', color: '#06B6D4', width: '100%', outline: 'none', fontWeight: 900, cursor: 'pointer' }}
          >
            <option value="">-- اختر رسالة لاستلامها --</option>
            {shipments.map((s: any) => (
                <option key={s.value || s._id} value={s.value || s._id} style={{ background: '#0B1120', color: '#fff' }}>
                  {s.label || s.shipmentNumber}
                </option>
            ))}
          </select>
        ) : (
          <p style={{ fontSize: '1.1rem', fontWeight: 950, color: '#06B6D4' }}>{shipmentNumber || '---'}</p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {!selectedShipment ? (
          <div style={{ textAlign: 'center', opacity: 0.3, padding: '2rem 0' }}>
            <Package size={32} style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.8rem' }}>يرجى اختيار رسالة لاستلامها</p>
          </div>
        ) : aggregatedProducts.length === 0 ? (
          <div style={{ textAlign: 'center', opacity: 0.3, padding: '2rem 0' }}>
            <Package size={32} style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.8rem' }}>بانتظار اختيار شحنة...</p>
          </div>
        ) : aggregatedProducts.map((item: any) => {
          const pid = String(item.productId?._id || item.productId || '')
          const pName = item.productId?.name || 'منتج غير معروف'
          const scanned = stats[pid]?.scanned || 0
          const total = item.quantity || 0
          const pct = total > 0 ? (scanned / total) * 100 : 0

          return (
            <div key={pid} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F8FAFC' }}>{pName}</span>
                {scanned === total && total > 0 ? (
                  <CheckCircle2 size={16} color="#10B981" />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 900, color: '#64748B' }}>
                    <span dir="ltr" style={{ color: '#F8FAFC' }}>{scanned}</span>
                    <span style={{ fontSize: '0.65rem', color: '#475569' }}>من</span>
                    <span dir="ltr">{total}</span>
                  </div>
                )}
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden' }}>
                <motion.div 
                   initial={{ width: 0 }} 
                   animate={{ width: `${pct}%` }}
                   style={{ height: '100%', background: pct === 100 ? '#10B981' : '#06B6D4' }} 
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
