'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, X, Loader2, ArrowDownCircle, ArrowUpCircle,
  Banknote, CreditCard, Smartphone, Zap, Building2, Wallet, RefreshCw, Landmark, Printer
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateTransactionReceiptHTML } from '@/utils/printGenerator'

/* ── Types ──────────────────────────────────────────────────── */
type TxType = 'IN' | 'OUT'

interface Channel {
  _id: string
  name: string
  type: string
  totalIn: number
  totalOut: number
  balance: number
  txCount: number
  initialBalance?: number
}

interface TreasuryData {
  channels: Channel[]
  grandTotal: number
  grandIn: number
  grandOut: number
}

interface RecentTx {
  _id: string
  amount: number
  type: TxType
  paymentMethod: string
  description?: string
  date: string
  runningBalance?: number
}

const blankTx = {
  amount: '',
  type: 'IN' as TxType,
  paymentMethod: 'Cash',
  description: '',
  entityType: 'GeneralExpense' as 'Branch' | 'Supplier' | 'Customer' | 'GeneralExpense' | 'BankAccount' | 'OwnerEquity' | 'OPENING_BALANCE',
  entityId: '',
  entityName: '',
  // Forex
  foreignAmountPaid: '',
  actualExchangeRate: '',
  shipmentId: '',
  currency: '',
}

function getAccountMeta(name: string) {
  if (!name) return { icon: Landmark, color: '#475569', labelAr: 'حساب' }
  const lower = name.toLowerCase()
  if (lower.includes('كاش') || lower.includes('safe') || lower.includes('خزينة')) return { icon: Banknote, color: '#22C55E', labelAr: name }
  if (lower.includes('visa') || lower.includes('فيزا')) return { icon: CreditCard, color: '#06B6D4', labelAr: name }
  if (lower.includes('valu')) return { icon: Building2, color: '#A855F7', labelAr: name }
  if (lower.includes('instapay') || lower.includes('إنستاباي')) return { icon: Zap, color: '#FB923C', labelAr: name }
  if (lower.includes('vodafone') || lower.includes('فودافون')) return { icon: Smartphone, color: '#EF4444', labelAr: name }
  
  const colors = ['#3B82F6', '#EC4899', '#F59E0B', '#10B981', '#6366F1', '#8B5CF6']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const color = colors[Math.abs(hash) % colors.length]
  return { icon: Landmark, color, labelAr: name }
}

function fmt(n: number) {
  return (n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0 })
}

