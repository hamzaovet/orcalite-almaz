'use client'

import { useState, useEffect } from 'react'
import { Plus, CreditCard, Wallet, Smartphone, History, Check, Loader2, ArrowRightLeft } from 'lucide-react'
import { motion } from 'framer-motion'

export default function DigitalServicesPage() {
  const [wallets, setWallets] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Forms states
  const [newWallet, setNewWallet] = useState({ name: '', type: 'E-Wallet', openingBalance: 0 })
  const [recharge, setRecharge] = useState({ walletId: '', supplierId: '', amount: 0, paymentMethod: 'Cash' })
  const [sale, setSale] = useState({ walletId: '', serviceName: '', cost: 0, finalPrice: 0 })

  const [savingWallet, setSavingWallet] = useState(false)
  const [savingRecharge, setSavingRecharge] = useState(false)
  const [savingSale, setSavingSale] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [resW, resS] = await Promise.all([
        fetch('/api/digital-wallets'),
        fetch('/api/suppliers')
      ])
      const dataW = await resW.json()
      const dataS = await resS.json()
      setWallets(dataW.wallets || [])
      setSuppliers(dataS.suppliers || [])
    } catch {
      showToast('فشل تحميل البيانات', 'err')
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAddWallet() {
    if (!newWallet.name) return showToast('الرجاء إدخال اسم المحفظة', 'err')
    setSavingWallet(true)
    try {
      const res = await fetch('/api/digital-wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWallet)
      })
      if (res.ok) {
        showToast('تم إضافة المحفظة', 'ok')
        setNewWallet({ name: '', type: 'E-Wallet', openingBalance: 0 })
        fetchData()
      } else {
        throw new Error('فشل الإضافة')
      }
    } catch (err: any) {
      showToast(err.message, 'err')
    } finally {
      setSavingWallet(false)
    }
  }

  async function handleRecharge() {
    if (!recharge.walletId || !recharge.supplierId || recharge.amount <= 0) return showToast('الرجاء تعبئة جميع الحقول بشكل صحيح', 'err')
    setSavingRecharge(true)
    try {
      const res = await fetch('/api/digital-wallets/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recharge)
      })
      const data = await res.json()
      if (res.ok) {
        showToast(data.message, 'ok')
        setRecharge({ walletId: '', supplierId: '', amount: 0, paymentMethod: 'Cash' })
        fetchData()
      } else {
        throw new Error(data.message)
      }
    } catch (err: any) {
      showToast(err.message, 'err')
    } finally {
      setSavingRecharge(false)
    }
  }

  async function handleSale() {
    if (!sale.walletId || !sale.serviceName || sale.cost <= 0 || sale.finalPrice <= 0) return showToast('الرجاء تعبئة جميع الحقول بشكل صحيح', 'err')
    if (sale.finalPrice < sale.cost) return showToast('سعر البيع لا يمكن أن يكون أقل من التكلفة!', 'err')
    
    setSavingSale(true)
    try {
      const res = await fetch('/api/digital-wallets/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale)
      })
      const data = await res.json()
      if (res.ok) {
        showToast(data.message, 'ok')
        setSale({ walletId: '', serviceName: '', cost: 0, finalPrice: 0 })
        fetchData()
      } else {
        throw new Error(data.message)
      }
    } catch (err: any) {
      showToast(err.message, 'err')
    } finally {
      setSavingSale(false)
    }
  }

  const cardStyle = { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 24, padding: '2rem' }
  const inputStyle = { background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 12, padding: '1rem', color: '#0F172A', outline: 'none', width: '100%', fontSize: '1rem', boxSizing: 'border-box' as const }
  const lblStyle = { fontSize: '0.85rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.5rem' }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Loader2 className="animate-spin text-cyan-500" size={48} /></div>

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', color: '#1E293B' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: toast.type === 'ok' ? '#10B981' : '#EF4444', color: '#0F172A', padding: '0.7rem 1.6rem', borderRadius: 50, fontWeight: 800, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Smartphone color="#06B6D4" size={32} /> الخدمات الرقمية والمحافظ (Digital Bank)
          </h1>
          <p style={{ color: '#475569', marginTop: '0.5rem' }}>إدارة أرصدة الماكينات، شحن الأرصدة، وبيع الخدمات (فوري، كروت شحن، دفع فواتير)</p>
        </div>
      </div>

      {/* Wallets Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {wallets.map(w => (
          <motion.div key={w._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(59,130,246,0.1))', padding: '1.5rem', borderRadius: 20, border: '1px solid rgba(6,182,212,0.2)' }}>
             <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0F172A', marginBottom: '0.5rem' }}>{w.name}</h3>
             <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: 8, color: '#475569' }}>{w.type}</span>
             <div style={{ marginTop: '1.5rem', fontSize: '2rem', fontWeight: 900, color: '#06B6D4' }}>
                {w.balance.toLocaleString('ar-EG')} <span style={{ fontSize: '1rem', color: '#475569' }}>ج.م</span>
             </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Left Col: POS Service Sales & Add Wallet */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ ...cardStyle, border: '2px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.03)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '1.5rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard /> بيع خدمات وفواتير (POS)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={lblStyle}>1. المحفظة المستخدمة</label>
                <select style={inputStyle} value={sale.walletId} onChange={e => setSale({...sale, walletId: e.target.value})}>
                  <option value="">-- اختر --</option>
                  {wallets.map(w => <option key={w._id} value={w._id}>{w.name} (المتاح: {w.balance})</option>)}
                </select>
              </div>
              <div>
                <label style={lblStyle}>2. الخدمة (مثال: شحن فودافون، دفع كهرباء)</label>
                <input style={inputStyle} type="text" value={sale.serviceName} onChange={e => setSale({...sale, serviceName: e.target.value})} placeholder="اسم الخدمة..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={lblStyle}>3. التكلفة المخصومة (رصيد)</label>
                  <input style={inputStyle} type="number" value={sale.cost || ''} onChange={e => setSale({...sale, cost: Number(e.target.value)})} placeholder="0" />
                </div>
                <div>
                  <label style={{...lblStyle, color: '#10B981'}}>4. سعر البيع النهائي (كاش)</label>
                  <input style={{...inputStyle, border: '1px solid #10B981', color: '#10B981', fontWeight: 900, fontSize: '1.2rem'}} type="number" value={sale.finalPrice || ''} onChange={e => setSale({...sale, finalPrice: Number(e.target.value)})} placeholder="0" />
                </div>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.1)', padding: '1rem', borderRadius: 12, textAlign: 'center' }}>
                 <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>صافي ربح الخدمة: <strong style={{ color: '#10B981', fontSize: '1.2rem', paddingRight: '0.5rem' }}>{(sale.finalPrice - sale.cost) > 0 ? sale.finalPrice - sale.cost : 0} ج.م</strong></p>
              </div>
              <button onClick={handleSale} disabled={savingSale} style={{ width: '100%', padding: '1.25rem', background: '#10B981', color: '#0F172A', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 8px 32px rgba(16,185,129,0.3)' }}>
                {savingSale ? <Loader2 className="animate-spin" /> : <Check size={20} />} تنفيذ الخدمة ودخول النقدية
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '1.5rem', color: '#06B6D4', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wallet /> إضافة محفظة / ماكينة جديدة
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div><label style={lblStyle}>اسم المحفظة (مثال: مكنة فوري رقم 1)</label><input style={inputStyle} type="text" value={newWallet.name} onChange={e => setNewWallet({...newWallet, name: e.target.value})} /></div>
              <div>
                <label style={lblStyle}>النوع</label>
                <select style={inputStyle} value={newWallet.type} onChange={e => setNewWallet({...newWallet, type: e.target.value})}>
                  <option value="E-Wallet">محفظة إلكترونية</option>
                  <option value="Payment Gateway">بوابة دفع (فوري، أمان)</option>
                  <option value="Mobile Recharge">رصيد شركات محمول</option>
                </select>
              </div>
              <div><label style={lblStyle}>الرصيد الافتتاحي (اختياري)</label><input style={inputStyle} type="number" value={newWallet.openingBalance || ''} onChange={e => setNewWallet({...newWallet, openingBalance: Number(e.target.value)})} /></div>
              <button onClick={handleAddWallet} disabled={savingWallet} style={{ padding: '1rem', background: '#ECFEFF', color: '#06B6D4', border: '1px solid #06B6D4', borderRadius: 12, fontWeight: 800, cursor: 'pointer', marginTop: '0.5rem' }}>{savingWallet ? 'جاري الحفظ...' : 'إضافة الماكينة'}</button>
            </div>
          </div>

        </div>

        {/* Right Col: Recharge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
           <div style={{ ...cardStyle, border: '2px solid rgba(59,130,246,0.3)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '1.5rem', color: '#3B82F6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowRightLeft /> شحن رصيد الماكينة من المورد
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={lblStyle}>1. الماكينة / المحفظة المراد شحنها</label>
                <select style={inputStyle} value={recharge.walletId} onChange={e => setRecharge({...recharge, walletId: e.target.value})}>
                  <option value="">-- اختر --</option>
                  {wallets.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lblStyle}>2. المورد (موردين أرصدة / بنوك)</label>
                <select style={inputStyle} value={recharge.supplierId} onChange={e => setRecharge({...recharge, supplierId: e.target.value})}>
                   <option value="">-- اختر --</option>
                   {/* Preferably only show DIGITAL_BALANCE suppliers if user specifies it, but we show all for flexibility */}
                   {suppliers.map((s: any) => <option key={s._id} value={s._id}>{s.name} {s.supplierType === 'DIGITAL_BALANCE' ? '(مورد ديجيتال)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={lblStyle}>3. قيمة الشحن (الرصيد المضاف)</label>
                <input style={{...inputStyle, fontSize: '1.5rem', fontWeight: 900, textAlign: 'center'}} type="number" value={recharge.amount || ''} onChange={e => setRecharge({...recharge, amount: Number(e.target.value)})} placeholder="0" />
              </div>
              <div>
                <label style={lblStyle}>4. طريقة الدفع للمورد</label>
                <select style={inputStyle} value={recharge.paymentMethod} onChange={e => setRecharge({...recharge, paymentMethod: e.target.value})}>
                  <option value="Cash">كاش (خصم مباشر من الخزنة الرئيسية)</option>
                  <option value="Credit">آجل (إضافة مديونية على حساب المورد)</option>
                </select>
              </div>

              <div style={{ background: 'rgba(59,130,246,0.1)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.85rem', color: '#475569', display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                <History size={18} color="#3B82F6" style={{ marginTop: '0.1rem' }} />
                <span>
                  هذه العملية ستؤدي إلى زيادة رصيد الماكينة. <br />
                  - إذا اخترت <strong>كاش</strong>: سيتم سحب المبلغ من خزنة الكاش وتسجيل منصرف.<br />
                  - إذا اخترت <strong>آجل</strong>: سيتم زيادة حساب المورد (دائن) ولن تتأثر الخزنة المادية.
                </span>
              </div>

              <button onClick={handleRecharge} disabled={savingRecharge} style={{ width: '100%', padding: '1.25rem', background: '#3B82F6', color: '#0F172A', border: 'none', borderRadius: 16, fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 8px 32px rgba(59,130,246,0.3)' }}>
                {savingRecharge ? <Loader2 className="animate-spin" /> : <Plus />} اعتماد عملية الشحن
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { from {transform:rotate(0deg)} to {transform:rotate(360deg)} } .animate-spin { animation: spin 1s linear infinite }
        input::placeholder { color: rgba(148,163,184,0.3); }
      `}</style>
    </div>
  )
}
