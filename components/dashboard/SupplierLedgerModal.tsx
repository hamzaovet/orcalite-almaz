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
        const txRes = await fetch(`/api/transactions?limit=all&includeSupplierLedger=true&t=${Date.now()}`)
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

    // Step 1: map raw transactions
    const raw = transactions
      .filter(t => t.entityType !== 'System_Forex_Adjustment')
      .map(t => ({
        id:          String(t._id),
        date:        new Date(t.date || t.createdAt),
        entityType:  t.entityType,
        type:        t.type,
        description: t.description as string,
        amount:      Number(t.amount),
      }))

    // Step 2: merge paired invoice + payment rows into ONE line.
    // Strategy A – ref match (works for new purchases where both share the same invoiceRef)
    // Strategy B – time-proximity fallback (handles legacy data where refs differed)
    const refRegex = /(?:سداد )?فاتورة مشتريات رقم\s+(\S+)/

    const byRef: Record<string, { invoice?: typeof raw[0], payment?: typeof raw[0] }> = {}
    const untagged: typeof raw = []  // entries that don't match a purchase ref pattern

    for (const t of raw) {
      const m = t.description?.match(refRegex)
      if (m) {
        const ref = m[1]
        if (!byRef[ref]) byRef[ref] = {}
        if (t.type === 'IN') byRef[ref].invoice = t
        else                 byRef[ref].payment = t
      } else {
        untagged.push(t)
      }
    }

    // After pass A, collect orphans that matched a ref but had no counterpart
    const orphanInvoices: typeof raw = []
    const orphanPayments: typeof raw = []

    const merged: Array<{ id: string; date: Date; typeLabel: string; typeBadge: string; description: string; added: number; paid: number }> = []

    for (const [, pair] of Object.entries(byRef)) {
      if (pair.invoice && pair.payment) {
        merged.push({
          id:          pair.invoice.id + '_m',
          date:        pair.invoice.date,
          typeLabel:   'فاتورة شراء',
          typeBadge:   'purchase',
          description: pair.invoice.description,
          added:       pair.invoice.amount,
          paid:        pair.payment.amount,
        })
      } else if (pair.invoice) {
        orphanInvoices.push(pair.invoice)
      } else if (pair.payment) {
        orphanPayments.push(pair.payment)
      }
    }

    // Strategy B: time-proximity fallback — match orphan invoices with orphan payments
    // that occurred within 60 seconds of each other (same purchase session)
    const usedPaymentIds = new Set<string>()
    for (const inv of orphanInvoices) {
      const nearby = orphanPayments.find(p =>
        !usedPaymentIds.has(p.id) &&
        Math.abs(inv.date.getTime() - p.date.getTime()) < 60_000
      )
      if (nearby) {
        usedPaymentIds.add(nearby.id)
        merged.push({
          id:          inv.id + '_m',
          date:        inv.date,
          typeLabel:   'فاتورة شراء',
          typeBadge:   'purchase',
          description: inv.description,
          added:       inv.amount,
          paid:        nearby.amount,
        })
      } else {
        // No matching payment — standalone invoice row
        merged.push({ id: inv.id, date: inv.date, typeLabel: 'فاتورة شراء', typeBadge: 'purchase', description: inv.description, added: inv.amount, paid: 0 })
      }
    }
    // Remaining unmatched payments become standalone rows
    for (const p of orphanPayments) {
      if (!usedPaymentIds.has(p.id)) {
        merged.push({ id: p.id, date: p.date, typeLabel: 'سداد', typeBadge: 'payment', description: p.description, added: 0, paid: p.amount })
      }
    }

    // Add truly standalone entries (opening balance transactions, manual payments, etc.)
    for (const t of untagged) {
      merged.push({
        id:          t.id,
        date:        t.date,
        typeLabel:   t.type === 'OUT' ? 'سداد' : 'فاتورة شراء',
        typeBadge:   t.type === 'OUT' ? 'payment' : 'purchase',
        description: t.description,
        added:       t.type !== 'OUT' ? t.amount : 0,
        paid:        t.type === 'OUT' ? t.amount  : 0,
      })
    }

    // Step 3: sort oldest → newest
    merged.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Step 4: derive opening balance
    // opening + Σadded − Σpaid = supplier.balance  ∴ opening = balance − Σadded + Σpaid
    const totalAdded = merged.reduce((s, e) => s + e.added, 0)
    const totalPaid  = merged.reduce((s, e) => s + e.paid,  0)
    const openingBalance = supplier.balance - totalAdded + totalPaid

    // Step 5: build running balance
    let running = openingBalance
    const rows = merged.map(e => {
      const openBal = running
      running += e.added - e.paid
      return { ...e, openingBal: openBal, balance: running }
    })

    // Opening row (anchor)
    const openingRow = {
      id: '__opening__', date: null as any, typeLabel: 'رصيد افتتاحي', typeBadge: 'opening',
      description: 'الرصيد قبل أول معاملة مسجلة',
      added: 0, paid: 0, openingBal: null as any, balance: openingBalance,
    }

    return [openingRow, ...rows]
  }, [transactions, supplier.balance])


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
        style={{ background: '#F8FAFC', padding: '2rem', borderRadius: 24, width: '100%', maxWidth: 950, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #CBD5E1', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}
        className="no-print"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FileText color="#06B6D4" size={26} /> كشف حساب: {supplier.name}
            </h3>
            <p style={{ color: '#475569', marginTop: '0.3rem', fontSize: '0.9rem' }}>السجل المحاسبي الموحد للمورد</p>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button onClick={() => window.print()} style={{ background: '#ECFEFF', color: '#06B6D4', border: '1px solid #CBD5E1', borderRadius: 12, padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'inherit' }}>
              <Printer size={18} /> طباعة كشف الحساب
            </button>
            <button onClick={onClose} style={{ background: '#F8FAFC', color: '#0F172A', border: 'none', borderRadius: 50, padding: '0.6rem', cursor: 'pointer' }}><X size={20} /></button>
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
                    <tr style={{ background: '#ECFEFF', borderBottom: '1px solid rgba(6,182,212,0.2)' }}>
                      {['التاريخ', 'البيان', 'رصيد البداية', 'إضافة (+)', 'سداد (−)', 'رصيد الختام'].map(h => (
                        <th key={h} style={{ padding: '0.9rem 0.75rem', textAlign: 'right', color: '#475569', fontWeight: 800, fontSize: '0.75rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((row, i) => {
                      const isOpening = row.id === '__opening__'
                      return (
                        <tr key={row.id + i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isOpening ? 'rgba(245,158,11,0.06)' : i % 2 === 0 ? 'transparent' : 'transparent' }}>
                          {/* التاريخ */}
                          <td style={{ padding: '0.8rem 0.75rem', color: '#475569', whiteSpace: 'nowrap' }}>
                            {isOpening ? '—' : row.date.toLocaleDateString('ar-EG')}
                          </td>
                          {/* البيان */}
                          <td style={{ padding: '0.8rem 0.75rem' }}>
                            {isOpening ? (
                              <span style={{ color: '#F59E0B', fontWeight: 700 }}>{row.description}</span>
                            ) : (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{
                                  padding: '0.15rem 0.55rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800, flexShrink: 0,
                                  background: row.typeBadge === 'payment' ? 'rgba(34,197,94,0.1)' : 'rgba(251,146,60,0.1)',
                                  color:      row.typeBadge === 'payment' ? '#22C55E'             : '#FB923C',
                                }}>{row.typeLabel}</span>
                                <span style={{ color: '#475569', fontSize: '0.82rem' }}>{row.description}</span>
                              </span>
                            )}
                          </td>
                          {/* رصيد البداية */}
                          <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right', fontWeight: 700, direction: 'ltr', color: '#475569' }}>
                            {isOpening || row.openingBal == null ? '—' : `${row.openingBal.toLocaleString('ar-EG')} ج.م`}
                          </td>
                          {/* إضافة (+) */}
                          <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right', fontWeight: 800, color: !isOpening && row.added > 0 ? '#FB923C' : '#475569' }}>
                            {isOpening || row.added === 0 ? '—' : row.added.toLocaleString('ar-EG')}
                          </td>
                          {/* سداد (−) */}
                          <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right', fontWeight: 800, color: !isOpening && row.paid > 0 ? '#22C55E' : '#475569' }}>
                            {isOpening || row.paid === 0 ? '—' : row.paid.toLocaleString('ar-EG')}
                          </td>
                          {/* رصيد الختام */}
                          <td style={{ padding: '0.8rem 0.75rem', textAlign: 'right', fontWeight: 900, direction: 'ltr',
                            color: row.balance > 0 ? '#FB923C' : row.balance < 0 ? '#22C55E' : '#F59E0B'
                          }}>
                            {row.balance.toLocaleString('ar-EG')} ج.م
                          </td>
                        </tr>
                      )
                    })}
                    {ledger.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: '#475569', fontWeight: 700 }}>لا توجد عمليات مسجلة في كشف الحساب</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {ledger.length > 0 && (
                <div style={{ marginTop: '1.5rem', padding: '1.25rem 1.5rem', borderTop: '2px solid rgba(6,182,212,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(6,182,212,0.04)', borderRadius: '0 0 12px 12px' }}>
                  <span style={{ color: '#475569', fontWeight: 700, fontSize: '0.9rem' }}>الرصيد الختامي المعتمد:</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, direction: 'ltr', color: supplier.balance > 0 ? '#FB923C' : supplier.balance < 0 ? '#22C55E' : '#64748B' }}>
                    {Math.abs(supplier.balance).toLocaleString('ar-EG')} ج.م
                    <span style={{ fontSize: '0.75rem', color: '#475569', marginRight: '0.5rem' }}>{supplier.balance > 0 ? '(دائن)' : supplier.balance < 0 ? '(مدين)' : '(مسوّى)'}</span>
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
