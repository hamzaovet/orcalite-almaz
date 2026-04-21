'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Scan, Box, CheckCircle2, AlertTriangle, Loader2, PackageSearch, RefreshCw, Search, Smartphone, Battery, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { StockMonitor } from './components/StockMonitor'

export default function InventoryScannerPage() {
  const [shipmentOptions, setShipmentOptions] = useState<{label: string, value: string}[]>([])
  const [pendingItems, setPendingItems] = useState<any[]>([])
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [selectedShipment, setSelectedShipment] = useState<string>('')
  const [productsInShipment, setProductsInShipment] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [businessType, setBusinessType] = useState('B2B_WHALE')
  // DUAL TAB STATE
  const [activeTab, setActiveTab] = useState<'RECEIVE' | 'AUDIT'>('RECEIVE')
  const [auditUnits, setAuditUnits] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all')
  const [auditLoading, setAuditLoading] = useState(false)
  
  const [imei, setImei] = useState('')
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [flash, setFlash] = useState<'success' | 'error' | null>(null)
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState({ scanned: 0, total: 0 })
  const [allStats, setAllStats] = useState<Record<string, {scanned: number, total: number}>>({})
  
  // Quick Lookup
  const [searchImei, setSearchImei] = useState('')
  const [lookupResult, setLookupResult] = useState<any>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupErrorMsg, setLookupErrorMsg] = useState('')
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [pendingImei, setPendingImei] = useState('')
  const [attributes, setAttributes] = useState({
    storage: '', color: '', condition: 'New', batteryHealth: 100, notes: ''
  })

  // Ledger Modal State
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [ledgerProduct, setLedgerProduct] = useState<{id: string, name: string} | null>(null)
  const [ledgerData, setLedgerData] = useState<any[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(false)

  async function openLedger(id: string, name: string, branchId: string) {
    if(!id) return;
    setLedgerProduct({id, name})
    setLedgerData([]) // Clear previous data
    setLedgerLoading(true)
    
    try {
      const res = await fetch(`/api/inventory/movement?productId=${id}&branchId=${branchId}`)
      const data = await res.json()
      if(data.success) {
        setLedgerData(data.movements || [])
        setLedgerOpen(true) // ONLY OPEN AFTER FETCH
      }
    } catch(err) {
      console.error('Ledger fetch error:', err)
    } finally {
      setLedgerLoading(false)
    }
  }

  const inputRef = useRef<HTMLInputElement>(null)
  
  // Audio setup
  const beepSuccess = typeof window !== 'undefined' ? new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3') : null
  const beepError = typeof window !== 'undefined' ? new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3') : null

  useEffect(() => {
    if (pendingItems && pendingItems.length > 0) {
      // Use the populated shipmentId to extract unique batches
      const seen = new Map<string, string>()
      pendingItems.forEach((item: any) => {
        const batchId = String(item.shipmentId?._id || 'OPENING_BALANCE')
        const batchLabel = item.shipmentId?.shipmentNumber || 'الرصيد الافتتاحي'
        if (!seen.has(batchId)) seen.set(batchId, batchLabel)
      })
      setShipmentOptions(Array.from(seen.entries()).map(([value, label]) => ({ label, value })))
    } else {
      setShipmentOptions([])
    }
  }, [pendingItems])

  useEffect(() => {
    fetchShipments()
    fetch('/api/settings').then(r=>r.json()).then(d=>{
      if(d && d.businessType) {
        setBusinessType(d.businessType)
        if(d.businessType === 'B2C_RETAIL') {
          // B2C: Fetch all products and act like they are in a "dummy shipment"
          fetch('/api/products').then(r=>r.json()).then(pData => {
            setProductsInShipment((pData.products || []).map((p:any) => ({ productId: p, quantity: p.stock })))
          })
        }
      }
    })
  }, [])

  useEffect(() => {
    if (businessType === 'B2C_RETAIL') return
    if (selectedBatch) {
      setSelectedShipment(selectedBatch)
      fetchProductsForShipment(selectedBatch)
    } else {
      setSelectedShipment('')
      setProductsInShipment([])
      setSelectedProduct('')
      setStats({ scanned: 0, total: 0 })
    }
  }, [selectedBatch, shipmentOptions])

  useEffect(() => {
    if ((selectedShipment || businessType === 'B2C_RETAIL') && selectedProduct && !showModal) {
      fetchProgress()
      if (selectedShipment) fetchAllShipmentProgress(selectedShipment)
      // Lock focus to input only when modal is NOT open
      const timer = setInterval(() => {
        if (document.activeElement?.tagName !== 'INPUT' && inputRef.current) {
           inputRef.current.focus()
        }
      }, 500)
      return () => clearInterval(timer)
    }
  }, [selectedShipment, selectedProduct, showModal])

  async function fetchAllShipmentProgress(shipmentId: string) {
    try {
      const res = await fetch(`/api/inventory?shipmentId=${shipmentId}`)
      const data = await res.json()
      if (data.success) {
        const counts: Record<string, {scanned: number, total: number}> = {}
        data.units.forEach((u: any) => {
          const pid = u.productId?._id
          if (!counts[pid]) counts[pid] = { scanned: 0, total: 0 }
          counts[pid].total++
          // Unit is received if status is not Pending
          if (u.status && u.status !== 'Pending') counts[pid].scanned++
        })
        setAllStats(counts)
      }
    } catch (err) { console.error(err) }
  }

  async function handleLookup() {
    if (!searchImei.trim()) return
    setLookupLoading(true)
    setLookupResult(null)
    setLookupErrorMsg('')
    try {
       const res = await fetch(`/api/inventory?serialNumber=${searchImei.trim()}`)
       const data = await res.json()
       if (data.success && data.units.length > 0) {
         setLookupResult(data.units[0])
       } else {
         setLookupErrorMsg('الإيميل غير مسجل')
       }
    } catch (err) { console.error(err) }
    finally { setLookupLoading(false) }
  }

  async function fetchShipments() {
    try {
      const invRes = await fetch('/api/inventory?status=Pending')
      const iData = await invRes.json()
      setPendingItems(iData.units || [])
      
      // Also fetch Branches for Audit filter
      const branchRes = await fetch('/api/branches')
      const bData = await branchRes.json()
      // Create dropdown including 'المظ 2' and others
      setBranches(bData.branches || [])
    } catch (err) {
      console.error(err)
    } finally {
      setInitialLoading(false)
    }
  }

  async function fetchAuditData() {
    if (auditUnits.length > 0) return
    setAuditLoading(true)
    try {
      const res = await fetch('/api/inventory?status=Available')
      const data = await res.json()
      setAuditUnits(data.units || [])
    } catch (err) { console.error(err) }
    finally { setAuditLoading(false) }
  }

  useEffect(() => {
    if (activeTab === 'AUDIT') {
       fetchAuditData()
    }
  }, [activeTab])

  async function fetchProductsForShipment(id: string) {
    if (!id) {
       setProductsInShipment([])
       return
    }

    const displayItems = pendingItems.filter((item: any) => {
       const batchId = String(item.shipmentId?._id || 'OPENING_BALANCE')
       return batchId === id
    })
    
    const uniqueProductsMap = new Map()
    displayItems.forEach((item: any) => {
       const pId = String(item.productId?._id || item.productId)
       if (!uniqueProductsMap.has(pId)) {
           uniqueProductsMap.set(pId, { productId: item.productId, quantity: 0 })
       }
       // PHASE 111: SOURCE CODE OVERRIDE - Fallback to product stock
       uniqueProductsMap.get(pId).quantity += (item.quantity || item.productId?.stock || 1)
    })

    setProductsInShipment(Array.from(uniqueProductsMap.values()))
  }

  // PHASE 107: FORCED AGGREGATION OVERRIDE
  const aggregatedAuditUnits = useMemo(() => {
    // 1. First apply the branch filter to the raw data
    const branchFiltered = selectedBranchFilter === 'all' 
      ? auditUnits 
      : auditUnits.filter(u => String(u.locationId?._id || u.locationId) === selectedBranchFilter || String(u.locationId?.name).includes(selectedBranchFilter))

    // 2. Perform the exact reducer logic requested by CEO
    const aggregated = branchFiltered.reduce((acc: any, item: any) => {
      const prodId = String(item.productId?._id || item.productId || 'unknown');
      const locName = item.locationId?.name || (item.locationType === 'MainWarehouse' ? 'المخزن الرئيسي' : item.locationId || 'Unknown');
      const key = `${prodId}-${locName}`;
      
      const q = Number(item.quantity) || 1; // Must come from InventoryUnit directly!

      if (!acc[key]) {
        const unitCost = item.landedCostEGP || item.productId?.costPrice || 0;
        acc[key] = { 
          ...item, 
          aggregatedQty: q,
          totalCost: unitCost * q,
          displayLocation: locName
        };
      } else {
        const unitCost = item.landedCostEGP || item.productId?.costPrice || 0;
        acc[key].aggregatedQty += q;
        acc[key].totalCost += (unitCost * q);
      }
      return acc;
    }, {});

    return Object.values(aggregated).map((item: any) => ({
      ...item,
      avgCost: item.aggregatedQty > 0 ? item.totalCost / item.aggregatedQty : 0
    }));
  }, [auditUnits, selectedBranchFilter])

  const auditTotals = useMemo(() => {
    return aggregatedAuditUnits.reduce((acc: any, curr: any) => {
      acc.totalQty += curr.aggregatedQty
      acc.totalValue += (curr.avgCost * curr.aggregatedQty)
      return acc
    }, { totalQty: 0, totalValue: 0 })
  }, [aggregatedAuditUnits])

  // PHASE 110: ID-BASED BRANCH MAP (ZATOUNA)
  const uniqueBranches = useMemo(() => {
    const bMap = new Map();
    auditUnits.forEach(u => {
      const bName = String(u.locationId?.name || (u.locationType === 'MainWarehouse' ? 'المخزن الرئيسي' : u.locationType)).trim();
      const bId = String(u.locationId?._id || u.locationId || bName);
      if (bName && !bMap.has(bId)) bMap.set(bId, bName);
    });
    return Array.from(bMap.entries()).map(([id, name]) => ({ id, name }));
  }, [auditUnits]);



  async function fetchProgress() {
    if ((!selectedShipment && businessType !== 'B2C_RETAIL') || !selectedProduct) return
    const shipmentItem = productsInShipment.find(i => i.productId?._id === selectedProduct)
    const expectedTotal = shipmentItem?.quantity || 0

    if (businessType === 'B2C_RETAIL') {
      try {
        const res = await fetch(`/api/products?id=${selectedProduct}`)
        const data = await res.json()
        if (data.products && data.products.length > 0) {
           const p = data.products.find((p:any) => p._id === selectedProduct)
           if (p) setStats({ scanned: 0, total: expectedTotal || p.stock }) 
        }
      } catch (err) { console.error(err) }
      return
    }
    try {
      const res = await fetch(`/api/inventory?shipmentId=${selectedShipment}&productId=${selectedProduct}`)
      const data = await res.json()
      if (data.success) {
        const total = expectedTotal > 0 ? expectedTotal : data.units.length
        const scanned = data.units.filter((u: any) => u.status && u.status !== 'Pending').length
        setStats({ scanned, total })
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleRegenerate() {
    if (!selectedShipment) return
    setRegenerating(true)
    try {
      const res = await fetch('/api/inventory/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: selectedShipment })
      })
      const data = await res.json()
      if (data.success) {
        setFlash('success')
        setMessage(data.message)
        fetchProgress()
      } else {
        throw new Error(data.message)
      }
    } catch (err: any) {
      setFlash('error')
      setMessage(err.message)
    } finally {
      setRegenerating(false)
    }
  }

  const handleBulkReceive = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (!selectedShipment || !selectedProduct) {
      setMessage('يرجى تحديد الرسالة والمنتج')
      return
    }
    if (bulkQty <= 0) {
      setMessage('كمية الاستلام يجب أن تكون أكبر من 0')
      return
    }
    setBulkLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/inventory/bulk-receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: selectedShipment, productId: selectedProduct, quantity: bulkQty, attributes: { condition: 'New' } })
      })
      const data = await res.json()
      if (res.ok) {
        setFlash('success')
        setMessage(data.message)
        if (beepSuccess) beepSuccess.play().catch(() => {})
        fetchProgress()
        fetchAllShipmentProgress(selectedShipment)
        setBulkQty(1)
      } else {
        throw new Error(data.message)
      }
    } catch (err: any) {
      setFlash('error')
      setMessage(err.message)
      if (beepError) beepError.play().catch(() => {})
    } finally {
      setBulkLoading(false)
      setTimeout(() => setFlash(null), 800)
    }
  }

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imei.trim() || !selectedProduct) return
    if (businessType !== 'B2C_RETAIL' && !selectedShipment) return
    
    // Instead of immediate submit, open modal
    setPendingImei(imei.trim())
    setShowModal(true)
  }

  const finalizeScan = async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/inventory/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imei: pendingImei,
          shipmentId: selectedShipment,
          productId: selectedProduct,
          attributes
        })
      })

      const data = await res.json()

      if (res.ok) {
        setFlash('success')
        setMessage(data.message)
        if (beepSuccess) beepSuccess.play().catch(() => {})
        fetchProgress()
        if (selectedShipment) fetchAllShipmentProgress(selectedShipment)
        setImei('')
        setShowModal(false)
        setAttributes({ storage: '', color: '', condition: 'New', batteryHealth: 100, notes: '' })
      } else {
        throw new Error(data.message)
      }
    } catch (err: any) {
      setFlash('error')
      setMessage(err.message)
      if (beepError) beepError.play().catch(() => {})
      setShowModal(false)
    } finally {
      setLoading(false)
      setTimeout(() => setFlash(null), 800)
    }
  }

  const [bulkQty, setBulkQty] = useState(1)
  const [bulkLoading, setBulkLoading] = useState(false)

  // Detect if selected product has serial numbers
  const selectedProductData = selectedProduct
    ? productsInShipment.find(item => item.productId?._id === selectedProduct)
    : null
  const isSerialProduct = selectedProductData?.productId?.hasSerialNumbers !== false

  if (initialLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#06B6D4' }}>
      <Loader2 size={48} className="animate-spin" />
      <p style={{ marginTop: '1rem', fontWeight: 800 }}>جاري تجهيز نظام الماسح الضوئي...</p>
    </div>
  )

  const cardStyle = { background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 24, padding: '2rem' }
  const inputStyle = { background: '#0B1120', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 16, padding: '1rem', color: '#fff', outline: 'none', width: '100%', fontSize: '1rem' }

  const filteredAuditUnits = selectedBranchFilter === 'all' 
     ? auditUnits 
     : auditUnits.filter(u => u.locationId?._id === selectedBranchFilter || String(u.locationId?.name).includes(selectedBranchFilter))

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#080C14', color: '#fff' }}>
      
      {/* TABS HEADER */}
      <div style={{ display: 'flex', gap: '1rem', padding: '1.5rem 2.5rem', borderBottom: '1px solid rgba(6,182,212,0.15)', background: '#0B1120' }}>
         <button 
           onClick={() => setActiveTab('RECEIVE')}
           style={{ padding: '0.8rem 2.5rem', borderRadius: 16, background: activeTab === 'RECEIVE' ? '#06B6D4' : 'transparent', color: activeTab === 'RECEIVE' ? '#000' : '#06B6D4', fontWeight: 900, fontSize: '1.1rem', border: '1px solid #06B6D4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
         >
            <Scan size={20} /> استلام شحنات جديدة
         </button>
         <button 
           onClick={() => setActiveTab('AUDIT')}
           style={{ padding: '0.8rem 2.5rem', borderRadius: 16, background: activeTab === 'AUDIT' ? '#A855F7' : 'transparent', color: activeTab === 'AUDIT' ? '#000' : '#A855F7', fontWeight: 900, fontSize: '1.1rem', border: '1px solid #A855F7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
         >
            <FileText size={20} /> جرد المخزن الفعلي
         </button>
      </div>

      {activeTab === 'AUDIT' ? (
         <div style={{ padding: '2.5rem', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 800, color: '#94A3B8' }}>تصفية بالفرع/المخزن:</span>
                <select 
                  style={{ ...inputStyle, width: '250px' }} 
                  value={selectedBranchFilter} 
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                >
                  <option value="all">الكل (جميع المواقع)</option>
                  {uniqueBranches.map(b => (
                     <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={() => window.open('/dashboard/inventory-print?branchId=' + selectedBranchFilter, '_blank')}
                style={{ padding: '1rem 2rem', borderRadius: 16, background: '#10B981', color: '#000', fontWeight: 900, fontSize: '1.1rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}
              >
                  🖨️ طباعة تقرير الجرد
              </button>
            </div>

            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
               {auditLoading ? (
                  <div style={{ padding: '5rem', textAlign: 'center' }}><Loader2 size={40} className="animate-spin" style={{ margin: '0 auto', color: '#A855F7' }} /></div>
               ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(168,85,247,0.1)', borderBottom: '1px solid rgba(168,85,247,0.2)' }}>
                        {['المنتج', 'الموقع (الفرع)', 'الكمية', 'متوسط التكلفة (CPA)', 'القيمة الإجمالية'].map(h => <th key={h} style={{ padding: '1.2rem', textAlign: 'right', color: '#A855F7' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                       {aggregatedAuditUnits.length === 0 && (
                          <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>لا توجد أجهزة متوفرة في هذا الموقع</td></tr>
                       )}
                       {aggregatedAuditUnits.map((u: any, i) => {
                          return (
                            <tr key={u._id || `agg-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                               <td style={{ padding: '1.2rem', fontWeight: 700 }}>
                                 <button 
                                   onClick={() => openLedger(u.productId?._id || u.productId, u.productId?.name, String(u.locationId?._id || u.locationId))}
                                   style={{ background: 'transparent', border: 'none', color: '#06B6D4', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px' }}
                                 >
                                   {u.productId?.name || '---'}
                                 </button>
                               </td>
                               <td style={{ padding: '1.2rem', fontWeight: 800, color: '#FCD34D' }}>{u.displayLocation}</td>
                               <td style={{ padding: '1.2rem', fontWeight: 900 }}>{u.aggregatedQty}</td>
                               <td style={{ padding: '1.2rem', color: '#10B981', fontWeight: 800 }}>{u.avgCost.toLocaleString()} ج.م</td>
                               <td style={{ padding: '1.2rem', color: '#FFFFFF', fontWeight: 900 }}>{(u.avgCost * u.aggregatedQty).toLocaleString()} ج.م</td>
                            </tr>
                          )
                       })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'rgba(16,185,129,0.05)', borderTop: '2px solid #10B981' }}>
                         <td colSpan={2} style={{ padding: '1.2rem', fontWeight: 900, color: '#10B981', textAlign: 'left' }}>إجمالي المخزون المتاح:</td>
                         <td style={{ padding: '1.2rem', fontWeight: 950, color: '#FFFFFF' }}>{auditTotals.totalQty} وحدة</td>
                         <td style={{ padding: '1.2rem', fontWeight: 950, color: '#10B981' }}>{auditTotals.totalValue.toLocaleString()} ج.م</td>
                         <td style={{ padding: '1.2rem' }}></td>
                      </tr>
                    </tfoot>
                  </table>
               )}
            </div>
         </div>
      ) : (
         <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 350px) 1fr', flex: 1, overflow: 'hidden' }}>
            <div style={{ borderLeft: '1px solid rgba(6,182,212,0.15)', height: '100%', overflowY: 'auto' }}>
              <StockMonitor 
                shipmentNumber={shipmentOptions.find(s => s.value === selectedBatch)?.label || ''}
                shipments={shipmentOptions}
                selectedShipment={selectedBatch}
                onShipmentSelect={setSelectedBatch}
                products={productsInShipment}
                stats={allStats}
              />
            </div>
            
            <div style={{ padding: '2.5rem', maxWidth: 1000, margin: '0 auto', width: '100%', overflowY: 'auto', height: '100%' }}>
              <AnimatePresence>
                {flash && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, zIndex: 100, background: flash === 'success' ? '#10B981' : '#EF4444', pointerEvents: 'none' }} />
                )}
              </AnimatePresence>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '2rem', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {businessType === 'B2B_WHALE' && (
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', marginBottom: '0.5rem', display: 'block' }}>1. اختر الرسالة المستلمة</label>
                <select style={inputStyle} value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                  <option value="">-- اختر رسالة (Shipment) --</option>
                  {shipmentOptions.map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              )}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', marginBottom: '0.5rem', display: 'block' }}>{businessType === 'B2B_WHALE' ? '2.' : '1.'} اختر المنتج الحالي</label>
                <select 
                  style={inputStyle} 
                  disabled={!selectedBatch} 
                  value={selectedProduct} 
                  onChange={e => setSelectedProduct(e.target.value)}
                >
                  {!selectedBatch ? (
                     <option value="">يرجى اختيار الشحنة أولاً</option>
                  ) : (
                     <>
                       <option value="">-- اختر المنتج من الرسالة --</option>
                       {productsInShipment.map((item: any) => (
                         <option key={item.productId?._id} value={item.productId?._id}>
                           {item.productId?.name} ({item.quantity} {item.productId?.hasSerialNumbers === false ? 'وحدة 📦' : 'جهاز'})
                         </option>
                       ))}
                     </>
                  )}
                </select>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {(selectedProduct && (selectedShipment || businessType === 'B2C_RETAIL')) && (
                <motion.div key="scanner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                  <div style={{ ...cardStyle, background: isSerialProduct ? 'rgba(6,182,212,0.08)' : 'rgba(168,85,247,0.08)', border: `2px solid ${isSerialProduct ? '#06B6D4' : '#A855F7'}`, padding: '2rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: isSerialProduct ? '#06B6D4' : '#A855F7' }}>
                          {isSerialProduct ? 'حالة الاستلام (للصنف المختار)' : '📦 استلام كمية (Bulk Receive)'}
                        </span>
                        <span style={{ fontSize: '1.4rem', fontWeight: 950 }}>{stats.scanned} من {stats.total}</span>
                    </div>

                    {isSerialProduct ? (
                      <form onSubmit={handleScan} style={{ position: 'relative', marginTop: '1rem' }}>
                          <input 
                            ref={inputRef}
                            type="text" 
                            value={imei}
                            onChange={e => setImei(e.target.value)}
                            placeholder="SCAN IMEI / SERIAL" 
                            autoFocus
                            autoComplete="off"
                            disabled={stats.total === 0}
                            style={{
                              width: '100%', padding: '1.25rem', background: '#0B1120', border: `2px solid ${stats.total === 0 ? 'rgba(239,68,68,0.2)' : 'rgba(6,182,212,0.5)'}`, 
                              borderRadius: 16, fontSize: '1.8rem', textAlign: 'center', fontWeight: 950, letterSpacing: '0.15em',
                              color: stats.total === 0 ? 'rgba(255,255,255,0.1)' : '#06B6D4', boxShadow: '0 0 30px rgba(6,182,212,0.1) inset'
                            }}
                          />
                          {loading && <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}><Loader2 className="animate-spin" color="#06B6D4" /></div>}
                      </form>
                    ) : (
                      <div style={{ marginTop: '1rem' }}>
                        <p style={{ fontSize: '0.78rem', color: '#A855F7', fontWeight: 700, marginBottom: '1rem' }}>
                          هذا المنتج لا يحتاج رقم تسلسلي — أدخل الكمية المستلمة مباشرة
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <input
                            type="number"
                            min={1}
                            max={stats.total - stats.scanned}
                            value={bulkQty}
                            onChange={e => setBulkQty(Number(e.target.value))}
                            style={{
                              flex: 1, padding: '1rem', background: '#0B1120', border: '2px solid rgba(168,85,247,0.5)',
                              borderRadius: 16, fontSize: '2rem', textAlign: 'center', fontWeight: 950, color: '#A855F7', outline: 'none'
                            }}
                          />
                          <button
                            onClick={handleBulkReceive}
                            disabled={bulkLoading || bulkQty <= 0}
                            style={{ flex: 1.5, padding: '1rem', background: '#A855F7', border: 'none', borderRadius: 16, color: '#fff', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 8px 32px rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                          >
                            {bulkLoading ? <Loader2 className="animate-spin" size={22} /> : '📥 استلام كمية'}
                          </button>
                        </div>
                      </div>
                    )}

                    {message && (
                      <div style={{ marginTop: '1rem', color: flash === 'success' ? '#10B981' : '#EF4444', fontWeight: 800, fontSize: '0.9rem' }}>
                        {message}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Quick Lookup */}
          <div style={{ ...cardStyle, position: 'sticky', top: '2.5rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <Search color="#06B6D4" size={20} />
                <h3 style={{ fontSize: '1rem', fontWeight: 900 }}>الاستعلام السريع (Check IMEI)</h3>
             </div>
             
             <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
               <input 
                 type="text" 
                 placeholder="أدخل IMEI للاستعلام..." 
                 value={searchImei} 
                 onChange={e => setSearchImei(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleLookup()}
                 style={{ ...inputStyle, paddingRight: '3rem' }} 
               />
               <div onClick={handleLookup} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#06B6D4' }}>
                  {lookupLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
               </div>
             </div>

             <AnimatePresence mode="wait">
               {lookupResult && (
                 <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                   style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid #06B6D4', borderRadius: 20, padding: '1.5rem' }}
                 >
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <Smartphone color="#06B6D4" size={24} />
                      <h4 style={{ fontWeight: 900, color: '#FFFFFF' }}>{lookupResult.productId?.name}</h4>
                   </div>
                   
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B' }}>حالة الوحدة:</span> 
                        <strong style={{ 
                          color: lookupResult.status === 'Available' ? '#10B981' : lookupResult.status === 'Sold' ? '#EF4444' : '#FB923C',
                          background: lookupResult.status === 'Available' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          padding: '0.2rem 0.6rem', borderRadius: 8, fontSize: '0.75rem'
                        }}>
                          {lookupResult.status === 'Available' ? 'متاح' : lookupResult.status === 'Sold' ? 'مباع' : lookupResult.status === 'Reserved' ? 'محجوز' : 'مرتجع'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748B' }}>المساحة:</span> <strong style={{ color: '#06B6D4' }}>{lookupResult.attributes?.storage || '---'}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748B' }}>اللون:</span> <strong style={{ color: '#06B6D4' }}>{lookupResult.attributes?.color || '---'}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748B' }}>جودة الجهاز:</span> <strong style={{ color: lookupResult.attributes?.condition === 'Used' ? '#FB923C' : '#10B981' }}>{lookupResult.attributes?.condition === 'Used' ? 'مستعمل' : 'جديد'}</strong></div>
                      {lookupResult.attributes?.condition === 'Used' && (
                         <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748B' }}>البطارية:</span> <strong style={{ color: '#10B981' }}>{lookupResult.attributes?.batteryHealth}%</strong></div>
                      )}
                   </div>
                   {lookupResult.attributes?.notes && (
                     <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(6,182,212,0.1)', fontSize: '0.8rem', color: '#94A3B8' }}>
                        <FileText size={14} style={{ display: 'inline', marginLeft: '0.4rem' }} /> {lookupResult.attributes?.notes}
                     </div>
                   )}
                 </motion.div>
               )}
             </AnimatePresence>
             {lookupErrorMsg && (
               <div style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: '1rem', fontWeight: 800 }}>⚠️ {lookupErrorMsg}</div>
             )}
          </div>
        </div>

        {/* Global Loading / Placeholder */}
        <AnimatePresence>
          {((!selectedShipment && businessType === 'B2B_WHALE') || !selectedProduct) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: '4rem', textAlign: 'center', opacity: 0.5 }}>
               <PackageSearch size={64} style={{ margin: '0 auto 1rem' }} />
               <p style={{ fontWeight: 700 }}>يرجى اختيار {businessType === 'B2B_WHALE' ? 'الرسالة و' : ''}المنتج للبدء في عملية المسح المخزني</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Birth Certificate Modal */}
      <AnimatePresence>
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(8,12,20,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: '#0B1120', borderRadius: 28, border: '1px solid rgba(6,182,212,0.3)', width: '100%', maxWidth: 500, padding: '2.5rem', boxShadow: '0 30px 100px rgba(0,0,0,0.6)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(6,182,212,0.1)', borderRadius: 12 }}><Scan color="#06B6D4" size={24} /></div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 900 }}>شهادة ميلاد الجهاز</h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748B' }}>IMEI: {pendingImei}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', marginBottom: '0.5rem', display: 'block' }}>المساحة *</label>
                    <select autoFocus value={attributes.storage} onChange={e => setAttributes({...attributes, storage: e.target.value})} style={inputStyle}>
                      <option value="">-- اختر --</option>
                      <option value="128GB">128GB</option>
                      <option value="256GB">256GB</option>
                      <option value="512GB">512GB</option>
                      <option value="1TB">1TB</option>
                      <option value="Custom">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', marginBottom: '0.5rem', display: 'block' }}>اللون *</label>
                    <select value={attributes.color} onChange={e => setAttributes({...attributes, color: e.target.value})} style={inputStyle}>
                      <option value="">-- اختر --</option>
                      <option value="Black">Titanium Black</option>
                      <option value="White">Titanium White</option>
                      <option value="Natural">Natural Titanium</option>
                      <option value="Blue">Titanium Blue</option>
                      <option value="Custom">أخرى</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', marginBottom: '0.5rem', display: 'block' }}>الحالة</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['New', 'Used'].map(c => (
                      <button key={c} onClick={() => setAttributes({...attributes, condition: c as any})} style={{ flex: 1, padding: '0.75rem', borderRadius: 12, border: '2px solid', borderColor: attributes.condition === c ? '#06B6D4' : 'rgba(255,255,255,0.05)', background: attributes.condition === c ? 'rgba(6,182,212,0.1)' : 'transparent', color: attributes.condition === c ? '#06B6D4' : '#64748B', fontWeight: 800, cursor: 'pointer' }}>
                        {c === 'New' ? 'جديد' : 'مستعمل'}
                      </button>
                    ))}
                  </div>
                </div>

                {attributes.condition === 'Used' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', marginBottom: '0.5rem', display: 'block' }}>صحة البطارية %</label>
                        <input type="number" value={attributes.batteryHealth} onChange={e => setAttributes({...attributes, batteryHealth: Number(e.target.value)})} style={inputStyle} min="0" max="100" />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', marginBottom: '0.5rem', display: 'block' }}>ملاحظات</label>
                        <input type="text" value={attributes.notes} onChange={e => setAttributes({...attributes, notes: e.target.value})} style={inputStyle} placeholder="الحالة العامة..." />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button onClick={() => {setShowModal(false); setImei('')}} style={{ flex: 1, padding: '1rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#64748B', fontWeight: 800, cursor: 'pointer' }}>إلغاء</button>
                  <button 
                    disabled={!attributes.storage || !attributes.color || loading}
                    onClick={finalizeScan}
                    style={{ flex: 2, padding: '1rem', borderRadius: 16, background: '#06B6D4', color: '#fff', border: 'none', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 32px rgba(6,182,212,0.3)', opacity: (!attributes.storage || !attributes.color) ? 0.5 : 1 }}
                  >
                    {loading ? <Loader2 className="animate-spin" style={{ margin: '0 auto' }} /> : 'حفظ في المخزن ✓'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )}

  {/* 4. Stock Ledger Modal (DECOUPLED TO ROOT) */}
  <AnimatePresence>
    {ledgerOpen && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(8,12,20,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          style={{ background: '#0B1120', borderRadius: 28, border: '1px solid rgba(6,182,212,0.3)', width: '100%', maxWidth: 800, padding: '2.5rem', boxShadow: '0 30px 100px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(168,85,247,0.1)', borderRadius: 12 }}><FileText color="#A855F7" size={24} /></div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900 }}>حركة الصنف (Stock Ledger)</h2>
                <p style={{ fontSize: '0.9rem', color: '#06B6D4', fontWeight: 800 }}>{ledgerProduct?.name}</p>
              </div>
            </div>
            <button onClick={() => setLedgerOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
          </div>

          {ledgerLoading ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}><Loader2 size={40} className="animate-spin" style={{ margin: '0 auto', color: '#A855F7' }} /></div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'rgba(168,85,247,0.1)', borderBottom: '1px solid rgba(168,85,247,0.2)' }}>
                  <th style={{ padding: '1rem', textAlign: 'right', color: '#A855F7' }}>التاريخ</th>
                  <th style={{ padding: '1rem', textAlign: 'right', color: '#A855F7' }}>االنوع</th>
                  <th style={{ padding: '1rem', textAlign: 'center', color: '#A855F7' }}>الكمية</th>
                  <th style={{ padding: '1rem', textAlign: 'center', color: '#A855F7' }}>الرصيد</th>
                  <th style={{ padding: '1rem', textAlign: 'right', color: '#A855F7' }}>المرجع / البيان</th>
                  <th style={{ padding: '1rem', textAlign: 'right', color: '#A855F7' }}>الموقع / العميل</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.length === 0 && <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>لا توجد حركات مسجلة لهذا الصنف</td></tr>}
                {ledgerData.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem', color: '#94A3B8' }}>{new Date(m.date).toLocaleString('ar-EG')}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        background: m.type === 'IN' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
                        color: m.type === 'IN' ? '#10B981' : '#EF4444', 
                        padding: '4px 8px', borderRadius: 6, fontWeight: 800, fontSize: '0.75rem' 
                      }}>
                        {m.type === 'IN' ? '🟢 وارد' : '🔴 منصرف'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, color: m.qty > 0 ? '#10B981' : '#EF4444', direction: 'ltr' }}>{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 900, color: '#06B6D4' }}>{m.balance}</td>
                    <td style={{ padding: '1rem', fontWeight: 700 }}>{m.label} #{m.reference}</td>
                    <td style={{ padding: '1rem', color: '#FCD34D' }}>{m.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
             <button 
               onClick={() => setLedgerOpen(false)}
               style={{ padding: '0.75rem 2rem', borderRadius: 12, background: 'rgba(6,182,212,0.1)', color: '#06B6D4', border: '1px solid #06B6D4', fontWeight: 900, cursor: 'pointer' }}
             >
               إغلاق كارت الصنف
             </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>

  <style>{`
    @keyframes spin { from {transform:rotate(0deg)} to {transform:rotate(360deg)} } 
    .animate-spin { animation: spin 1s linear infinite }
    input::placeholder { color: rgba(148,163,184,0.3); letter-spacing: 0; font-size: 1rem; }
  `}</style>
</div>
);
}
