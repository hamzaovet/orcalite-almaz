'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Printer, Loader2, FileText, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { PrintHeader } from '@/components/dashboard/PrintHeader'

export default function SupplierStatementPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [supplier, setSupplier] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function fetchData() {
      setLoading(true)
      try {
        const [supRes, txRes, purRes] = await Promise.all([
          fetch(`/api/suppliers?id=${id}`),
          fetch('/api/transactions?limit=all'),
          fetch('/api/purchases')
        ])
        const [supData, txData, purData] = await Promise.all([
          supRes.json(), txRes.json(), purRes.json()
        ])

        // Try to find the supplier in the list
        const found = (supData.suppliers || []).find((s: any) => s._id === id)
        setSupplier(found || { _id: id, name: 'مورد', balance: 0, type: 'Supplier' })

        setTransactions(
          (txData.transactions || []).filter((t: any) => String(t.entityId) === String(id))
        )
        setPurchases(
          (purData.purchases || []).filter((p: any) => String(p.supplierId) === String(id))
        )
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const ledger = useMemo(() => {
    const entries: any[] = []

    // Purchases = credit (supplier is owed)
    purchases.forEach((p: any) => {
      entries.push({
        id: p._id,
        date: new Date(p.createdAt || p.date),
        type: 'purchase',
        ref: p.invoiceLabel || `فاتورة شراء`,
        description: `${p.supplierName || 'مورد'} — ${p.items?.length || 0} صنف`,
        credit: p.totalAmount || 0,
        debit: 0,
      })
      // If amountPaid > 0 on the purchase itself
      if (p.amountPaid > 0) {
        entries.push({
          id: p._id + '_paid',
          date: new Date(p.createdAt || p.date),
          type: 'payment',
          ref: p.paymentMethod || 'Cash',
          description: `دفعة عند الشراء — ${p.paymentMethod || 'نقدي'}`,
          credit: 0,
          debit: p.amountPaid,
        })
      }
    })

    // Transactions = payments (reduce balance)
    transactions.forEach((t: any) => {
      const isOut = t.type === 'OUT'
      entries.push({
        id: t._id,
        date: new Date(t.date || t.createdAt),
        type: 'transaction',
        ref: t.paymentMethod || '—',
        description: t.description || 'حركة مالية',
        credit: isOut ? 0 : t.amount,
        debit: isOut ? t.amount : 0,
      })
    })

    entries.sort((a, b) => a.date.getTime() - b.date.getTime())

    let running = 0
    return entries.map(e => {
      running += e.credit - e.debit
      return { ...e, balance: running }
    })
  }, [purchases, transactions])

  function handlePrint() {
    window.print()
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader2 size={48} className="animate-spin" color="#06B6D4" />
    </div>
  )

  const totalCredit = ledger.reduce((s, r) => s + r.credit, 0)
  const totalDebit  = ledger.reduce((s, r) => s + r.debit, 0)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', color: '#F8FAFC' }}>

      {/* PrintHeader — only visible when printing */}
      <PrintHeader
        title={`كشف حساب المورد: ${supplier?.name || '...'}`}
        subtitle={`إجمالي المديونية: ${(supplier?.balance || 0).toLocaleString('ar-EG')} ج.م`}
      />

      {/* Screen-only header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button
            onClick={() => router.back()}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', padding: '0.5rem 1rem', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontFamily: 'inherit' }}
          >
            <ArrowRight size={16} /> رجوع للموردين
          </button>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText color="#06B6D4" size={32} /> كشف حساب: {supplier?.name}
          </h1>
          <p style={{ color: '#94A3B8', marginTop: '0.4rem' }}>السجل التفصيلي للمشتريات والمدفوعات</p>
        </div>
        <button
          onClick={handlePrint}
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(6,182,212,0.1)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 14, padding: '0.85rem 1.8rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(6,182,212,0.15)' }}
        >
          <Printer size={20} /> طباعة كشف الحساب
        </button>
      </div>

      {/* Summary Cards */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { label: 'إجمالي المشتريات (دائن)', value: totalCredit, color: '#FB923C', Icon: TrendingUp },
          { label: 'إجمالي المدفوعات (مدين)', value: totalDebit,  color: '#22C55E', Icon: TrendingDown },
          { label: 'الرصيد النهائي على الحساب', value: supplier?.balance || 0, color: '#06B6D4', Icon: Wallet },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} style={{ background: 'rgba(6,182,212,0.03)', borderRadius: 20, padding: '1.5rem', border: '1px solid rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={22} color={color} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700, marginBottom: '0.3rem' }}>{label}</p>
              <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', direction: 'ltr' }}>{Math.abs(value).toLocaleString('ar-EG')} ج.م</p>
            </div>
          </div>
        ))}
      </div>

      {/* Ledger Table */}
      <div style={{ background: 'rgba(6,182,212,0.03)', borderRadius: 20, border: '1px solid rgba(6,182,212,0.15)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(6,182,212,0.08)', borderBottom: '1px solid rgba(6,182,212,0.2)' }}>
                {['التاريخ', 'النوع', 'البيان', 'المرجع', 'دائن (مستحق له)', 'مدين (سداد)', 'الرصيد التراكمي'].map(h => (
                  <th key={h} style={{ padding: '1rem', fontWeight: 800, color: '#94A3B8', fontSize: '0.78rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.map((row, i) => (
                <tr key={row.id + i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                  <td style={{ padding: '1rem', color: '#CBD5E1', whiteSpace: 'nowrap' }}>
                    {row.date.toLocaleDateString('ar-EG')}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.7rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800,
                      background: row.type === 'purchase' ? 'rgba(251,146,60,0.1)' : 'rgba(34,197,94,0.1)',
                      color:      row.type === 'purchase' ? '#FB923C' : '#22C55E'
                    }}>
                      {row.type === 'purchase' ? 'فاتورة شراء' : 'سداد'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#E2E8F0', maxWidth: 260 }}>{row.description}</td>
                  <td style={{ padding: '1rem', color: '#64748B', fontSize: '0.8rem' }}>{row.ref}</td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, color: row.credit > 0 ? '#FB923C' : '#334155' }}>
                    {row.credit > 0 ? row.credit.toLocaleString('ar-EG') : '—'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, color: row.debit > 0 ? '#22C55E' : '#334155' }}>
                    {row.debit > 0 ? row.debit.toLocaleString('ar-EG') : '—'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, direction: 'ltr', color: row.balance > 0 ? '#FB923C' : row.balance < 0 ? '#22C55E' : '#64748B' }}>
                    {row.balance.toLocaleString('ar-EG')} ج.م
                  </td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: '#64748B', fontWeight: 700 }}>لا توجد حركات مالية مسجلة لهذا المورد</td></tr>
              )}
            </tbody>
            {ledger.length > 0 && (
              <tfoot>
                <tr style={{ background: 'rgba(6,182,212,0.06)', borderTop: '2px solid rgba(6,182,212,0.2)' }}>
                  <td colSpan={4} style={{ padding: '1rem', fontWeight: 900, color: '#fff' }}>الإجمالي</td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, color: '#FB923C' }}>{totalCredit.toLocaleString('ar-EG')} ج.م</td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, color: '#22C55E' }}>{totalDebit.toLocaleString('ar-EG')} ج.م</td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, color: '#06B6D4', direction: 'ltr' }}>{(supplier?.balance || 0).toLocaleString('ar-EG')} ج.م</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .animate-spin { animation: spin 1s linear infinite }
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
          table { font-size: 11pt; }
          th, td { border: 1px solid #ccc !important; padding: 6px 8px !important; color: #000 !important; background: transparent !important; }
          thead tr { background: #eee !important; }
          tfoot tr { background: #f5f5f5 !important; font-weight: bold; }
        }
      `}</style>
    </div>
  )
}
