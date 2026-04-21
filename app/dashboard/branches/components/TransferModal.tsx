'use client'

import { useState, useRef, useEffect } from 'react'
import { Truck, RotateCcw, Scan, X, Trash2, Smartphone, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateTransferReceiptHTML, type ConsignmentData } from '@/utils/printGenerator'
import { openTransferWhatsApp } from '@/components/dashboard/invoiceUtils'

interface TransferModalProps {
  branch: { _id: string; name: string }
  onClose: () => void
  onSuccess: () => void
}

export function TransferModal({ branch, onClose, onSuccess }: TransferModalProps) {
  const [mode, setMode] = useState<'Out' | 'In'>('Out')
  const [imei, setImei] = useState('')
  const [stagedItems, setStagedItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [completedTransfer, setCompletedTransfer] = useState<ConsignmentData | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  
  // Audio Feedback
  const beepSuccess = typeof window !== 'undefined' ? new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3') : null
  const beepError = typeof window !== 'undefined' ? new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3') : null

  useEffect(() => {
    inputRef.current?.focus()
    const timer = setInterval(() => {
      if (document.activeElement?.tagName !== 'INPUT') {
        inputRef.current?.focus()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  async function handleScan(e: React.FormEvent) {
    e.preventDefault()
    const val = imei.trim()
    if (!val) return
    setError('')

    // Check if duplicate in list
    if (stagedItems.some(item => item.serialNumber === val)) {
      setError('الجهاز مضاف بالفعل في القائمة')
      setImei('')
      return
    }

    setVerifying(true)
    try {
      // Look up device to see if it's eligible for the current mode
      const res = await fetch(`/api/inventory?serialNumber=${val}`)
      const data = await res.json()

      if (data.success && data.units.length > 0) {
        const unit = data.units[0]
        
        // Mode-specific validation logic
        if (mode === 'Out') {
          if (unit.locationId) {
            throw new Error('الجهاز موجود بالفعل في عهدة أخرى (لا يمكن صرفه من المخزن الرئيسي)')
          }
          if (unit.status !== 'Available') {
            throw new Error(`حالة الجهاز لا تسمح بالصرف: ${unit.status}`)
          }
        } else {
          // Inbound Mode
          if (String(unit.locationId) !== String(branch._id)) {
            throw new Error('الجهاز غير مسجل في عهدة هذا الفرع/الموزع')
          }
        }

        setStagedItems([unit, ...stagedItems])
        setImei('')
        if (beepSuccess) beepSuccess.play().catch(() => {})
      } else {
        throw new Error('الجهاز غير مسجل في النظام')
      }
    } catch (err: any) {
      setError(err.message)
      if (beepError) beepError.play().catch(() => {})
    } finally {
      setVerifying(false)
    }
  }

  async function handleCommit() {
    if (stagedItems.length === 0) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetBranchId: branch._id,
          mode,
          imeis: stagedItems.map(i => i.serialNumber)
        })
      })
      
      const data = await res.json()
      if (data.success) {
        setSuccessMsg(data.message)
        const totalValue = stagedItems.reduce((sum, item) => sum + (item.productId?.price || item.productId?.costPrice || 0), 0)

        const transferData: ConsignmentData = {
          orderNumber: data.orderNumber,
          date: new Date().toLocaleDateString('ar-EG'),
          time: new Date().toLocaleTimeString('ar-EG'),
          targetName: branch.name,
          targetType: (branch as any).type || 'Branch',
          items: stagedItems.map(i => ({ productName: i.productId?.name, serialNumber: i.serialNumber })),
          totalValue,
          mode,
          notes: mode === 'Out' ? 'صرف بضاعة' : 'إرجاع عُهدة'
        }
        setCompletedTransfer(transferData)
        // Note: We don't auto-close anymore, we show the success screen
      } else {
        throw new Error(data.message)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handlePrint(data: ConsignmentData) {
    const html = generateTransferReceiptHTML(data)
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      // Give a small delay to ensure rendering before print trigger
      setTimeout(() => {
        printWindow.print()
      }, 500)
    }
  }

  const color = mode === 'Out' ? '#06B6D4' : '#FB923C'
  const bg = mode === 'Out' ? 'rgba(6,182,212,0.1)' : 'rgba(251,146,60,0.1)'

  return (
    <>
      <div className="print:hidden" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(8, 12, 20, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(20px)' }}>
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
        style={{ background: '#0B1120', borderRadius: 32, width: '100%', maxWidth: 750, padding: '3rem', border: `1px solid ${color}40`, boxShadow: `0 32px 100px rgba(0,0,0,0.6)` }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: bg, width: 60, height: 60, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 {mode === 'Out' ? <Truck size={30} color={color} /> : <RotateCcw size={30} color={color} />}
              </div>
              <div>
                 <h2 style={{ fontSize: '1.6rem', fontWeight: 950 }}>{mode === 'Out' ? 'صرف بضاعة (Outbound)' : 'إرجاع عُهدة (Inbound)'}</h2>
                 <p style={{ color, fontWeight: 800 }}>الوجهة: {branch.name}</p>
              </div>
           </div>
           <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 50, padding: '0.6rem', cursor: 'pointer', color: '#fff' }}><X size={24} /></button>
        </div>

        <AnimatePresence mode="wait">
          {completedTransfer ? (
            <motion.div key="success-screen" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid #22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <CheckCircle2 size={40} color="#22C55E" />
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.5rem', color: '#fff' }}>تم التحويل بنجاح ✓</h2>
                <p style={{ color: '#94A3B8', marginBottom: '2.5rem', fontSize: '1.1rem' }}>رقم الإذن: {completedTransfer.orderNumber}</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                   <button onClick={() => handlePrint(completedTransfer)} style={{ padding: '1.1rem', background: '#06B6D4', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                     <CheckCircle2 size={18} /> {completedTransfer.mode === 'Out' ? 'طباعة إذن الصرف' : 'طباعة إذن الاستلام'}
                   </button>
                   <button onClick={() => openTransferWhatsApp('', completedTransfer)} style={{ padding: '1.1rem', background: '#22C55E', color: '#fff', border: 'none', borderRadius: 16, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                     <Smartphone size={18} /> مشاركة واتساب
                   </button>
                </div>

                <button onClick={() => { onSuccess(); onClose(); }} style={{ padding: '0.8rem', width: '100%', background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, fontWeight: 700, cursor: 'pointer' }}>إغلاق النافذة</button>
            </motion.div>
          ) : (
            <motion.div key="scanner-screen">
        {/* Mode Toggle */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 20 }}>
           <button onClick={() => {setMode('Out'); setStagedItems([]); setError('')}} style={{ padding: '0.85rem', borderRadius: 16, border: 'none', background: mode === 'Out' ? '#06B6D4' : 'transparent', color: mode === 'Out' ? '#fff' : '#64748B', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}><Truck size={18} /> صرف للفرع</button>
           <button onClick={() => {setMode('In'); setStagedItems([]); setError('')}} style={{ padding: '0.85rem', borderRadius: 16, border: 'none', background: mode === 'In' ? '#FB923C' : 'transparent', color: mode === 'In' ? '#fff' : '#64748B', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}><RotateCcw size={18} /> إرجاع للمخزن</button>
        </div>

        {/* Scanner Input */}
        <form onSubmit={handleScan} style={{ position: 'relative', marginBottom: '1.5rem' }}>
           <input 
             ref={inputRef}
             type="text" 
             value={imei} 
             onChange={e => setImei(e.target.value)}
             placeholder="SCAN IMEI TO STAGE..." 
             style={{ width: '100%', padding: '1.5rem', background: '#080C14', border: `2px solid ${color}60`, borderRadius: 20, fontSize: '1.6rem', fontWeight: 950, textAlign: 'center', letterSpacing: '0.1em', color, outline: 'none', boxShadow: `0 0 30px ${color}10 inset` }} 
           />
           <div style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)' }}>
              {verifying ? <Loader2 className="animate-spin" color={color} size={28} /> : <Scan color={color} size={28} />}
           </div>
        </form>

        {error && <div style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '0.85rem', borderRadius: 12, marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={18} /> {error}</div>}
        {successMsg && <div style={{ color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '0.85rem', borderRadius: 12, marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 900, textAlign: 'center' }}><CheckCircle2 size={18} style={{ display: 'inline', marginLeft: '0.5rem' }} /> {successMsg}</div>}

        {/* Staged Items List */}
        <div style={{ height: 200, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 20, padding: '1rem', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
           {stagedItems.length === 0 ? (
             <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                <Scan size={48} />
             </div>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {stagedItems.map((item, idx) => (
                  <motion.div key={idx} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <Smartphone size={16} color={color} />
                        <div>
                           <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{item.productId?.name}</div>
                           <div style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>{item.serialNumber}</div>
                        </div>
                     </div>
                     <button onClick={() => setStagedItems(stagedItems.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.4rem' }}><Trash2 size={16} /></button>
                  </motion.div>
                ))}
             </div>
           )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
           <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 800 }}>إجمالي الأجهزة</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 950, color }}>{stagedItems.length}</div>
           </div>
           <button 
             onClick={handleCommit}
             disabled={stagedItems.length === 0 || loading || !!successMsg}
             style={{ flex: 3, padding: '1.25rem', borderRadius: 18, background: color, color: '#fff', border: 'none', fontWeight: 950, fontSize: '1.1rem', cursor: 'pointer', boxShadow: `0 8px 32px ${color}40`, opacity: stagedItems.length === 0 || loading ? 0.5 : 1 }}
           >
              {loading ? <Loader2 className="animate-spin" style={{ margin: '0 auto' }} /> : 'تأكيد النقل والتشفير ✓'}
           </button>
        </div>
      </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .animate-spin { animation: spin 1s linear infinite }
        input::placeholder { font-size: 1rem; letter-spacing: 0; opacity: 0.3; }
      `}</style>
    </>
  )
}
