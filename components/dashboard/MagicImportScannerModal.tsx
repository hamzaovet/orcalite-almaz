'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Loader2, Save, Globe, DollarSign, Plus, Package } from 'lucide-react'

interface ParsedImport {
  extractedSupplierName: string
  matchedSupplierId: string
  shipmentNumber: string
  currency: 'USD' | 'AED' | 'EUR'
  exchangeRate: number
  items: Array<{
    name: string
    productId: string
    quantity: number
    unitCostForeign: number
  }>
  expenses: Array<{
    type: string
    amountEGP: number
  }>
}

// ── Simulated AI Logic for Imports (Commercial Invoice) ─────────────────────
async function simulateAIImport(text: string, suppliers: any[], products: any[], currencies: any[]): Promise<ParsedImport> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const extractedSupplier = "Nexus Global Trading"
      const matched = suppliers.find(s => s.name.toLowerCase().includes(extractedSupplier.toLowerCase()))
      
      // Attempt to find USD rate from system
      const usdCurrency = currencies.find(c => c.code === 'USD') || { exchangeRate: 50.0 }

      resolve({
        extractedSupplierName: extractedSupplier,
        matchedSupplierId: matched?._id || '',
        shipmentNumber: "SHP-" + Math.floor(Math.random() * 9000 + 1000),
        currency: 'USD',
        exchangeRate: usdCurrency.exchangeRate,
        items: [
          { 
            name: products[0]?.name || 'Extracted Phone X', 
            productId: products[0]?._id || '', 
            quantity: 50, 
            unitCostForeign: 800 
          },
          { 
            name: products[1]?.name || 'Extracted Watch Z', 
            productId: products[1]?._id || '', 
            quantity: 100, 
            unitCostForeign: 250 
          }
        ],
        expenses: [
          { type: 'Shipping (International)', amountEGP: 15000 },
          { type: 'Customs / Taxes', amountEGP: 25000 }
        ]
      })
    }, 1500)
  })
}

