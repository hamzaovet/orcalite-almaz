'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Plus, Trash2, Calculator, Loader2, DollarSign, Box, Truck, BarChart3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ShipmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (shipment: any) => void
  suppliers: { _id: string; name: string }[]
  products: { _id: string; name: string }[]
  initialData?: any
  currencies?: { _id: string; code: string; name: string; exchangeRate: number }[]
  defaultExchangeRate?: number
  defaultExchangeRateUSD?: number
}

export function ShipmentModal({
  isOpen,
  onClose,
  onSave,
  suppliers,
  products,
  initialData,
  currencies = [],
  defaultExchangeRate = 1,
  defaultExchangeRateUSD = 1,
}: ShipmentModalProps) {
  const [form, setForm] = useState({
    _id: '',
    shipmentNumber: '',
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    currency: 'AED',
    exchangeRate: defaultExchangeRate,
    status: 'Draft',
    items: [{ productId: '', quantity: 1, unitCostForeign: 0 }],
    expenses: [{ type: 'Shipping', amountEGP: 0 }],
  })

  const [saving, setSaving] = useState(false)

  const [localProducts, setLocalProducts] = useState(products)
  const [quickAddIndex, setQuickAddIndex] = useState<number | null>(null)
  const [quickForm, setQuickForm] = useState({ name: '', category: 'إكسسوارات', isSerialized: false })
  const [quickSaving, setQuickSaving] = useState(false)
  const [categories, setCategories] = useState<{_id: string, name: string}[]>([])

  useEffect(() => { setLocalProducts(products) }, [products])
  useEffect(() => {
    if (quickAddIndex !== null && categories.length === 0) {
      fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.categories || [])).catch(()=>{})
    }
  }, [quickAddIndex])

  const handleQuickSave = async () => {
    if (!quickForm.name.trim()) return
    setQuickSaving(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickForm.name,
          category: quickForm.category,
          categoryId: categories.find(c => c.name === quickForm.category)?._id || undefined,
          price: 0,
          stock: 0,
          isSerialized: quickForm.isSerialized
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Error saving product')
      
      const newProd = { _id: data.product._id, name: data.product.name }
      setLocalProducts(prev => [...prev, newProd])
      
      if (quickAddIndex !== null) {
        const newItems = [...form.items]
        newItems[quickAddIndex].productId = newProd._id
        setForm({ ...form, items: newItems })
      }
      setQuickAddIndex(null)
      setQuickForm({ name: '', category: 'إكسسوارات', isSerialized: false })
    } catch (err: any) {
      alert(err.message)
    } finally {
      setQuickSaving(false)
    }
  }


  // Initialize form when initialData or modal opens
  useEffect(() => {
    if (initialData) {
      // Normalize items: productId may be a populated object { _id, name } from the API.
      // The dropdown <select> expects a plain string ID, so we unwrap it here.
      const normalizedItems = (initialData.items?.length
        ? initialData.items.map((item: any) => ({
            ...item,
            productId:
              item.productId && typeof item.productId === 'object'
                ? String(item.productId._id ?? '')
                : String(item.productId ?? ''),
          }))
        : [{ productId: '', quantity: 1, unitCostForeign: 0 }])

      setForm({
        ...initialData,
        supplierId:
          initialData.supplierId && typeof initialData.supplierId === 'object'
            ? String(initialData.supplierId._id ?? '')
            : String(initialData.supplierId ?? ''),
        date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        items: normalizedItems,
        expenses: initialData.expenses?.length ? initialData.expenses : [{ type: 'Shipping', amountEGP: 0 }],
      })
    } else {
      const firstCurrency = currencies[0]
      setForm(f => ({ 
        ...f, 
        _id: '', 
        shipmentNumber: `SHP-${Date.now().toString().slice(-4)}`,
        currency: firstCurrency?.code || f.currency,
        exchangeRate: firstCurrency?.exchangeRate || defaultExchangeRate
      }))
    }
  }, [initialData, isOpen, defaultExchangeRate, defaultExchangeRateUSD, currencies])

  // Update exchange rate when currency changes
  const handleCurrencyChange = (curr: string) => {
    const matched = currencies.find(c => c.code === curr)
    const rate = matched ? matched.exchangeRate : (curr === 'USD' ? defaultExchangeRateUSD : defaultExchangeRate)
    setForm({ ...form, currency: curr, exchangeRate: rate })
  }

  // --- Calculations (Bloomberg Logic) ---
  const totals = useMemo(() => {
    const totalForeignVal = form.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCostForeign)), 0)
    const totalExpensesEGP = form.expenses.reduce((sum, exp) => sum + Number(exp.amountEGP), 0)
    
    // Calculate per-item estimates
    const itemEstimates = form.items.map(item => {
      const itemForeignTotal = Number(item.quantity) * Number(item.unitCostForeign)
      const weight = totalForeignVal > 0 ? itemForeignTotal / totalForeignVal : 0
      const expenseShare = totalExpensesEGP * weight
      const baseCostEGP = itemForeignTotal * form.exchangeRate
      const totalLandedEGP = baseCostEGP + expenseShare
      const unitLandedEGP = item.quantity > 0 ? totalLandedEGP / item.quantity : 0
      
      return { unitLandedEGP, totalLandedEGP }
    })

    const totalLandedEGP = (totalForeignVal * form.exchangeRate) + totalExpensesEGP

    return { totalForeignVal, totalExpensesEGP, totalLandedEGP, itemEstimates }
  }, [form.items, form.expenses, form.exchangeRate])

  const addItem = () => setForm({ ...form, items: [...form.items, { productId: '', quantity: 1, unitCostForeign: 0 }] })
  const removeItem = (index: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  
  const addExpense = () => setForm({ ...form, expenses: [...form.expenses, { type: '', amountEGP: 0 }] })
  const removeExpense = (index: number) => setForm({ ...form, expenses: form.expenses.filter((_, i) => i !== index) })

  const handleSubmit = async (targetStatus?: string) => {
    if (!form.shipmentNumber || !form.supplierId) return alert('يرجى إكمال البيانات الأساسية')
    setSaving(true)
    try {
      await onSave({ ...form, status: targetStatus || form.status })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const lbl = { fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.4rem', display: 'block' }
  const inp = { background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '0.75rem', color: '#0F172A', fontSize: '0.9rem', width: '100%', outline: 'none' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 8, 15, 0.9)', backdropFilter: 'blur(8px)', padding: '1.5rem' }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 24, width: '100%', maxWidth: '1100px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.05)' }}
      >
        {/* Header */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 10 }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calculator color="#06B6D4" size={28} />
              {initialData ? 'تعديل رسالة استيرادية' : 'إنشاء رسالة استيرادية جديدة'}
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.85rem' }}>المحرك المالي لحساب تكلفة الاستيراد (Landed Cost)</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none', borderRadius: 12, padding: '0.5rem', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ padding: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div>
              <label style={lbl}>رقم الرسالة (Shipment #)</label>
              <input style={inp} value={form.shipmentNumber} onChange={e => setForm({ ...form, shipmentNumber: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>تاريخ الرسالة</label>
              <input type="date" style={inp} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>المورد</label>
              <select style={inp} value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">اختر المورد...</option>
                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
               <div style={{ flex: 1 }}>
                  <label style={lbl}>العملة</label>
                  <select style={inp} value={form.currency} onChange={e => handleCurrencyChange(e.target.value)}>
                    {currencies.length > 0
                      ? currencies.map(c => <option key={c._id} value={c.code}>{c.code} — {c.name}</option>)
                      : <><option value="AED">AED (درهم)</option><option value="USD">USD (دولار)</option></>}
                  </select>
               </div>
               <div style={{ flex: 1.5 }}>
                  <label style={lbl}>سعر الصرف (EGP)</label>
                  <input type="number" step="0.001" style={{ ...inp, border: '1px solid #06B6D4' }} value={form.exchangeRate} onChange={e => setForm({ ...form, exchangeRate: Number(e.target.value) })} />
               </div>
            </div>
          </div>

          {/* Section B: Items */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#06B6D4', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Box size={20} /> المنتجات والمشتريات</h3>
              <button onClick={addItem} style={{ background: 'rgba(6,182,212,0.1)', color: '#06B6D4', border: 'none', borderRadius: 8, padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Plus size={16} /> إضافة صنف</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', color: '#64748B', fontSize: '0.7rem' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>المنتج</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>الكمية</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>سعر الوحدة ({form.currency})</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>الإجمالي أجنبي</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>تكلفة الوحدة (ج.م)</th>
                  <th style={{ padding: '0.75rem', width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <select style={{...inp, flex: 1}} value={item.productId} onChange={e => {
                          const newItems = [...form.items]; newItems[idx].productId = e.target.value; setForm({ ...form, items: newItems })
                        }}>
                          <option value="">اختر منتج...</option>
                          {localProducts.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                        <button title="إضافة منتج سريع (Quick Add)" onClick={() => setQuickAddIndex(idx)} style={{ background: 'rgba(6,182,212,0.05)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10, padding: '0 0.8rem', cursor: 'pointer', fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <input type="number" style={{ ...inp, textAlign: 'center' }} value={item.quantity} onChange={e => {
                        const newItems = [...form.items]; newItems[idx].quantity = Number(e.target.value); setForm({ ...form, items: newItems })
                      }} />
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <input type="number" step="0.01" style={{ ...inp, textAlign: 'center' }} value={item.unitCostForeign} onChange={e => {
                        const newItems = [...form.items]; newItems[idx].unitCostForeign = Number(e.target.value); setForm({ ...form, items: newItems })
                      }} />
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700, color: '#64748B' }}>
                      {(item.quantity * item.unitCostForeign).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 900, color: '#06B6D4' }}>
                      {totals.itemEstimates[idx]?.unitLandedEGP.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button onClick={() => removeItem(idx)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section C: Expenses */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '3rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#06B6D4', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Truck size={20} /> مصاريف الشحن والجمارك (Landed Costs)</h3>
                <button onClick={addExpense} style={{ background: 'rgba(6,182,212,0.1)', color: '#06B6D4', border: 'none', borderRadius: 8, padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}>+ إضافة مصروف</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {form.expenses.map((exp, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <select style={{ ...inp, flex: 2 }} value={exp.type} onChange={e => {
                      const newExp = [...form.expenses]; newExp[idx].type = e.target.value; setForm({ ...form, expenses: newExp })
                    }}>
                      <option value="شحن دولي">شحن دولي</option>
                      <option value="جمارك">جمارك</option>
                      <option value="نولون وتفريغ">نولون وتفريغ</option>
                      <option value="تخليص جمركي">تخليص جمركي</option>
                      <option value="عمولات بنكية">عمولات بنكية</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                    <input type="number" style={{ ...inp, flex: 1 }} placeholder="المبلغ (ج.م)..." value={exp.amountEGP} onChange={e => {
                      const newExp = [...form.expenses]; newExp[idx].amountEGP = Number(e.target.value); setForm({ ...form, expenses: newExp })
                    }} />
                    <button onClick={() => removeExpense(idx)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Bloomberg Summary Panel */}
            <div style={{ background: '#F8FAFC', borderRadius: 24, border: '1px solid #E2E8F0', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarChart3 size={20} color="#06B6D4" /> ملخص مالي CFO Summary</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>إجمالي الفاتورة ({form.currency})</span>
                  <span style={{ fontWeight: 900, direction: 'ltr' }}>{totals.totalForeignVal.toLocaleString()} {form.currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>إجمالي المصاريف (ج.م)</span>
                  <span style={{ fontWeight: 900, direction: 'ltr', color: '#0F172A' }}>{totals.totalExpensesEGP.toLocaleString()} EGP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>سعر التحويل المطبق</span>
                  <span style={{ fontWeight: 900, color: '#06B6D4' }}>{form.exchangeRate.toFixed(3)}</span>
                </div>
                
                <div style={{ marginTop: '1rem', background: '#FFFFFF', padding: '1.5rem', borderRadius: 16, border: '1px solid #CBD5E1', textAlign: 'center' }}>
                  <p style={{ color: '#06B6D4', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>التكلفة الإجمالية المقدرة (EGP)</p>
                  <p style={{ fontSize: '2rem', fontWeight: 950, color: '#0F172A', margin: 0 }}>{totals.totalLandedEGP.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ fontSize: '1rem', color: '#64748B' }}>ج.م</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'rgba(255, 255, 255, 0.8)', position: 'sticky', bottom: 0 }}>
          <button 
            onClick={() => handleSubmit('Draft')} 
            disabled={saving}
            style={{ padding: '0.9rem 2rem', borderRadius: 12, border: '1px solid #334155', background: 'transparent', color: '#94A3B8', fontWeight: 800, cursor: 'pointer' }}
          >
            حفظ كمسودة (Draft)
          </button>
          
          <button 
            onClick={() => handleSubmit('Received')} 
            disabled={saving}
            style={{ 
              padding: '0.9rem 2.5rem', 
              borderRadius: 12, 
              border: 'none', 
              background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)', 
              color: '#fff', 
              fontWeight: 900, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 10px 25px -5px rgba(6, 182, 212, 0.4)'
            }}
          >
            {saving ? <Loader2 className="animate-spin" /> : 'تم الاستلام واستخراج البضاعة ✓'}
          </button>
        </div>
      
        {/* Quick Add Modal */}
        <AnimatePresence>
          {quickAddIndex !== null && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}>
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{ background: '#FFFFFF', padding: '2rem', borderRadius: 24, width: '100%', maxWidth: 450, border: '1px solid #E2E8F0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                onClick={(e) => e.stopPropagation()} // Prevent bubbling since it's nested
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#A855F7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={22} /> إضافة منتج سريع
                  </h3>
                  <button onClick={(e) => { e.preventDefault(); setQuickAddIndex(null); }} style={{ background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 50, padding: '0.4rem', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.4rem', display: 'block' }}>اسم المنتج *</label>
                    <input style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '0.75rem', color: '#0F172A', fontSize: '0.9rem', width: '100%', outline: 'none' }} autoFocus placeholder="مثال: سكرين حماية آيفون 15" value={quickForm.name} onChange={e => setQuickForm({ ...quickForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.4rem', display: 'block' }}>القسم</label>
                    <select style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '0.75rem', color: '#0F172A', fontSize: '0.9rem', width: '100%', outline: 'none' }} value={quickForm.category} onChange={e => setQuickForm({ ...quickForm, category: e.target.value })}>
                      {categories.length > 0 ? categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>) : <option value="إكسسوارات">إكسسوارات</option>}
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(168,85,247,0.05)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(168,85,247,0.15)' }}>
                    <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', flexShrink: 0 }}>
                      <input type="checkbox" style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} checked={quickForm.isSerialized} onChange={e => setQuickForm({...quickForm, isSerialized: e.target.checked})} />
                      <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: quickForm.isSerialized ? '#06B6D4' : '#E2E8F0', transition: '.3s', borderRadius: '24px' }}>
                        <span style={{ position: 'absolute', height: '14px', width: '14px', left: quickForm.isSerialized ? '22px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.3s', borderRadius: '50%' }} />
                      </span>
                    </label>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: quickForm.isSerialized ? '#06B6D4' : '#A855F7', display: 'block' }}>تتبع بالأرقام التسلسلية (IMEI)</span>
                      <span style={{ fontSize: '0.65rem', color: '#64748B' }}>أوقفه للإكسسوارات والكميات</span>
                    </div>
                  </div>

                  <button onClick={(e) => { e.preventDefault(); handleQuickSave(); }} disabled={quickSaving} style={{ background: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)', color: '#fff', border: 'none', borderRadius: 14, padding: '1rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
                    {quickSaving ? <Loader2 size={20} className="animate-spin" /> : 'حفظ واختيار تلقائي'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
      <style>{`@keyframes spin { from {transform:rotate(0deg)} to {transform:rotate(360deg)} } .animate-spin { animation: spin 1s linear infinite }`}</style>
    </div>
  )
}
