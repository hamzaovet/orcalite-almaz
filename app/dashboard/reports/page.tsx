'use client'

import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, BarChart3, RefreshCw, Loader2, Calendar, MapPin, Printer, ArrowDownToLine, Package, Wallet, Banknote, ShieldAlert, Cpu, Link, Briefcase, Scissors, Smartphone, CircleDollarSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PrintHeader } from '@/components/dashboard/PrintHeader'

type Product = {
  _id: string
  name: string
  price: number
  costPrice?: number
  stock: number
  branchId?: string
  location?: string
  category?: string
}

type SaleItem = {
  productId: string
  productName: string
  qty: number
  actualUnitPrice: number
  costAtSale: number
  fulfillmentLocation?: string
}

type Sale = {
  _id: string
  date: string
  items?: SaleItem[]
  totalSalePrice?: number
  totalCost?: number
  profit?: number
  total?: number 
  createdAt: string
  customer?: string
}

type Expense = {
  _id: string
  title: string
  amount: number
  category?: string
  date: string
  createdAt: string
}

type Branch = {
  _id: string
  name: string
}

export default function ReportsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [transferOrders, setTransferOrders] = useState<any[]>([])
  const [allTransactions, setAllTransactions] = useState<any[]>([])
  const [allShipments, setAllShipments] = useState<any[]>([])
  const [internalAccounts, setInternalAccounts] = useState<any[]>([])
  const [maintenanceTickets, setMaintenanceTickets] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [businessType, setBusinessType] = useState('B2B_WHALE')
  const [reportData, setReportData] = useState<any>(null)
  const [closing, setClosing] = useState(false)
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [activeDetail, setActiveDetail] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);

  async function fetchAll() {
    setLoading(true)
    try {
      const bQuery = selectedBranch && selectedBranch !== 'all' ? `&branchId=${selectedBranch}` : ''
      const dQuery = `&startDate=${startDate}&endDate=${endDate}`

      const [pRes, sRes, eRes, bRes, toRes, txRes, shRes, settsRes, iaRes, maintRes, rptRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/sales'),
        fetch('/api/expenses'),
        fetch('/api/branches'),
        fetch('/api/inventory/transfer?branchId=all'),
        fetch('/api/transactions?limit=all'),
        fetch('/api/shipments'),
        fetch('/api/settings'),
        fetch('/api/internal-accounts'),
        fetch('/api/maintenance'),
        fetch(`/api/reports?${bQuery}${dQuery}`)
      ])
      const [pData, sData, eData, bData, toData, txData, shData, settsData, iaData, maintData, rptData] = await Promise.all([
        pRes.json(), sRes.json(), eRes.json(), bRes.json(), toRes.json(), txRes.json(), shRes.json(), settsRes.json(), iaRes.json(), maintRes.json(), rptRes.json()
      ])
      
      setProducts(pData.products ?? [])
      setSales(sData.sales ?? [])
      setExpenses(eData.expenses ?? [])
      setBranches(bData.branches ?? [])
      setTransferOrders(toData.orders ?? [])
      setAllTransactions(txData.transactions ?? [])
      setAllShipments(shData.shipments ?? [])
      if (settsData && settsData.businessType) setBusinessType(settsData.businessType)
      setInternalAccounts(iaData.accounts ?? [])
      setMaintenanceTickets(maintData.tickets ?? [])
      if (rptData.success) setReportData(rptData.data)
    } catch (err) {
      console.error('[Reports] fetch error', err)
    } finally {
      setLoading(false)
    }
  }

  async function closePeriod() {
    setClosing(true)
    try {
      const res = await fetch('/api/reports/close-period', { method: 'POST' })
      const d = await res.json()
      if (d.success) {
        fetchAll()
      }
    } catch {
      console.error('Failed to close period')
    } finally {
      setClosing(false)
      setShowCloseModal(false)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) fetchAll()
  }, [startDate, endDate, selectedBranch, mounted])

  // ================= B2B AGGREGATION & TABLE FILTERING =================
  const { filteredSales, filteredExpenses } = useMemo(() => {
    const start = startDate ? new Date(startDate) : new Date('2000-01-01'); start.setHours(0,0,0,0)
    const end = endDate ? new Date(endDate) : new Date(); end.setHours(23,59,59,999)

    const matchedSales: Sale[] = []
    const matchedExpenses: Expense[] = []

    sales.forEach(sale => {
      const saleDate = new Date(sale.date || sale.createdAt)
      if (saleDate >= start && saleDate <= end) {
        let saleGRev = 0; let saleGCost = 0
        sale.items?.forEach(item => { saleGRev += (item.actualUnitPrice * item.qty); saleGCost += (item.costAtSale * item.qty) })
        if (!sale.items || sale.items.length === 0) { saleGRev = sale.totalSalePrice ?? sale.total ?? 0; saleGCost = sale.totalCost ?? 0 }
        matchedSales.push({ ...sale, totalSalePrice: saleGRev, profit: saleGRev - saleGCost, totalCost: saleGCost })
      }
    })

    expenses.forEach(exp => {
      const expDate = new Date(exp.date || exp.createdAt)
      if (expDate >= start && expDate <= end) { matchedExpenses.push(exp) }
    })

    return { filteredSales: matchedSales, filteredExpenses: matchedExpenses }
  }, [sales, expenses, startDate, endDate, selectedBranch])


  const handlePrint = () => {
    document.title = `Report_${startDate}_to_${endDate}`
    window.print()
  }

  const cardStyle: React.CSSProperties = {
    background: 'rgba(6,182,212,0.03)', borderRadius: 20, padding: '1.75rem',
    border: '1px solid rgba(6,182,212,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
  }

  if (!mounted) return null

  // ============================ UNIFIED CORPORATE VIEW ============================
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', color: '#F8FAFC' }}>
      <PrintHeader title="التقرير المالي والتحليل الاستراتيجي" subtitle={startDate && endDate ? `الفترة من ${startDate} إلى ${endDate}` : undefined} />
      
      {/* Header with Close Period Button */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.12em', color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.4rem' }}>ميزانية و مركز مالي موحد</p>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFFFFF' }}>التحليل المالي الموحد</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowCloseModal(true)} disabled={closing} style={{ background: 'rgba(234,179,8,0.1)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 12, padding: '0.75rem 1.25rem', fontWeight: 800, cursor: 'pointer' }}>
             {closing ? <Loader2 className="animate-spin" size={18} /> : <Calendar size={18} />} إغلاق الفترة (Snapshot)
          </button>
          <button onClick={fetchAll} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '0.75rem 1.25rem', fontWeight: 700, cursor: 'pointer' }}><RefreshCw size={18} className={loading?'animate-spin':''} /></button>
          <button onClick={handlePrint} style={{ background: '#06B6D4', color: '#fff', border: 'none', borderRadius: 14, padding: '0.85rem 1.8rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 24px rgba(6,182,212,0.35)' }}><Printer size={20} /> طباعة الميزانية</button>
        </div>
      </div>

      {/* FINANCIAL SNAPSHOT (PHASE 141) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
         <div 
            onClick={() => setActiveDetail('ASSETS')}
            style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(34,197,94,0.1), transparent)', border: '1px solid rgba(34,197,94,0.2)', cursor: 'pointer', transition: 'transform 0.2s ease' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
         >
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#22C55E', textTransform: 'uppercase' }}>إجمالي الأصول (Total Assets)</span>
            <p style={{ fontSize: '2.2rem', fontWeight: 950, color: '#fff' }}>{(reportData?.assets?.total ?? 0).toLocaleString('ar-EG')} <small style={{fontSize:'1rem', color:'#94A3B8'}}>ج.م</small></p>
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94A3B8' }}>Liquidity + Units + Receivables (Click to view)</div>
         </div>
         <div 
            onClick={() => setActiveDetail('LIABILITIES')}
            style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(239,68,68,0.1), transparent)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', transition: 'transform 0.2s ease' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
         >
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase' }}>إجمالي الالتزامات (Total Liabilities)</span>
            <p style={{ fontSize: '2.2rem', fontWeight: 950, color: '#fff' }}>{(reportData?.liabilities?.total ?? 0).toLocaleString('ar-EG')} <small style={{fontSize:'1rem', color:'#94A3B8'}}>ج.م</small></p>
            <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#94A3B8' }}>Total Supplier Debts (Payables) (Click to view)</div>
         </div>
         <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(6,182,212,0.1), transparent)', border: '1px solid rgba(6,182,212,0.2)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#06B6D4', textTransform: 'uppercase' }}>رأس المال العامل (Working Capital)</span>
            <p style={{ fontSize: '2.2rem', fontWeight: 950, color: '#fff' }}>{(reportData?.capital?.workingCapital ?? 0).toLocaleString('ar-EG')} <small style={{fontSize:'1rem', color:'#94A3B8'}}>ج.م</small></p>
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94A3B8' }}>Assets - Liabilities</div>
         </div>
      </div>

      <AnimatePresence>
        {/* Breakdown Modal */}
        {activeDetail && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setActiveDetail(null)}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                style={{ background: '#0B1120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '2.5rem', width: '100%', maxWidth: 500, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>
                      {activeDetail === 'ASSETS' ? 'تفاصيل إجمالي الأصول' : 'تفاصيل الالتزامات'}
                    </h3>
                    <button onClick={() => setActiveDetail(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12, padding: '0.5rem', cursor: 'pointer', color: '#fff' }}>×</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {activeDetail === 'ASSETS' ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: '#94A3B8', fontWeight: 700 }}>سيولة الخزينة (Treasury)</span>
                            <span style={{ fontWeight: 900, color: '#fff' }}>{(reportData?.assets?.treasury ?? 0).toLocaleString('ar-EG')} ج.م</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: '#94A3B8', fontWeight: 700 }}>قيمة المخزن الفعلي (Inventory)</span>
                            <span style={{ fontWeight: 900, color: '#fff' }}>{(reportData?.assets?.inventory ?? 0).toLocaleString('ar-EG')} ج.م</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: '#94A3B8', fontWeight: 700 }}>ديون العملاء (Receivables)</span>
                            <span style={{ fontWeight: 900, color: '#fff' }}>{(reportData?.assets?.customers ?? 0).toLocaleString('ar-EG')} ج.م</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <span style={{ color: '#22C55E', fontWeight: 900, fontSize: '1.1rem' }}>الإجمالي (Total Assets)</span>
                            <span style={{ color: '#22C55E', fontWeight: 900, fontSize: '1.1rem' }}>{(reportData?.assets?.total ?? 0).toLocaleString('ar-EG')} ج.م</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: '#94A3B8', fontWeight: 700 }}>ديون الموردين (Payables)</span>
                            <span style={{ fontWeight: 900, color: '#fff' }}>{(reportData?.liabilities?.suppliers ?? 0).toLocaleString('ar-EG')} ج.م</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <span style={{ color: '#EF4444', fontWeight: 900, fontSize: '1.1rem' }}>إجمالي الالتزامات</span>
                            <span style={{ color: '#EF4444', fontWeight: 900, fontSize: '1.1rem' }}>{(reportData?.liabilities?.total ?? 0).toLocaleString('ar-EG')} ج.م</span>
                        </div>
                      </>
                    )}
                </div>

                <button onClick={() => setActiveDetail(null)} style={{ width: '100%', marginTop: '2.5rem', background: '#06B6D4', color: '#fff', border: 'none', borderRadius: 12, padding: '1rem', fontWeight: 800, cursor: 'pointer' }}>
                    إغلاق النافذة
                </button>
              </motion.div>
          </div>
        )}

        {/* Custom Close Period Confirmation Modal (Phase 151) */}
        {showCloseModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }} onClick={() => setShowCloseModal(false)}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                onClick={(e) => e.stopPropagation()}
                style={{ background: '#0B1120', border: '2px solid rgba(234,179,8,0.3)', borderRadius: 32, padding: '3rem', width: '100%', maxWidth: 500, boxShadow: '0 25px 60px -12px rgba(0,0,0,0.7)', textAlign: 'center' }}
              >
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <ShieldAlert size={40} color="#EAB308" />
                </div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fff', marginBottom: '1rem' }}>إغلاق الفترة المالية</h3>
                <p style={{ color: '#94A3B8', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
                    هل أنت متأكد من حفظ قيمة المخزون الحالي؟ <br/>
                    <span style={{ color: '#EAB308', fontWeight: 700 }}>سيتم استخدام هذه القيمة كمخزون "أول المدة" للفترة القادمة.</span>
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <button 
                      onClick={() => setShowCloseModal(false)}
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: 16, padding: '1.2rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      إلغاء
                    </button>
                    <button 
                      onClick={closePeriod}
                      disabled={closing}
                      style={{ background: '#EAB308', color: '#000', border: 'none', borderRadius: 16, padding: '1.2rem', fontWeight: 950, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 8px 32px rgba(234,179,8,0.3)' }}
                    >
                      {closing ? <Loader2 className="animate-spin" size={20} /> : 'تأكيد الإغلاق'}
                    </button>
                </div>
              </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Date & Branch Filters */}
      <div className="no-print" style={{ ...cardStyle, background: 'rgba(6,182,212,0.05)', marginBottom: '2.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end', padding: '1.5rem' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', marginBottom: '0.5rem', display: 'block' }}>من تاريخ</label>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{ width: '100%', background: '#0B1120', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 12, padding: '0.75rem', color: '#fff', outline: 'none' }} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', marginBottom: '0.5rem', display: 'block' }}>إلى تاريخ</label>
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={{ width: '100%', background: '#0B1120', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 12, padding: '0.75rem', color: '#fff', outline: 'none' }} />
        </div>
        <div style={{ flex: 1.5, minWidth: 250 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', marginBottom: '0.5rem', display: 'block' }}>تصفية حسب الموقع / الفرع</label>
          <select value={selectedBranch} onChange={e=>setSelectedBranch(e.target.value)} style={{ width: '100%', background: '#0B1120', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 12, padding: '0.75rem', color: '#fff', outline: 'none' }}>
            <option value="all">كل الفروع والمستودعات</option>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* STRATEGIC P&L ENGINE */}
      <div style={{ ...cardStyle, background: 'linear-gradient(180deg, rgba(168,85,247,0.02) 0%, rgba(168,85,247,0.08) 100%)', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <BarChart3 size={24} color="#A855F7" />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#A855F7' }}>بيان الدخل الاستراتيجي (Strategic P&L Dashboard)</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
           <div style={{ background: '#0B1120', padding: '1.2rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 800 }}>مخزون أول المدة</span>
              <p style={{ fontSize: '1.4rem', fontWeight: 900 }}>{(reportData?.pnl?.openingStock ?? 0).toLocaleString('ar-EG')}</p>
           </div>
           <div style={{ background: '#0B1120', padding: '1.2rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 800 }}>إجمالي المشتريات (الفترة)</span>
              <p style={{ fontSize: '1.4rem', fontWeight: 900 }}>{(reportData?.pnl?.purchases ?? 0).toLocaleString('ar-EG')}</p>
           </div>
           <div style={{ background: '#0B1120', padding: '1.2rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 800 }}>مخزون آخر المدة (Units)</span>
              <p style={{ fontSize: '1.4rem', fontWeight: 900 }}>{(reportData?.assets?.inventory ?? 0).toLocaleString('ar-EG')}</p>
           </div>
           <div style={{ background: 'rgba(239,68,68,0.1)', padding: '1.2rem', borderRadius: 16, border: '1px solid rgba(239,68,68,0.2)' }}>
              <span style={{ fontSize: '0.7rem', color: '#EF4444', fontWeight: 800 }}>تكلفة البضاعة المباعة (COGS)</span>
              <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#EF4444' }}>{(reportData?.pnl?.cogs ?? 0).toLocaleString('ar-EG')}</p>
           </div>
           <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), transparent)', padding: '1.2rem', borderRadius: 16, border: '1px solid rgba(34,197,94,0.2)' }}>
              <span style={{ fontSize: '0.7rem', color: '#22C55E', fontWeight: 800 }}>إجمالي المبيعات (النشاط)</span>
              <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#22C55E' }}>{(reportData?.pnl?.revenues ?? 0).toLocaleString('ar-EG')}</p>
           </div>
           <div style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.2), transparent)', padding: '1.2rem', borderRadius: 16, border: '1px solid rgba(234,179,8,0.4)' }}>
              <span style={{ fontSize: '0.75rem', color: '#EAB308', fontWeight: 950 }}>مجمل الربح (Gross Profit)</span>
              <p style={{ fontSize: '1.8rem', fontWeight: 950, color: '#fff' }}>{(reportData?.pnl?.grossProfit ?? 0).toLocaleString('ar-EG')}</p>
           </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'سيولة الخزينة (Liquidity)', value: reportData?.assets?.treasury ?? 0, color: '#06B6D4', icon: Wallet },
          { label: 'مدينون (العملاء)', value: reportData?.assets?.customers ?? 0, color: '#22C55E', icon: TrendingUp },
          { label: 'دائنون (الموردين)', value: reportData?.liabilities?.suppliers ?? 0, color: '#EF4444', icon: ArrowDownToLine },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94A3B8' }}>{s.label}</span>
                <div style={{ padding: '0.5rem', background: `${s.color}15`, borderRadius: 10, border: `1px solid ${s.color}20` }}><Icon size={18} color={s.color} /></div>
              </div>
              <p style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color, direction: 'ltr' }}>{s.value.toLocaleString('ar-EG')} <small style={{fontSize:'0.8rem'}}>ج.م</small></p>
            </div>
          )
        })}
      </div>

      {/* Tables Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
        <section>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#FFFFFF', marginBottom: '1.5rem', borderRight: '4px solid #06B6D4', paddingRight: '1rem' }}>سجل المبيعات التفصيلي</h2>
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', textAlign: 'right', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'rgba(6,182,212,0.06)', borderBottom: '1px solid rgba(6,182,212,0.15)' }}>
                  {['التاريخ', 'الفاتورة', 'العميل', 'المبلغ', 'الربح'].map(h => <th key={h} style={{ padding: '1.1rem', fontWeight: 800, color: '#94A3B8', fontSize: '0.75rem' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(s => (
                  <tr key={s._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '1.1rem' }}>{new Date(s.date).toLocaleDateString('ar-EG')}</td>
                    <td style={{ padding: '1.1rem', fontWeight: 800, color: '#06B6D4' }}>#{s._id.slice(-6).toUpperCase()}</td>
                    <td style={{ padding: '1.1rem' }}>{s.customer || '—'}</td>
                    <td style={{ padding: '1.1rem', fontWeight: 900, color: '#FFFFFF', direction: 'ltr' }}>{(s.totalSalePrice ?? 0).toLocaleString('ar-EG')}</td>
                    <td style={{ padding: '1.1rem', fontWeight: 900, color: '#22C55E' }}>{(s.profit ?? 0).toLocaleString('ar-EG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#FFFFFF', marginBottom: '1.5rem', borderRight: '4px solid #EF4444', paddingRight: '1rem' }}>سجل المصروفات العام</h2>
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', textAlign: 'right', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'rgba(239,68,68,0.06)', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
                  {['التاريخ', 'البند', 'الفئة', 'المبلغ'].map(h => <th key={h} style={{ padding: '1.1rem', fontWeight: 800, color: '#94A3B8', fontSize: '0.75rem' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(e => (
                  <tr key={e._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '1.1rem' }}>{new Date(e.date).toLocaleDateString('ar-EG')}</td>
                    <td style={{ padding: '1.1rem', fontWeight: 800 }}>{e.title}</td>
                    <td style={{ padding: '1.1rem' }}>{e.category || 'عام'}</td>
                    <td style={{ padding: '1.1rem', fontWeight: 900, color: '#EF4444' }}>{e.amount.toLocaleString('ar-EG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: #fff !important; color: #000 !important; }
          table { border: 1px solid #ddd !important; border-collapse: collapse !important; width: 100% !important; }
          th, td { border: 1px solid #ddd !important; padding: 10px !important; color: #000 !important; }
          th { background: #f5f5f5 !important; }
        }
      `}</style>
    </div>
  )
}