export function MagicImportScannerModal({
  onClose,
  onComplete,
  suppliers,
  products,
  currencies
}: {
  onClose: () => void
  onComplete: (data: any) => void
  suppliers: any[]
  products: any[]
  currencies: any[]
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [rawText, setRawText] = useState('')
  const [parsing, setParsing] = useState(false)
  
  const [parsedData, setParsedData] = useState<ParsedImport | null>(null)
  const [finalSupplierId, setFinalSupplierId] = useState('')

  const card = { background: 'rgba(6,182,212,0.03)', borderRadius: 20, border: '1px solid rgba(6,182,212,0.15)', padding: '1.5rem' }
  const inp = { width: '100%', padding: '0.8rem', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 12, fontSize: '0.9rem', color: '#FFFFFF', outline: 'none', background: 'rgba(6,182,212,0.05)', boxSizing: 'border-box' as const }
  const lbl = { fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }

  async function handleAnalyze() {
    if (!rawText.trim()) return alert('أدخل نص الفاتورة الاستيرادية أولاً')
    setParsing(true)
    const result = await simulateAIImport(rawText, suppliers, products, currencies)
    setParsedData(result)
    setFinalSupplierId(result.matchedSupplierId)
    setStep(2)
    setParsing(false)
  }

  // --- Pro-rata Distribution Calc (Accounting Guardrail) ---
  const calculatedLandedCosts = () => {
    if (!parsedData) return []
    const totalForeignVal = parsedData.items.reduce((sum, it) => sum + (it.quantity * it.unitCostForeign), 0)
    const totalExpensesEGP = parsedData.expenses.reduce((sum, ex) => sum + ex.amountEGP, 0)

    return parsedData.items.map(it => {
      const itemForeignTotal = it.quantity * it.unitCostForeign
      const weight = totalForeignVal > 0 ? itemForeignTotal / totalForeignVal : 0
      const expenseShare = totalExpensesEGP * weight
      const baseCostEGP = itemForeignTotal * parsedData.exchangeRate
      const totalLandedEGP = baseCostEGP + expenseShare
      const unitLandedEGP = it.quantity > 0 ? totalLandedEGP / it.quantity : 0
      return { unitLandedEGP, totalLandedEGP }
    })
  }

  const itemEstimates = calculatedLandedCosts()

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(5,8,15,0.92)', backdropFilter: 'blur(12px)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#0B1120', borderRadius: 32, border: '1px solid rgba(6,182,212,0.25)', width: '100%', maxWidth: 1000, padding: '2.5rem', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.6)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <Globe color="#06B6D4" size={30} /> Smart Import Scanner (Procurement AI)
            </h2>
            <p style={{ color: '#64748B', fontSize: '1rem', marginTop: '0.4rem' }}>تحليل فواتير الاستيراد (Commercial Invoices) وحساب التكلفة النهائية تلقائياً.</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none', borderRadius: 14, padding: '0.6rem', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={card}>
              <label style={lbl}>ألصق محتوى الـ Commercial Invoice أو الـ Packing List هنا</label>
              <textarea 
                style={{ ...inp, minHeight: 300, fontFamily: 'monospace', lineHeight: 1.6 }}
                placeholder="Paste the raw text from your international invoice here..."
                value={rawText}
                onChange={e => setRawText(e.target.value)}
              />
            </div>
            <button 
              onClick={handleAnalyze} 
              disabled={parsing}
              style={{ padding: '1.4rem', borderRadius: 20, background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)', color: '#fff', border: 'none', fontWeight: 900, fontSize: '1.2rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem', boxShadow: '0 12px 32px rgba(6,182,212,0.3)' }}
            >
              {parsing ? <Loader2 className="animate-spin" /> : <Sparkles />} تحليل الرسالة الاستيرادية (Scan)
            </button>
          </div>
        )}

        {step === 2 && parsedData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header Data Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1.5rem' }}>
               <div style={card}>
                  <label style={lbl}>المورد المستخرج: <span style={{ color: '#fff' }}>{parsedData.extractedSupplierName}</span></label>
                  <select style={inp} value={finalSupplierId} onChange={e => setFinalSupplierId(e.target.value)}>
                    <option value="">-- اختر المورد الدولي --</option>
                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                  {!finalSupplierId && <p style={{ color: '#EF4444', fontSize: '0.7rem', marginTop: '0.5rem', fontWeight: 700 }}>⚠️ المورد غير مسجل. يجب الربط يدوياً.</p>}
               </div>
               <div style={card}>
                  <label style={lbl}>العملة وسعر الصرف (Forex)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', padding: '0.4rem 0.6rem', borderRadius: 8, fontWeight: 900 }}>{parsedData.currency}</span>
                    <input type="number" style={{ ...inp, border: '1px solid rgba(6,182,212,0.4)' }} value={parsedData.exchangeRate} onChange={e => setParsedData({ ...parsedData, exchangeRate: Number(e.target.value) })} />
                  </div>
               </div>
               <div style={card}>
                  <label style={lbl}>رقم الرسالة</label>
                  <input style={inp} value={parsedData.shipmentNumber} onChange={e => setParsedData({ ...parsedData, shipmentNumber: e.target.value })} />
               </div>
            </div>

            {/* Verification Table */}
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', background: 'rgba(6,182,212,0.08)', borderBottom: '1px solid rgba(6,182,212,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <h3 style={{ fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Package size={18} color="#06B6D4" /> مراجعة الأصناف وتوزيع التكاليف</h3>
                 <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.1)', padding: '0.3rem 0.7rem', borderRadius: 8 }}>توزيع نسبي (Pro-rata by Value)</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <tr>
                    <th style={{ padding: '1rem', color: '#64748B', fontWeight: 800, fontSize: '0.75rem' }}>المنتج</th>
                    <th style={{ padding: '1rem', color: '#64748B', fontWeight: 800, fontSize: '0.75rem' }}>الكمية</th>
                    <th style={{ padding: '1rem', color: '#64748B', fontWeight: 800, fontSize: '0.75rem' }}>سعر الوحدة ({parsedData.currency})</th>
                    <th style={{ padding: '1rem', color: '#64748B', fontWeight: 800, fontSize: '0.75rem' }}>التكلفة النهائية (EGP)</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.8rem' }}>
                        <select style={inp} value={it.productId} onChange={(e) => {
                          const newItems = [...parsedData.items]; newItems[idx].productId = e.target.value; setParsedData({...parsedData, items: newItems})
                        }}>
                          <option value="">-- اربط بالمنتج --</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.8rem', width: '12%' }}><input type="number" style={{ ...inp, textAlign: 'center' }} value={it.quantity} onChange={e => {
                        const newItems = [...parsedData.items]; newItems[idx].quantity = Number(e.target.value); setParsedData({...parsedData, items: newItems})
                      }} /></td>
                      <td style={{ padding: '0.8rem', width: '18%' }}><input type="number" style={{ ...inp, textAlign: 'center' }} value={it.unitCostForeign} onChange={e => {
                        const newItems = [...parsedData.items]; newItems[idx].unitCostForeign = Number(e.target.value); setParsedData({...parsedData, items: newItems})
                      }} /></td>
                      <td style={{ padding: '0.8rem', width: '20%', textAlign: 'center', fontWeight: 900, color: '#06B6D4' }}>
                         {itemEstimates[idx]?.unitLandedEGP.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expenses Verification */}
            <div style={card}>
               <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1.2rem', color: '#64748B' }}>مصاريف النولون والجمارك المستخرجة</h3>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  {parsedData.expenses.map((ex, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                       <input style={{ ...inp, flex: 2, background: 'transparent', border: 'none' }} value={ex.type} readOnly />
                       <input type="number" style={{ ...inp, flex: 1, border: '1px solid rgba(6,182,212,0.2)' }} value={ex.amountEGP} onChange={e => {
                         const newExp = [...parsedData.expenses]; newExp[idx].amountEGP = Number(e.target.value); setParsedData({...parsedData, expenses: newExp})
                       }} />
                    </div>
                  ))}
               </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
              <button 
                onClick={() => setStep(1)} 
                style={{ flex: 1, padding: '1.2rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94A3B8', fontWeight: 800, cursor: 'pointer' }}
              >
                إعادة التحليل
              </button>
              <button 
                onClick={() => {
                  if (!finalSupplierId) return alert('الرجاء ربط المورد الدولي أولاً')
                  onComplete({
                    ...parsedData,
                    supplierId: finalSupplierId
                  })
                }} 
                style={{ flex: 2, padding: '1.2rem', borderRadius: 16, background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', border: 'none', fontWeight: 950, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.7rem', boxShadow: '0 12px 32px rgba(16,185,129,0.3)' }}
              >
                <Save size={22} /> اعتماد ونقل لمحرك الـ CFO
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
