'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Printer, Loader2, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import { PrintHeader } from '@/components/dashboard/PrintHeader'

type Props = {
  supplier: { _id: string; name: string; balance: number; type: string }
  onClose: () => void
}

export default function SupplierLedgerModal({ supplier, onClose }: Props) {
  const [loading, setLoading]         = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const txRes = await fetch('/api/transactions?limit=all')
        if (!txRes.ok) throw new Error('Failed to fetch transactions')
        const txData = await txRes.json()

        // CEO PHASE 63: BULLETPROOF FILTER
        // Checks all possible DB schema variations (populated objects or raw IDs)
        const supId = String(supplier._id);
        const filtered = (txData.transactions || []).filter((tx: any) => {
          const matchedId = String(
            tx.supplier?._id || 
            tx.supplier     || 
            tx.entity?._id   || 
            tx.entity       || 
            tx.supplierId   || 
            tx.entityId
          );
          return matchedId === supId;
        });

        setTransactions(filtered);
      } catch (err) {
        console.error('Ledger Fetch Error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [supplier._id])

  const ledger = useMemo(() => {
    if (!Array.isArray(transactions)) return []
    
    const entries = transactions
      .filter(t => t.entityType !== 'System_Forex_Adjustment')
      .map(t => {
        const isCredit = t.type === 'IN'
        const isDebit  = t.type === 'OUT'
        
        return {
          id: t._id,
          date: new Date(t.date || t.createdAt),
          typeBadge: isDebit ? 'payment' : 'purchase',
          typeLabel: isDebit ? 'سداد' : 'فاتورة شراء',
          ref: t.paymentMethod || '—',
          description: t.description,
          credit: isCredit ? t.amount : 0,
          debit:  isDebit  ? t.amount : 0,
        }
      })

    // Sort Chronologically (Oldest first)
    entries.sort((a, b) => a.date.getTime() - b.date.getTime())

    let running = 0
    return entries.map(e => {
      running += e.credit - e.debit
      return { ...e, balance: running }
    })
  }, [transactions])

  const totalCredit = ledger.reduce((s, r) => s + (r.credit || 0), 0)
  const totalDebit  = ledger.reduce((s, r) => s + (r.debit || 0),  0)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      
      {/* CEO PHASE 63: FOOLPROOF PRINT OVERRIDE */}
      <style type="text/css" media="print">
        {`
          body * { visibility: hidden !important; }
          #printable-ledger, #printable-ledger * { visibility: visible !important; }
          #printable-ledger { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            display: block !important;
            background: white !important;
          }
          /* Ensure table expands and is visible */
          .print-table-container { overflow: visible !important; height: auto !important; }
          table { width: 100% !important; border-collapse: collapse !important; border: 1px solid black !important; }
          th, td { border: 1px solid black !important; padding: 8px !important; color: black !important; }
        `}
      </style>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{ opacity: 0,   scale: 0.95,  y: 20 }}
        style={{ background: '#0B1120', padding: '2rem', borderRadius: 24, width: '100%', maxWidth: 950, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid rgba(6,182,212,0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}
        className="no-print"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FileText color="#06B6D4" size={26} /> كشف حساب: {supplier.name}
            </h3>
            <p style={{ color: '#94A3B8', marginTop: '0.3rem', fontSize: '0.9rem' }}>السجل المحاسبي الموحد للمورد</p>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button onClick={() => window.print()} style={{ background: 'rgba(6,182,212,0.1)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 12, padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'inherit' }}>
              <Printer size={18} /> طباعة كشف الحساب
            </button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: 50, padding: '0.6rem', cursor: 'pointer' }}><X size={20} /></button>
          </div>
        </div>

        {/* This div is visible during normal UI use but the printable engine targets #printable-ledger below */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <Loader2 size={40} className="animate-spin" color="#06B6D4" style={{ margin: '0 auto' }} />
            </div>
          ) : (
            <div id="printable-ledger">
              {/* Internal Print Header inside the printable ID */}
              <div className="print-only" style={{ display: 'none' }}>
                <PrintHeader
                  title={`كشف حساب المورد: ${supplier.name}`}
                  subtitle={`الرصيد النهائي: ${Math.abs(supplier.balance).toLocaleString('ar-EG')} ج.م`}
                />
              </div>

              <div className="print-table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(6,182,212,0.1)', borderBottom: '1px solid rgba(6,182,212,0.2)' }}>
                      {['التاريخ', 'النوع', 'البيان', 'المرجع', 'دائن (له)', 'مدين (عليه)', 'الرصيد'].map(h => (
                        <th key={h} style={{ padding: '0.9rem 0.75rem', textAlign: 'right', color: '#94A3B8', fontWeight: 800, fontSize: '0.75rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((row, i) => (
                      <tr key={row.id + i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                        <td style={{ padding: '0.8rem 0.75rem', color: '#CBD5E1', whiteSpace: 'nowrap' }}>{row.date.toLocaleDateString('ar-EG')}</td>
                        <td style={{ padding: '0.8rem 0.75rem' }}>
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800, background: row.typeBadge === 'payment' ? 'rgba(34,197,94,0.1)' : 'rgba(251,146,60,0.1)', color: row.typeBadge === 'payment' ? '#22C55E' : '#FB923C' }}>
                            {row.typeLabel}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem 0.75rem', color: '#CBD5E1', fontSize: '0.82rem' }}>{row.description}</td>
                        <td style={{ padding: '0.8rem 0.75rem', color: '#64748B', fontSize: '0.75rem' }}>{row.ref}</td>
                        <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center', fontWeight: 800, color: row.credit > 0 ? '#FB923C' : '#334155' }}>{row.credit.toLocaleString('ar-EG')}</td>
                        <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center', fontWeight: 800, color: row.debit > 0 ? '#22C55E' : '#334155' }}>{row.debit.toLocaleString('ar-EG')}</td>
                        <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center', fontWeight: 900, direction: 'ltr', color: row.balance > 0 ? '#FB923C' : row.balance < 0 ? '#22C55E' : '#64748B' }}>{row.balance.toLocaleString('ar-EG')} ج.م</td>
                      </tr>
                    ))}
                    {ledger.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: '#64748B', fontWeight: 700 }}>لا توجد عمليات مسجلة في كشف الحساب</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {ledger.length > 0 && (
                <div style={{ marginTop: '1.5rem', padding: '1.25rem 1.5rem', borderTop: '2px solid rgba(6,182,212,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(6,182,212,0.04)', borderRadius: '0 0 12px 12px' }}>
                  <span style={{ color: '#94A3B8', fontWeight: 700, fontSize: '0.9rem' }}>الرصيد الختامي المعتمد:</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, direction: 'ltr', color: supplier.balance > 0 ? '#FB923C' : supplier.balance < 0 ? '#22C55E' : '#64748B' }}>
                    {Math.abs(supplier.balance).toLocaleString('ar-EG')} ج.م
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginRight: '0.5rem' }}>{supplier.balance > 0 ? '(دائن)' : supplier.balance < 0 ? '(مدين)' : '(مسوّى)'}</span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .animate-spin { animation: spin 1s linear infinite }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          #printable-ledger { display: block !important; visibility: visible !important; }
        }
      `}</style>
    </div>
  )
}