export default function TreasuryPage() {
  const [data,      setData]      = useState<TreasuryData | null>(null)
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState({ ...blankTx })
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [deletingId,setDeletingId]= useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [startDate,      setStartDate]      = useState('')
  const [endDate,        setEndDate]        = useState('')

  // Ledger States
  const [ledgerModal, setLedgerModal] = useState(false)
  const [selectedLedgerAcc, setSelectedLedgerAcc] = useState<Channel | null>(null)
  const [ledgerData, setLedgerData] = useState<RecentTx[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(false)

  // Entity Lists
  const [branches,  setBranches]  = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [internalAccounts, setInternalAccounts] = useState<any[]>([])
  const [entityBalance, setEntityBalance] = useState<number | null>(null)
  const [fetchingBalance, setFetchingBalance] = useState(false)

  // Phase 6.5 Modals & Forms
  const [accModal, setAccModal] = useState(false)
  const [xferModal, setXferModal] = useState(false)
  const [accForm, setAccForm] = useState({ name: '', type: 'Bank', balance: '' })
  const [xferForm, setXferForm] = useState({ fromId: '', toId: '', amount: '', notes: '' })
  const [loadingModal, setLoadingModal] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null)

  // Forex / Supplier-Shipment States
  const [supplierShipments, setSupplierShipments] = useState<any[]>([])
  const [forexAutoCalc, setForexAutoCalc] = useState<number | null>(null)

  // ── Step 1: Init branches once on mount, then set default branch ──
  useEffect(() => {
    fetch('/api/branches')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.branches?.length > 0) {
          setBranches(d.branches)
          setSelectedBranch(prev => prev || d.branches[0]._id)
        }
      })
  }, [])

  // ── Step 2: Fetch treasury data whenever branch/dates change ──
  const fetchData = useCallback(async () => {
    if (!selectedBranch) return
    setLoading(true)
    try {
      const dQuery = `&startDate=${startDate}&endDate=${endDate}`
      const [rT, rTx, rSu, rIA] = await Promise.all([
        fetch(`/api/treasury?branchId=${selectedBranch}${dQuery}`),
        fetch(`/api/transactions?limit=20&branchId=${selectedBranch}${dQuery}`),
        fetch('/api/suppliers'),
        fetch(`/api/internal-accounts?branchId=${selectedBranch}`),
      ])
      const dT  = await rT.json()
      const dTx = await rTx.json()
      const dSu = await rSu.json()
      const dIA = await rIA.json()

      if (dT.success)  setData(dT)
      if (dTx.success) setRecentTxs(dTx.transactions ?? [])
      if (dSu.success) setSuppliers(dSu.suppliers ?? [])
      if (dIA.success) setInternalAccounts(dIA.accounts ?? [])
    } catch { showToast('فشل تحميل بيانات اﻟخزنة', 'err') }
    finally { setLoading(false) }
  }, [selectedBranch, startDate, endDate])

  useEffect(() => { fetchData() }, [fetchData])

  // Live Balance Fetcher
  useEffect(() => {
    if (form.entityId) {
       // A. If relational partner (Branch/Supplier)
       if (['Branch', 'Supplier'].includes(form.entityType)) {
          setFetchingBalance(true)
          fetch(`/api/treasury/balance?type=${form.entityType}&id=${form.entityId}`)
            .then(r => r.json())
            .then(d => { if(d.success) setEntityBalance(d.balance) })
            .finally(() => setFetchingBalance(false))
       } 
       // B. If Internal Account (Bank/Wallet) - We already have the currentBalance locally from fetching
       else if (form.entityType === 'BankAccount') {
          const acc = internalAccounts.find(a => a._id === form.entityId)
          setEntityBalance(acc ? acc.currentBalance : null)
       }
    } else {
       setEntityBalance(null)
    }
  }, [form.entityId, form.entityType, internalAccounts])

  // Fetch supplier's shipments when they select a Supplier for OUT payment
  useEffect(() => {
    if (form.entityType === 'Supplier' && form.type === 'OUT' && form.entityId) {
      fetch(`/api/shipments`)
        .then(r => r.json())
        .then(d => {
          const filtered = (d.shipments || []).filter((s: any) => s.supplierId?._id === form.entityId || s.supplierId === form.entityId)
          setSupplierShipments(filtered)
        })
        .catch(() => {})
    } else {
      setSupplierShipments([])
    }
  }, [form.entityId, form.entityType, form.type])

  // Auto-calc EGP from foreign amount * actual exchange rate
  useEffect(() => {
    const foreignAmt = parseFloat(form.foreignAmountPaid)
    const rate = parseFloat(form.actualExchangeRate)
    if (!isNaN(foreignAmt) && !isNaN(rate) && foreignAmt > 0 && rate > 0) {
      const calc = parseFloat((foreignAmt * rate).toFixed(2))
      setForexAutoCalc(calc)
      setForm(f => ({ ...f, amount: String(calc) }))
    } else {
      setForexAutoCalc(null)
    }
  }, [form.foreignAmountPaid, form.actualExchangeRate])

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSave() {
    if (!form.amount || Number(form.amount) <= 0) { showToast('يرجى إدخال مبلغ صحيح', 'err'); return }
    if (!form.description.trim()) { showToast('اﻟبيان مطلوب لتوثيق اﻟحركة', 'err'); return }
    
    // Only require entityId for relational partners AND Bank Accounts
    const isRelational = ['Branch', 'Supplier', 'BankAccount'].includes(form.entityType)
    if (isRelational && !form.entityId) { 
      showToast('يرجى تحديد اﻟجهة اﻟمرتبطة باﻟحركة', 'err'); 
      return 
    }

    // Smart Description: Prepend the free-text name (Owner/Expense) if provided
    // BankAccounts no longer use free-text names
    let finalDescription = form.description.trim()
    const isFreeText = ['GeneralExpense', 'OwnerEquity', 'OPENING_BALANCE'].includes(form.entityType)
    if (isFreeText && form.entityName) {
      finalDescription = `[${form.entityName}] - ${finalDescription}`
    }

    setSaving(true)
    try {
      // Build forex extras if applicable
      const isForexPayment = form.entityType === 'Supplier' && form.type === 'OUT' && form.foreignAmountPaid && form.actualExchangeRate
      const finalType = form.entityType === 'OPENING_BALANCE' ? 'IN' : form.type
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: Number(form.amount), 
          type: finalType, 
          paymentMethod: form.paymentMethod, 
          description: finalDescription, 
          entityType: form.entityType,
          entityId: form.entityId || undefined,
          entityName: form.entityName || undefined,
          branchId: selectedBranch,
          ...(isForexPayment ? {
            foreignAmountPaid: Number(form.foreignAmountPaid),
            actualExchangeRate: Number(form.actualExchangeRate),
            shipmentId: form.shipmentId || undefined,
            currency: supplierShipments.find(s => s._id === form.shipmentId)?.currency || undefined
          } : {})
        }),
      })
      if (!res.ok) throw new Error('فشل اﻟحفظ')
      showToast('تم تسجيل اﻟحركة اﻟمالية ✓', 'ok')
      setModal(false); setForm({ ...blankTx }); setForexAutoCalc(null); fetchData()
    } catch { showToast('حدث خطأ أثناء اﻟحفظ', 'err') }
    finally { setSaving(false) }
  }

  function handlePrint(tx: any) {
    const html = generateTransactionReceiptHTML(tx)
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 500)
    }
  }

  async function openLedger(ch: Channel) {
    setSelectedLedgerAcc(ch)
    setLedgerModal(true)
    setLedgerLoading(true)
    try {
      const res = await fetch(`/api/internal-accounts/${ch._id}/ledger?branchId=${selectedBranch}&startDate=${startDate}&endDate=${endDate}`)
      const d = await res.json()
      if (d.success) {
        setLedgerData(d.transactions ?? [])
        // Ensure we capture the REAL initial balance from the fresh DB fetch
        setSelectedLedgerAcc(prev => prev ? { ...prev, initialBalance: d.account?.initialBalance || 0 } : ch)
      }
    } catch { showToast('فشل تحميل كشف الحساب', 'err') }
    finally { setLedgerLoading(false) }
  }

  function printLedger() {
    if (!selectedLedgerAcc) return
    const win = window.open('', '_blank')
    if (!win) return
    let tableRows = ledgerData.slice().reverse().map(tx => {
      const isIN = tx.type === 'IN'
      return `
        <tr>
          <td>${new Date(tx.date).toLocaleDateString('ar-EG')}</td>
          <td style="color: ${isIN ? 'green' : 'red'};">${isIN ? 'وارد' : 'صادر'}</td>
          <td>${tx.description || ''}</td>
          <td style="color: ${isIN ? 'green' : 'red'};" dir="ltr">${isIN ? '+' : '−'} ${fmt(tx.amount)}</td>
          <td dir="ltr" style="font-weight:bold;">${fmt(tx.runningBalance || 0)}</td>
        </tr>
      `
    }).join('')

    win.document.write(`
      <html dir="rtl">
        <head>
          <title>كشف حساب ${selectedLedgerAcc.name}</title>
          <style>
            body { font-family: Tahoma, Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: right; }
            th, td { border: 1px solid #ddd; padding: 10px; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h2>كشف حساب: ${selectedLedgerAcc.name}</h2>
          <p>نوع الحساب: ${selectedLedgerAcc.type}</p>
          <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الحركة</th>
                <th>البيان</th>
                <th>المبلغ (ج.م)</th>
                <th>الرصيد المجمع (ج.م)</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
      setRecentTxs(prev => prev.filter(t => t._id !== id)); fetchData()
      showToast('تم حذف الحركة', 'ok')
    } catch { showToast('فشل الحذف', 'err') }
    finally { setDeletingId(null) }
  }

  async function handleAddAccount() {
    if (!accForm.name) return showToast('يرجى إدخال اسم الحساب', 'err')
    setLoadingModal(true)
    try {
      const payload: any = { name: accForm.name, type: accForm.type, initialBalance: Number(accForm.balance) || 0 }
      if (selectedBranch && selectedBranch !== 'all') {
        payload.branchId = selectedBranch
      }
      const res = await fetch('/api/internal-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error()
      showToast('تم إضافة الحساب بنجاح', 'ok')
      setAccModal(false); setAccForm({ name: '', type: 'Bank', balance: '' }); fetchData()
    } catch { showToast('فشل إضافة الحساب', 'err') }
    finally { setLoadingModal(false) }
  }

  async function handleDeleteAccount(id: string) {
    setLoadingModal(true)
    try {
      const res = await fetch(`/api/internal-accounts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      showToast('تم حذف الحساب بنجاح', 'ok')
      setInternalAccounts(prev => prev.filter(a => a._id !== id))
      setAccountToDelete(null)
      fetchData() 
    } catch { showToast('فشل حذف الحساب', 'err') }
    finally { setLoadingModal(false) }
  }

  async function handleTransfer() {
    if (!xferForm.fromId || !xferForm.toId || !xferForm.amount) return showToast('يرجى إكمال بيانات التحويل', 'err')
    setLoadingModal(true)
    try {
      const res = await fetch('/api/internal-accounts/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(xferForm)
      })
      if (!res.ok) throw new Error()
      showToast('تم التحويل بنجاح ✓', 'ok')
      setXferModal(false); setXferForm({ fromId: '', toId: '', amount: '', notes: '' }); fetchData()
    } catch { showToast('فشل عملية التحويل', 'err') }
    finally { setLoadingModal(false) }
  }

  const cardStyle: React.CSSProperties = {
    background: 'rgba(6, 182, 212, 0.03)', borderRadius: 20, padding: '1.75rem',
    border: '1px solid rgba(6, 182, 212, 0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.8rem 1rem', border: '1px solid rgba(6, 182, 212, 0.15)',
    borderRadius: 12, fontSize: '0.95rem', fontFamily: 'inherit', color: '#0F172A',
    outline: 'none', background: 'rgba(6, 182, 212, 0.05)', boxSizing: 'border-box'
  }

  // ── Computed totals from the live internalAccounts array ────────
  // If no accounts are registered yet, fall back to the transaction-computed grandTotal from the API
  const totalAvailableBalance = internalAccounts.length > 0
    ? internalAccounts.reduce((sum, account) => sum + (Number(account.currentBalance) || Number(account.balance) || 0), 0)
    : (data?.grandTotal ?? 0)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', color: '#1E293B' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: toast.type === 'ok' ? '#06B6D4' : '#EF4444', color: '#0F172A', padding: '0.65rem 1.5rem', borderRadius: 50, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.22em', color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.4rem' }}>النظام المالي المركزي</p>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0F172A' }}>الخزنة والسيولة</h1>
          <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: '0.2rem' }}>تتبع التدفقات النقدية عبر كافة القنوات</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#ECFEFF', padding: '0.75rem 1.5rem', borderRadius: 20, border: '1px solid rgba(6,182,212,0.2)' }}>
          <Building2 size={20} color="#06B6D4" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.2rem' }}>تصفية حسب الفرع</span>
            <select 
              style={{ background: 'transparent', border: 'none', color: '#0F172A', fontSize: '0.95rem', fontWeight: 900, outline: 'none', cursor: 'pointer', minWidth: 120 }}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              {branches.map(b => (
                <option key={b._id} value={b._id} style={{ background: '#F8FAFC' }}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filters Engine (Phase 139) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#ECFEFF', padding: '0.75rem 1.5rem', borderRadius: 20, border: '1px solid rgba(6,182,212,0.2)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.2rem' }}>من تاريخ</span>
            <input 
              type="date" 
              style={{ background: 'transparent', border: 'none', color: '#0F172A', fontSize: '0.85rem', fontWeight: 800, outline: 'none', cursor: 'pointer' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ height: 24, width: 1, background: 'rgba(6,182,212,0.2)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.2rem' }}>إلى تاريخ</span>
            <input 
              type="date" 
              style={{ background: 'transparent', border: 'none', color: '#0F172A', fontSize: '0.85rem', fontWeight: 800, outline: 'none', cursor: 'pointer' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444', padding: '0.4rem', borderRadius: 50, cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: 12, padding: '0.75rem 1.25rem', fontWeight: 700, cursor: 'pointer' }}><RefreshCw size={18} /></button>
          <button onClick={() => setAccModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ECFEFF', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12, padding: '0.75rem 1.2rem', fontWeight: 700, cursor: 'pointer' }}>إدارة الحسابات</button>
          <button onClick={() => setXferModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(251,146,60,0.1)', color: '#FB923C', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 12, padding: '0.75rem 1.2rem', fontWeight: 700, cursor: 'pointer' }}><RefreshCw size={16} /> تحويل داخلي</button>
          <button onClick={() => setModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 14, padding: '0.85rem 1.8rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 24px rgba(6,182,212,0.3)' }}><Plus size={20} /> تسجيل حركة مالية</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#06B6D4' }}>
          <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto' }} />
        </div>
      ) : (
        <>
          {/* Main Totals Card */}
          <div style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(11,17,32,0.5) 100%)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 24, padding: '2.5rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: '#ECFEFF', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={32} color="#06B6D4" />
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#06B6D4', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>الرصيد الإجمالي المتوفر</p>
                <p style={{ fontSize: '3rem', fontWeight: 900, color: '#0F172A', direction: 'ltr', lineHeight: 1 }}>{fmt(totalAvailableBalance)} <span style={{ fontSize: '1.2rem', color: '#475569' }}>ج.م</span></p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '2.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 800, marginBottom: '0.5rem' }}>إجمالي اﻟوارد</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#22C55E', direction: 'ltr' }}>+ {fmt(data?.grandIn ?? 0)}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 800, marginBottom: '0.5rem' }}>إجمالي اﻟصادر</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#EF4444', direction: 'ltr' }}>- {fmt(data?.grandOut ?? 0)}</p>
              </div>
            </div>
          </div>

          {/* Channels Grid (Phase 150 - Dynamic Mapping) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
            {internalAccounts.map((acc) => {
              // Merge stats from the treasury aggregator if found
              const stats = data?.channels.find(c => c.name === acc.name || c._id === acc._id)
              const meta = getAccountMeta(acc.name); 
              const Icon = meta.icon; const color = meta.color;
              
              return (
                <div key={acc._id} onClick={() => openLedger({ ...acc, totalIn: stats?.totalIn ?? 0, totalOut: stats?.totalOut ?? 0, balance: acc.currentBalance ?? 0, txCount: stats?.txCount ?? 0 })} style={{ ...cardStyle, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: `1px solid ${color}20`, cursor: 'pointer', transition: 'transform 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}10`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={color} /></div>
                    <div><p style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.9rem' }}>{meta.labelAr}</p><p style={{ fontSize: '0.7rem', color: '#475569' }}>{(stats?.txCount ?? 0)} حركة في هذه الفترة</p></div>
                  </div>
                  <p style={{ fontSize: '1.6rem', fontWeight: 900, color: acc.currentBalance >= 0 ? color : '#EF4444', direction: 'ltr' }}>{fmt(acc.currentBalance ?? 0)} <span style={{ fontSize: '0.75rem', color: '#475569' }}>ج.م</span></p>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', fontWeight: 900 }}>
                    <span style={{ color: '#22C55E' }}>↓ {fmt(stats?.totalIn ?? 0)}</span>
                    <span style={{ color: '#EF4444' }}>↑ {fmt(stats?.totalOut ?? 0)}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Transactions Feed */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', marginBottom: '1.25rem' }}>سجل الحركات الأخيرة</h2>
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(6,182,212,0.06)', borderBottom: '1px solid #E2E8F0' }}>
                      {['التاريخ', 'الحركة', 'الفرع', 'المبلغ', 'البيان', ''].map(h => <th key={h} style={{ padding: '1.1rem 1rem', textAlign: 'right', fontWeight: 800, color: '#475569', fontSize: '0.75rem' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[...recentTxs].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((tx: any) => {
                      const isIN = tx.type === 'IN';
                      return (
                        <tr key={tx._id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(6,182,212,0.025)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <td style={{ padding: '1rem', color: '#475569' }}>{new Date(tx.date).toLocaleDateString('ar-EG')}</td>
                          <td style={{ padding: '0.75rem 1rem' }}><span style={{ padding: '0.25rem 0.75rem', borderRadius: 50, background: isIN ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: isIN ? '#22C55E' : '#EF4444', fontWeight: 800, fontSize: '0.7rem' }}>{isIN ? 'وارد' : 'صادر'}</span></td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#06B6D4' }}>{tx.branchId?.name || 'المركز الرئيسي'}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 900, color: isIN ? '#22C55E' : '#EF4444', direction: 'ltr', whiteSpace: 'nowrap', textAlign: 'right' }}>{isIN ? '+' : '−'} {fmt(tx.amount)}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{tx.description || 'بدون بيان'}</td>
                          <td style={{ textAlign: 'center' }}>
                             <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingRight: '1rem' }}>
                                <button onClick={() => handlePrint(tx)} style={{ background: '#ECFEFF', border: 'none', color: '#06B6D4', padding: '0.45rem', borderRadius: 10, cursor: 'pointer' }} title="طباعة إيصال"><Banknote size={16} /></button>
                                <button onClick={() => handleDelete(tx._id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444', padding: '0.45rem', borderRadius: 10, cursor: 'pointer' }}><X size={16} /></button>
                             </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
        </div>
        </>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(8, 12, 20, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(12px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: '#F8FAFC', borderRadius: 28, width: '100%', maxWidth: 480, padding: '2.5rem', border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 32px 100px rgba(0,0,0,0.15)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontWeight: 900, fontSize: '1.5rem', color: '#0F172A' }}>تسجيل حركة مالية</h2>
                <button onClick={() => setModal(false)} style={{ background: '#F8FAFC', border: 'none', borderRadius: 50, padding: '0.4rem', cursor: 'pointer', color: '#0F172A' }}><X size={24} /></button>
              </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>نوع الحركة *</label>
                      <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 12, padding: '0.25rem' }}>
                        {(['IN', 'OUT'] as TxType[]).map(t => (
                          <button key={t} onClick={() => setForm({...form, type: t})} style={{ flex: 1, padding: '0.6rem', borderRadius: 10, fontWeight: 900, cursor: 'pointer', border: 'none', background: form.type === t ? (t==='IN'?'#22C55E': '#EF4444') : 'transparent', color: form.type === t ? '#fff' : '#64748B' }}>{t==='IN'?'وارد':'صادر'}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>اﻟجهة اﻟمرتبطة *</label>
                      <select style={inputStyle} value={form.entityType} onChange={e => {
                        const val = e.target.value as any;
                        setForm({...form, entityType: val, entityId: '', entityName: '', type: val === 'OPENING_BALANCE' ? 'IN' : form.type})
                      }}>
                        <option value="GeneralExpense">مصاريف عامة (General Expense)</option>
                        <option value="Branch">فرع / مندوب (Branch/Rep)</option>
                        <option value="Supplier">مورد (Supplier)</option>
                        <option value="BankAccount">حساب بنكي / محفظة (Bank/Wallet)</option>
                        <option value="OwnerEquity">جاري المالك (Owner Equity)</option>
                        <option value="OPENING_BALANCE">رصيد افتتاحي (Opening Balance)</option>
                      </select>
                    </div>
                 </div>

                 {['GeneralExpense', 'OwnerEquity', 'OPENING_BALANCE'].includes(form.entityType) ? (
                   <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                     <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>
                        {form.entityType === 'GeneralExpense' ? 'جهة الصرف / اﻟبيان (Expense Target) *' : form.entityType === 'OPENING_BALANCE' ? 'تفاصيل الرصيد الافتتاحي (اختياري)' : 'اسم المالك / الحساب الجاري *'}
                     </label>
                     <input style={inputStyle} value={form.entityName} onChange={e => setForm({...form, entityName: e.target.value})} placeholder={form.entityType === 'GeneralExpense' ? "مثال: فاتورة الكهرباء..." : form.entityType === 'OPENING_BALANCE' ? "مثال: رصيد مرحل..." : "اسم المالك..."} />
                   </motion.div>
                 ) : (
                   <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                     <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>تحديد الاسم / الحساب اﻟمرتبط *</label>
                     <select style={inputStyle} value={form.entityId} onChange={e => setForm({...form, entityId: e.target.value})}>
                        <option value="">— اختر من اﻟقائمة —</option>
                        {form.entityType === 'Branch' && branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                        {form.entityType === 'Supplier' && suppliers.map(s => <option key={s._id} value={s._id}>{s.name || s.contactPerson}</option>)}
                        {form.entityType === 'BankAccount' && internalAccounts.map(a => <option key={a._id} value={a._id}>{a.name} ({a.type === 'Bank' ? 'بنك' : 'محفظة'})</option>)}
                     </select>
                   </motion.div>
                 )}

                 {entityBalance !== null && (
                   <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: '#ECFEFF', border: '1px solid rgba(6,182,212,0.2)', padding: '1rem', borderRadius: 12, textAlign: 'center' }}>
                      <p style={{ fontSize: '0.7rem', color: '#06B6D4', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                         {form.entityType === 'BankAccount' ? 'رصيد اﻟحساب اﻟحالي (Accounts Balance)' : 'اﻟرصيد اﻟحالي المستحق (Live Debt)'}
                      </p>
                      <h4 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0F172A' }}>{fmt(entityBalance)} <span style={{ fontSize: '0.8rem', color: '#06B6D4' }}>ج.م</span></h4>
                   </motion.div>
                 )}


                   {/* Forex Supplier Payment Section */}
                   {form.entityType === 'Supplier' && form.type === 'OUT' && form.entityId && (
                     <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                       style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 14, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                       <p style={{ fontSize: '0.72rem', fontWeight: 900, color: '#FB923C', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{'🌐 دفع بعملة أجنبية (Forex Payment)'}</p>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                         <div>
                           <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.4rem', display: 'block' }}>{'الرسالة المرتبطة بالدفعة (اختياري)'}</label>
                           <select style={inputStyle} value={form.shipmentId} onChange={e => setForm({...form, shipmentId: e.target.value})}>
                             <option value="">{'— اختر الرسالة —'}</option>
                             {supplierShipments.map(s => <option key={s._id} value={s._id}>{s.shipmentNumber} ({s.currency} @ {s.exchangeRate})</option>)}
                           </select>
                         </div>
                         <div>
                           <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FB923C', marginBottom: '0.4rem', display: 'block' }}>{'المبلغ الأجنبي المدفوع'}</label>
                           <input type="number" step="0.01" style={{...inputStyle, direction: 'ltr', border: '1px solid rgba(251,146,60,0.4)'}} value={form.foreignAmountPaid} onChange={e => setForm({...form, foreignAmountPaid: e.target.value})} placeholder="0.00" />
                         </div>
                       </div>
                       <div>
                         <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FB923C', marginBottom: '0.4rem', display: 'block' }}>{'سعر الصرف الفعلي يوم السداد'}</label>
                         <input type="number" step="0.001" style={{...inputStyle, direction: 'ltr', border: '1px solid rgba(251,146,60,0.4)'}} value={form.actualExchangeRate} onChange={e => setForm({...form, actualExchangeRate: e.target.value})} placeholder="0.000" />
                       </div>
                       {forexAutoCalc !== null && (
                         <div style={{ background: 'rgba(251,146,60,0.1)', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <span style={{ fontSize: '0.75rem', color: '#FB923C', fontWeight: 800 }}>{'المبلغ المحسوب تلقائياً بالجنيه 🔒'}</span>
                           <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0F172A', direction: 'ltr' }}>{fmt(forexAutoCalc)}</span>
                         </div>
                       )}
                     </motion.div>
                   )}


                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>
                          {forexAutoCalc !== null ? 'المبلغ (ج.م) — محسوب ومقفل 🔒' : 'المبلغ (ج.م) *'}
                        </label>
                        <input
                          type="number"
                          style={{
                            ...inputStyle,
                            fontSize: '1.25rem', fontWeight: 900, direction: 'ltr',
                            ...(forexAutoCalc !== null ? {
                              background: 'rgba(251,146,60,0.06)',
                              border: '1px solid rgba(251,146,60,0.4)',
                              color: '#FB923C',
                              cursor: 'not-allowed'
                            } : {})
                          }}
                          value={form.amount}
                          onChange={e => { if (forexAutoCalc === null) setForm({...form, amount: e.target.value}) }}
                          readOnly={forexAutoCalc !== null}
                          placeholder="0.00"
                        />
                      </div>
                      <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>القناة المالية *</label>
                        <select style={inputStyle} value={form.paymentMethod || 'Cash'} onChange={e => setForm({...form, paymentMethod: e.target.value})}>
                          <option value="Cash">كاش (نقدي)</option>
                          {internalAccounts.map(acc => (
                            <option key={acc._id} value={acc.name}>{acc.name}</option>
                          ))}
                        </select>
                      </div>
                   </div>

                  <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>البيان / اﻟنثرية *</label><input style={inputStyle} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="مثال: تحصيل عُهدة، دفعة مورد، مصاريف نقل..." /></div>
                
                <button
                  onClick={handleSave} disabled={saving}
                  style={{ background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 16, padding: '1.1rem', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', marginTop: '1rem', boxShadow: '0 8px 32px rgba(6,182,212,0.3)' }}
                >
                  {saving ? <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto' }} /> : 'تأكيد العملية'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ledger Modal */}
      <AnimatePresence>
        {ledgerModal && selectedLedgerAcc && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(8, 12, 20, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(12px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: '#F8FAFC', borderRadius: 28, width: '100%', maxWidth: 750, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '2.5rem', border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 32px 100px rgba(0,0,0,0.15)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontWeight: 900, fontSize: '1.5rem', color: '#0F172A' }}>كشف حساب تفصيلي</h2>
                  <p style={{ color: '#06B6D4', fontWeight: 800 }}>حساب: {selectedLedgerAcc.name}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={printLedger} style={{ background: '#ECFEFF', color: '#06B6D4', border: 'none', borderRadius: 12, padding: '0.6rem 1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><Printer size={18} /> 🖨️ طباعة الكشف</button>
                  <button onClick={() => setLedgerModal(false)} style={{ background: '#F8FAFC', border: 'none', borderRadius: 50, padding: '0.5rem', cursor: 'pointer', color: '#0F172A' }}><X size={20} /></button>
                </div>
              </div>

              {ledgerLoading ? (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Loader2 size={32} className="animate-spin" color="#06B6D4" /></div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', background: '#F8FAFC', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#F1F5F9', zIndex: 10 }}>
                      <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                        {['التاريخ', 'الحركة', 'البيان', 'وارد (+)', 'صادر (−)', 'الرصيد التراكمي'].map(h => <th key={h} style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: '#475569' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {/* ── Transaction Rows (sorted oldest first) ── */}
                      {[...ledgerData]
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .reduce<{ rows: any[]; running: number }>((acc, tx) => {
                          const amt = Number(tx.amount) || 0
                          const newBal = tx.type === 'IN' ? acc.running + amt : acc.running - amt
                          acc.rows.push({ ...tx, computedBalance: newBal })
                          acc.running = newBal
                          return acc
                        }, { rows: [], running: 0 })
                        .rows
                        .map(tx => {
                          const isIN = tx.type === 'IN'
                          return (
                            <tr key={tx._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{new Date(tx.date).toLocaleDateString('ar-EG')}</td>
                              <td style={{ padding: '0.85rem 1rem' }}>
                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: 50, background: isIN ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: isIN ? '#22C55E' : '#EF4444', fontWeight: 800, fontSize: '0.7rem' }}>{isIN ? 'وارد' : 'صادر'}</span>
                              </td>
                              <td style={{ padding: '0.85rem 1rem', color: '#E2E8F0' }}>{tx.description}</td>
                              {/* وارد (+) */}
                              <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 800, color: isIN ? '#22C55E' : '#334155' }}>
                                {isIN ? fmt(tx.amount) : '—'}
                              </td>
                              {/* صادر (−) */}
                              <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 800, color: !isIN ? '#EF4444' : '#334155' }}>
                                {!isIN ? fmt(tx.amount) : '—'}
                              </td>
                              {/* الرصيد التراكمي */}
                              <td style={{ padding: '0.85rem 1rem', fontWeight: 900, direction: 'ltr', color: tx.computedBalance >= 0 ? '#fff' : '#EF4444' }}>
                                {fmt(tx.computedBalance)} <span style={{fontSize:'0.65rem', color: '#475569'}}>ج.م</span>
                              </td>
                            </tr>
                          )
                        })
                      }
                      {ledgerData.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#475569' }}>لا توجد حركات مسجلة لهذا الحساب</td></tr>}
                    </tbody>

                  </table>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Internal Accounts Modal */}
      <AnimatePresence>
        {accModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(8, 12, 20, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(12px)' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              style={{ background: '#F8FAFC', borderRadius: 24, width: '100%', maxWidth: 450, padding: '2rem', border: '1px solid rgba(6,182,212,0.2)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: 900, color: '#0F172A' }}>إدارة الحسابات البنكية والمحافظ</h3>
                <button onClick={() => setAccModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', maxHeight: 300, overflowY: 'auto', paddingRight: '0.5rem' }}>
                {internalAccounts.map(acc => (
                  <div key={acc._id} style={{ background: '#F1F5F9', padding: '0.75rem 1rem', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {accountToDelete === acc._id ? (
                           <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button onClick={() => handleDeleteAccount(acc._id)} style={{ background: '#EF4444', color: '#0F172A', border: 'none', borderRadius: 6, padding: '0.3rem 0.6rem', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}>تأكيد الحذف</button>
                              <button onClick={() => setAccountToDelete(null)} style={{ background: 'rgba(255,255,255,0.1)', color: '#0F172A', border: 'none', borderRadius: 6, padding: '0.3rem 0.6rem', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}>إلغاء</button>
                           </div>
                        ) : (
                           <button onClick={() => setAccountToDelete(acc._id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 8, padding: '0.4rem', cursor: 'pointer', color: '#EF4444' }} title="حذف الحساب"><X size={14} /></button>
                        )}
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{acc.name}</p>
                          <p style={{ fontSize: '0.7rem', color: '#475569' }}>{acc.type === 'Bank' ? 'حساب بنكي' : acc.type === 'Safe' ? 'خزينة' : 'محفظة / وسيط'}</p>
                        </div>
                      </div>
                      <p style={{ fontWeight: 900, color: acc.currentBalance >= 0 ? '#22C55E' : '#EF4444' }}>{fmt(acc.currentBalance)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #F8FAFC', marginBottom: '1.5rem' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <input style={inputStyle} placeholder="اسم الحساب الجديد..." value={accForm.name} onChange={e => setAccForm({...accForm, name: e.target.value})} />
                <select style={inputStyle} value={accForm.type} onChange={e => setAccForm({...accForm, type: e.target.value})}>
                  <option value="Bank">حساب بنكي</option>
                  <option value="Wallet">محفظة إلكترونية</option>
                </select>
              </div>
              <input style={inputStyle} type="number" placeholder="اﻟرصيد الافتتاحي (اختياري)" value={accForm.balance} onChange={e => setAccForm({...accForm, balance: e.target.value})} />
              <button onClick={handleAddAccount} disabled={loadingModal} style={{ width: '100%', background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 12, padding: '0.9rem', fontWeight: 800, marginTop: '1.5rem', cursor: 'pointer' }}>
                {loadingModal ? <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto' }} /> : 'إضافة حساب جديد'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Internal Transfer Modal */}
      <AnimatePresence>
        {xferModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(8, 12, 20, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(12px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: '#F8FAFC', borderRadius: 24, width: '100%', maxWidth: 450, padding: '2rem', border: '1px solid rgba(251,146,60,0.2)', boxShadow: '0 32px 100px rgba(0,0,0,0.15)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h3 style={{ fontWeight: 900, fontSize: '1.4rem', color: '#FB923C' }}>🔄 تحويل مالي داخلي</h3>
                <button onClick={() => setXferModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={24} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>من حساب (اﻟخصم) *</label>
                  <select style={inputStyle} value={xferForm.fromId} onChange={e => setXferForm({...xferForm, fromId: e.target.value})}>
                    <option value="">— اختر اﻟحساب —</option>
                    {internalAccounts.map(a => <option key={a._id} value={a._id}>{a.name} ({fmt(a.currentBalance)})</option>)}
                  </select>
                </div>
                <div style={{ textAlign: 'center' }}><ArrowDownCircle size={32} color="rgba(251,146,60,0.3)" style={{ margin: '0 auto' }} /></div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>إلى حساب (اﻹضافة) *</label>
                  <select style={inputStyle} value={xferForm.toId} onChange={e => setXferForm({...xferForm, toId: e.target.value})}>
                    <option value="">— اختر اﻟحساب —</option>
                    {internalAccounts.map(a => <option key={a._id} value={a._id}>{a.name} ({fmt(a.currentBalance)})</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                   <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>المبلغ *</label><input type="number" style={{...inputStyle, fontWeight: 900, fontSize: '1.2rem'}} value={xferForm.amount} onChange={e => setXferForm({...xferForm, amount: e.target.value})} placeholder="0.00" /></div>
                   <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'block' }}>ملاحظات</label><input style={inputStyle} placeholder="سبب اﻟتحويل..." value={xferForm.notes} onChange={e => setXferForm({...xferForm, notes: e.target.value})} /></div>
                </div>
                <button onClick={handleTransfer} disabled={loadingModal} style={{ width: '100%', background: '#FB923C', color: '#0F172A', border: 'none', borderRadius: 16, padding: '1.1rem', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', marginTop: '1rem', boxShadow: '0 8px 32px rgba(251,146,60,0.3)' }}>
                  {loadingModal ? <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} /> : 'إتمام اﻟتحويل اﻟبري'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
