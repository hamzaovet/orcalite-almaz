'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, ShoppingBag, Loader2, Scan, Database, Printer, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExcelPurchaseModal } from '@/components/dashboard/ExcelPurchaseModal'
import CreatableSelect from 'react-select/creatable'
import Link from 'next/link'

export default function PurchasesPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  
  // Invoice state
  const [supplierId, setSupplierId] = useState('')
  const [newSupplierName, setNewSupplierName] = useState('') // for CreatableSelect new entries
  const [isWalkIn, setIsWalkIn] = useState(false)
  const [walkInName, setWalkInName] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [branchId, setBranchId] = useState('')
  const [dbBranches, setDbBranches] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [magicOpen, setMagicOpen] = useState(false)
  const [recentPurchases, setRecentPurchases] = useState<any[]>([])
  const [completedPurchase, setCompletedPurchase] = useState<any>(null)

  // Current Item Form
  const [currProduct, setCurrProduct] = useState<any>(null)
  const [newProductMode, setNewProductMode] = useState(false)
  const [currCategory, setCurrCategory] = useState('')
  const [currSellingPrice, setCurrSellingPrice] = useState<number>(0)
  const [currQty, setCurrQty] = useState<number>(1)
  const [currCost, setCurrCost] = useState<number>(0)
  const [currImeis, setCurrImeis] = useState<string>('')
  // Phase 81: Device Specifications
  const [currColor, setCurrColor] = useState('')
  const [currStorage, setCurrStorage] = useState('')
  const [currBattery, setCurrBattery] = useState('')

  useEffect(() => {
    fetchData()
    fetchRecent()
  }, [])

  async function fetchRecent() {
    try {
      const res = await fetch('/api/purchases')
      const data = await res.json()
      setRecentPurchases((data.purchases || []).slice(0, 10))
    } catch { /* silent fail */ }
  }

  async function fetchData() {
    try {
      const [suppRes, prodRes, catRes, branchRes] = await Promise.all([
        fetch('/api/suppliers'),
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/branches')
      ])
      const [suppData, prodData, catData, branchData] = await Promise.all([suppRes.json(), prodRes.json(), catRes.json(), branchRes.json()])
      setSuppliers(suppData.suppliers || [])
      setProducts(prodData.products || [])
      setCategories(catData.categories || [])
      setDbBranches(branchData.branches || [])
      if (branchData.branches?.length > 0) setBranchId(branchData.branches[0]._id)
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

  const selectedProductObj = products.find(p => p._id === currProduct?.value)
  const selectedCatName = newProductMode
    ? (categories.find(c => c._id === currCategory)?.name || '')
    : (categories.find(c => c._id === selectedProductObj?.categoryId)?.name || selectedProductObj?.category || '')
  const isMobileCategory = selectedCatName.toLowerCase().includes('محمولة') || selectedCatName.toLowerCase().includes('ذكية') || selectedCatName.toLowerCase().includes('mobile') || selectedCatName.toLowerCase().includes('smart')
  const isSerialized = newProductMode 
    ? isMobileCategory
    : selectedProductObj?.isSerialized !== false

  useEffect(() => {
    setNewProductMode(!!currProduct?.__isNew__)
    if (selectedProductObj) {
       setCurrCost(selectedProductObj.costPrice || 0)
       setCurrSellingPrice(selectedProductObj.price || 0)
    } else {
       setCurrCost(0)
       setCurrSellingPrice(0)
    }
    setCurrImeis('')
    setCurrQty(1)
    setCurrCategory('')
    setCurrColor('')
    setCurrStorage('')
    setCurrBattery('')
  }, [currProduct])

  function handleAddItem() {
    if (!currProduct) return showToast('يرجى اختيار المنتج', 'err')
    if (currQty <= 0 || currCost <= 0) return showToast('يرجى تحديد الكمية والتكلفة', 'err')
    
    if (newProductMode) {
      if (!currCategory) return showToast('يرجى اختيار التصنيف للمنتج الجديد', 'err')
      if (currSellingPrice <= 0) return showToast('يرجى تحديد سعر البيع للمنتج الجديد', 'err')
    }

    let imeisList: string[] = []
    if (isSerialized) {
       imeisList = currImeis.split('\n').map(i => i.trim()).filter(Boolean)
       if (imeisList.length > 0 && imeisList.length !== currQty) {
          return showToast(`عدد الأرقام التسلسلية (${imeisList.length}) لا يطابق الكمية (${currQty})`, 'err')
       }
    }

    const newItem = {
      productId: newProductMode ? null : currProduct.value,
      productName: currProduct.label,
      isNew: newProductMode,
      categoryId: newProductMode ? currCategory : selectedProductObj?.categoryId,
      sellingPrice: currSellingPrice || (newProductMode ? 0 : (selectedProductObj?.price || 0)),
      qty: currQty,
      unitCost: currCost,
      imeis: imeisList,
      // Phase 81: Device Specifications
      color: currColor || undefined,
      storage: currStorage || undefined,
      batteryHealth: currBattery || undefined
    }

    setItems([...items, newItem])
    
    // Reset
    setCurrProduct(null)
    setNewProductMode(false)
    setCurrQty(1)
    setCurrCost(0)
    setCurrImeis('')
    setCurrCategory('')
    setCurrSellingPrice(0)
    setCurrColor('')
    setCurrStorage('')
    setCurrBattery('')
  }

  function handleRemoveItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  const totalAmount = items.reduce((acc, item) => acc + (item.qty * item.unitCost), 0)
  const remaining = totalAmount - amountPaid

  async function handleSave() {
    if (!isWalkIn && !supplierId && !newSupplierName) return showToast('يرجى اختيار المورد أو كتابة اسمه', 'err')
    if (isWalkIn && !walkInName.trim()) return showToast('يرجى إدخال اسم العميل', 'err')
    if (!branchId) return showToast('يرجى تحديد الفرع المستلم أولاً', 'err')
    if (items.length === 0) return showToast('يرجى إضافة منتجات للفاتورة', 'err')
    if (amountPaid < 0) return showToast('المبلغ المدفوع غير صالح', 'err')

    setSaving(true)
    try {
      const finalItems = []
      // ... (product definition logic remains safe)
      for (const it of items) {
         let pId = it.productId
         if (!pId || pId === '') {
            const pRes = await fetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                 name: it.productName,
                 category: it.categoryName || 'أجهزة محمولة',
                 costPrice: it.unitCost,
                 price: it.salePrice || (it.unitCost + 2000),
                 stock: 0,
                 condition: it.condition === 'مستعمل' ? 'used' : it.condition === 'Used' ? 'used' : 'new',
                 isSerialized: it.imeis && it.imeis.length > 0,
                 storage: it.storage,
                 color: it.color,
                 batteryHealth: it.battery,
                 description: it.notes
              })
            })
            const pData = await pRes.json()
            if (pData.success) { pId = pData.product._id }
            else { throw new Error(`فشل تعريف المنتج جديد: ${it.productName}`) }
         }
         finalItems.push({ ...it, productId: pId })
      }

      const sObj = suppliers.find(s => s._id === supplierId)
      // Phase 80/81: for new suppliers typed via CreatableSelect, pass name only (backend auto-creates)
      const resolvedSupplierName = isWalkIn ? walkInName : (sObj?.name || newSupplierName)
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: isWalkIn ? null : (supplierId || null),
          supplierName: resolvedSupplierName,
          walkInName: isWalkIn ? walkInName : undefined,
          nationalId: isWalkIn ? nationalId : undefined,
          items: finalItems,
          totalAmount,
          amountPaid,
          remaining: isWalkIn ? 0 : remaining,
          paymentMethod,
          branchId
        })
      })
      const data = await res.json()
      if (res.ok) {
        showToast(data.message, 'ok')
        setSupplierId('')
        setNewSupplierName('')
        setItems([])
        setAmountPaid(0)
        setPaymentMethod('Cash')
        setWalkInName('')
        setNationalId('')
        setIsWalkIn(false)
        setNewProductMode(false)
        
        const selectedBranchName = dbBranches.find(b => b._id === branchId)?.name || 'المركز الرئيسي';
        setCompletedPurchase({ ...data.purchase, branchName: selectedBranchName })
        
        fetchRecent()
      } else {
        throw new Error(data.message)
      }
    } catch (err: any) {
      showToast(err.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  function handleMagicComplete(extracted: any) {
    if (extracted.supplierId) {
       setSupplierId(extracted.supplierId)
    }
    setItems((prev) => [...prev, ...extracted.items])
    setMagicOpen(false)
    showToast('تم إدراج الأصناف بنجاح 📊', 'ok')
  }

  const cardStyle = { background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 24, padding: '2rem' }
  const inputStyle = { background: '#0B1120', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 16, padding: '1rem', color: '#fff', outline: 'none', width: '100%', fontSize: '1rem' }
  const lblStyle = { fontSize: '0.8rem', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '0.5rem' }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Loader2 className="animate-spin text-cyan-500" size={48} /></div>

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', color: '#F8FAFC' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: toast.type === 'ok' ? '#06B6D4' : '#EF4444', color: '#fff', padding: '0.7rem 1.6rem', borderRadius: 50, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingBag color="#06B6D4" size={36} /> المشتريات المحلية
          </h1>
          <p style={{ color: '#94A3B8' }}>تسجيل فواتير الشراء، إضافة للمخزن، وتسوية الخزنة والموردين</p>
        </div>
        <button 
          onClick={() => setMagicOpen(true)}
          style={{ padding: '0.8rem 1.5rem', background: 'rgba(6,182,212,0.1)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 14, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 10px 20px -5px rgba(6,182,212,0.2)' }}
        >
          <Database size={18} /> 📊 إدراج من إكسيل
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '2rem' }}>
        {/* Left Column: Supplier & Financials */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#06B6D4' }}>بيانات المورد / العميل</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: isWalkIn ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: 50, border: `1px solid ${isWalkIn ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer' }} onClick={() => setIsWalkIn(!isWalkIn)}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isWalkIn ? '#A855F7' : '#94A3B8' }}>{isWalkIn ? 'شراء من عميل (طياري)' : 'شراء من مورد (جملة)'}</span>
                <input type="checkbox" checked={isWalkIn} readOnly style={{ display: 'none' }} />
              </div>
            </div>

            {isWalkIn ? (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={lblStyle}>اسم العميل بالكامل *</label>
                  <input style={inputStyle} value={walkInName} onChange={e => setWalkInName(e.target.value)} placeholder="مثال: محمد أحمد علي..." />
                </div>
                <div>
                  <label style={lblStyle}>الرقم القومي (14 رقم) - اختياري</label>
                  <input style={inputStyle} value={nationalId} onChange={e => setNationalId(e.target.value)} placeholder="01234567890123" />
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                <label style={lblStyle}>اختر أو أضف مورد جديد *</label>
                <CreatableSelect
                  isClearable
                  placeholder="ابحث أو أضف مورد..."
                  value={
                    supplierId
                      ? { value: supplierId, label: suppliers.find(s => s._id === supplierId)?.name || 'مورد' }
                      : newSupplierName
                      ? { value: '__new__', label: newSupplierName, __isNew__: true }
                      : null
                  }
                  onChange={(v: any) => {
                    if (v?.__isNew__) {
                      setSupplierId('')
                      setNewSupplierName(v.label) // capture the new supplier name
                    } else {
                      setSupplierId(v?.value || '')
                      setNewSupplierName('')
                    }
                  }}
                  options={suppliers.map(s => ({ value: s._id, label: s.name }))}
                  styles={{
                    control: (base) => ({
                      ...base,
                      background: '#0B1120',
                      borderColor: 'rgba(6,182,212,0.3)',
                      borderRadius: '16px',
                      padding: '0.3rem',
                      color: '#fff',
                      boxShadow: 'none',
                      '&:hover': { borderColor: '#06B6D4' }
                    }),
                    menu: (base) => ({ ...base, background: '#0B1120', border: '1px solid rgba(6,182,212,0.2)' }),
                    option: (base, { isFocused }) => ({
                      ...base,
                      background: isFocused ? 'rgba(6,182,212,0.1)' : 'transparent',
                      color: '#fff',
                      cursor: 'pointer'
                    }),
                    singleValue: (base) => ({ ...base, color: '#fff' }),
                    input: (base) => ({ ...base, color: '#fff' })
                  }}
                />
              </motion.div>
            )}

            <div style={{ marginTop: '1.5rem' }}>
              <label style={lblStyle}>الفرع المستلم (مكان التخزين) *</label>
              <select style={inputStyle} value={branchId} onChange={e => setBranchId(e.target.value)}>
                <option value="">-- اختر الفرع --</option>
                {dbBranches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '1.5rem', color: '#06B6D4' }}>الحسابات والخزنة</h2>
            <div style={{ background: '#0B1120', padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>إجمالي الفاتورة</span>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff' }}>
                {totalAmount.toLocaleString('ar-EG')} <span style={{ fontSize: '1rem', color: '#64748B' }}>ج.م</span>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={lblStyle}>المدفوع من الخزنة</label>
              <input type="number" min="0" style={{ ...inputStyle, fontSize: '1.2rem', fontWeight: 800, color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }} value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={lblStyle}>طريقة الدفع</label>
              <select style={inputStyle} value={paymentMethod || 'Cash'} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="Cash">نقدي (Cash)</option>
                <option value="Visa">فيزا (Visa)</option>
                <option value="InstaPay">إنستاباي (InstaPay)</option>
                <option value="Vodafone Cash">فودافون كاش</option>
              </select>
            </div>

            <div style={{ background: 'rgba(239,68,68,0.05)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#EF4444' }}>المتبقي (آجل للمورد):</span>
               <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#EF4444' }}>{remaining.toLocaleString('ar-EG')} ج.م</span>
            </div>
          </div>

          <button 
            onClick={handleSave} 
            disabled={saving}
            style={{ padding: '1.25rem', borderRadius: 16, background: '#06B6D4', color: '#fff', border: 'none', fontWeight: 900, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', boxShadow: '0 8px 32px rgba(6,182,212,0.3)' }}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />} حفظ الفاتورة وتوريد المخزون
          </button>
        </div>

        {/* Right Column: Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={cardStyle}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '1.5rem', color: '#06B6D4' }}>إضافة الأصناف</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: newProductMode ? '1fr 1fr 1fr' : '2fr 1fr 1fr', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={lblStyle}>المنتج (اختر أو اكتب اسم جديد)</label>
                <CreatableSelect
                  isClearable
                  placeholder="ابحث أو أضف منتج جديد..."
                  value={currProduct}
                  onChange={(v) => setCurrProduct(v)}
                  options={products.map(p => ({ value: p._id, label: p.name }))}
                  styles={{
                    control: (base) => ({
                      ...base,
                      background: '#0B1120',
                      borderColor: 'rgba(6,182,212,0.3)',
                      borderRadius: '16px',
                      padding: '0.3rem',
                      color: '#fff',
                      boxShadow: 'none',
                      '&:hover': { borderColor: '#06B6D4' }
                    }),
                    menu: (base) => ({ ...base, background: '#0B1120', border: '1px solid rgba(6,182,212,0.2)' }),
                    option: (base, { isFocused }) => ({
                      ...base,
                      background: isFocused ? 'rgba(6,182,212,0.1)' : 'transparent',
                      color: '#fff',
                      cursor: 'pointer'
                    }),
                    singleValue: (base) => ({ ...base, color: '#fff' }),
                    input: (base) => ({ ...base, color: '#fff' })
                  }}
                />
              </div>

              {newProductMode && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <label style={lblStyle}>التصنيف *</label>
                  <select style={inputStyle} value={currCategory || ''} onChange={e => setCurrCategory(e.target.value)}>
                    <option value="">-- اختر --</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </motion.div>
              )}

              {(newProductMode || isSerialized) && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <label style={lblStyle}>سعر البيع للجمهور {newProductMode ? '*' : '(تحديث)'}</label>
                  <input type="number" min="0" style={{ ...inputStyle, color: '#10B981', fontWeight: 900 }} value={currSellingPrice} onChange={e => setCurrSellingPrice(Number(e.target.value))} placeholder="مثال: 55000" />
                </motion.div>
              )}

              <div style={newProductMode ? { gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' } : { display: 'contents' }}>
                <div>
                  <label style={lblStyle}>الكمية</label>
                  <input type="number" min="1" style={{...inputStyle, textAlign: 'center'}} value={currQty} onChange={e => setCurrQty(Number(e.target.value))} />
                </div>
                <div>
                  <label style={lblStyle}>تكلفة الوحدة</label>
                  <input type="number" min="0" style={{...inputStyle, textAlign: 'center', color: '#F59E0B'}} value={currCost} onChange={e => setCurrCost(Number(e.target.value))} />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isSerialized && currProduct && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ overflow: 'hidden' }}>
                  <label style={lblStyle}>
                    <Scan size={14} style={{ display: 'inline', marginLeft: 4 }} /> 
                    أرقام السيريال / IMEI (كل رقم في سطر جديد) - اختياري
                  </label>
                  <textarea 
                    style={{ ...inputStyle, minHeight: 100, fontFamily: 'monospace', letterSpacing: '2px' }} 
                    placeholder="123456789012345&#10;123456789012346"
                    value={currImeis}
                    onChange={e => setCurrImeis(e.target.value)}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.5rem' }}>عدد الأرقام المدخلة يجب أن يطابق الكمية المحددة ({currQty}) إذا أردت تتبعهم.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Phase 81: Device Specification Fields - shown for all serialized (phone) items */}
            <AnimatePresence>
              {isSerialized && currProduct && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden', marginTop: '1rem' }}
                >
                  <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 16, padding: '1rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 900, color: '#06B6D4', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      📱 مواصفات الجهاز (مطلوبة للأجهزة المحمولة)
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={lblStyle}>اللون *</label>
                        <input
                          style={{ ...inputStyle, borderColor: 'rgba(168,85,247,0.3)' }}
                          value={currColor}
                          onChange={e => setCurrColor(e.target.value)}
                          placeholder="مثال: أسود، أبيض..."
                        />
                      </div>
                      <div>
                        <label style={lblStyle}>المساحة *</label>
                        <input
                          style={{ ...inputStyle, borderColor: 'rgba(168,85,247,0.3)' }}
                          value={currStorage}
                          onChange={e => setCurrStorage(e.target.value)}
                          placeholder="مثال: 128GB، 256GB..."
                        />
                      </div>
                      <div>
                        <label style={lblStyle}>حالة البطارية</label>
                        <input
                          style={{ ...inputStyle, borderColor: 'rgba(251,146,60,0.3)', color: currBattery ? '#FB923C' : '#94A3B8' }}
                          value={currBattery}
                          onChange={e => setCurrBattery(e.target.value)}
                          placeholder="مثال: 85%، 92%..."
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              onClick={handleAddItem}
              style={{ marginTop: '1.5rem', width: '100%', padding: '1rem', borderRadius: 16, background: 'rgba(6,182,212,0.1)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.3)', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus /> إضافة الصنف للفاتورة
            </button>
          </div>

          <div style={{ ...cardStyle, flex: 1 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '1.5rem', color: '#06B6D4' }}>أصناف الفاتورة</h2>
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748B', padding: '3rem 0', fontWeight: 700 }}>لم يتم إضافة أصناف بعد</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '1rem', color: '#94A3B8' }}>المنتج</th>
                      <th style={{ padding: '1rem', color: '#94A3B8' }}>الكمية</th>
                      <th style={{ padding: '1rem', color: '#94A3B8' }}>التكلفة</th>
                      <th style={{ padding: '1rem', color: '#94A3B8' }}>الإجمالي</th>
                      <th style={{ padding: '1rem', color: '#94A3B8' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 800, color: '#fff' }}>
                          {item.productName}
                          {item.imeis && item.imeis.length > 0 && <div style={{ fontSize: '0.7rem', color: '#06B6D4', marginTop: 4 }}>+ {item.imeis.length} سيريال</div>}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 800 }}>{item.qty}</td>
                        <td style={{ padding: '1rem', color: '#F59E0B' }}>{item.unitCost.toLocaleString()} ج.م</td>
                        <td style={{ padding: '1rem', fontWeight: 900 }}>{(item.qty * item.unitCost).toLocaleString()} ج.م</td>
                        <td style={{ padding: '1rem', textAlign: 'left' }}>
                          <button onClick={() => handleRemoveItem(idx)} style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none', padding: '0.4rem', borderRadius: 8, cursor: 'pointer' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
      </div>

      <AnimatePresence>
        {magicOpen && (
          <ExcelPurchaseModal
            onClose={() => setMagicOpen(false)}
            onComplete={handleMagicComplete}
            products={products}
          />
        )}
      </AnimatePresence>

      <div style={{ marginTop: '3rem', ...cardStyle }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '1.5rem', color: '#06B6D4', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShoppingBag size={20} /> سجل المشتريات الأخيرة
        </h2>
        
        {recentPurchases.length === 0 ? (
          <p style={{ color: '#64748B', textAlign: 'center', padding: '2rem' }}>لا توجد مشتريات مسجلة مؤخراً</p>
        ) : (
          <div style={{ overflowX: 'visible', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.9rem', tableLayout: 'auto' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '1rem', color: '#94A3B8', width: '150px' }}>التاريخ</th>
                  <th style={{ padding: '1rem', color: '#94A3B8' }}>المورد / العميل</th>
                  <th style={{ padding: '1rem', color: '#94A3B8', width: '120px' }}>الإجمالي</th>
                  <th style={{ padding: '1rem', color: '#94A3B8', width: '120px' }}>الحالة</th>
                  <th style={{ padding: '1rem', color: '#94A3B8', width: '150px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {recentPurchases.map((p, idx) => (
                  <tr key={p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'middle' }}>
                    <td style={{ padding: '1rem', color: '#CBD5E1' }}>{new Date(p.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td style={{ padding: '1rem', fontWeight: 800 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {p.walkInName || p.supplierName}
                        {p.walkInName && <span style={{ fontSize: '0.65rem', background: 'rgba(168,85,247,0.15)', color: '#A855F7', padding: '0.1rem 0.4rem', borderRadius: 4, whiteSpace: 'nowrap' }}>طياري</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 900 }}>{p.totalAmount.toLocaleString()} ج.م</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: p.isOpeningBalance ? '#FB923C' : '#06B6D4' }}>
                        {p.isOpeningBalance ? 'رصيد افتتاحي' : (p.walkInName ? 'مبايعة شراء' : 'فاتورة مورد')}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {p.walkInName ? (
                        <Link 
                          href={`/dashboard/purchase-contract?purchaseId=${p._id}`}
                          target="_blank"
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl text-xs font-black inline-flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                        >
                          <Printer size={14} /> طباعة مبايعة
                        </Link>
                      ) : (
                        <Link 
                          href={`/dashboard/purchase-invoice?purchaseId=${p._id}`}
                          target="_blank"
                          className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-xl text-xs font-black inline-flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                        >
                          <Printer size={14} /> طباعة فاتورة
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    
    <AnimatePresence>
      {completedPurchase && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(8,12,20,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: '#0B1120', borderRadius: 28, border: '1px solid #06B6D4', width: '100%', maxWidth: 500, padding: '3rem', textAlign: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ width: 80, height: 80, background: 'rgba(6,182,212,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle2 color="#06B6D4" size={48} />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '1rem' }}>تم حفظ الفاتورة!</h2>
            <p style={{ color: '#94A3B8', marginBottom: '2rem', fontSize: '1.1rem' }}>تم توريد المخزون لفرع <span style={{ color: '#06B6D4', fontWeight: 800 }}>{completedPurchase.branchName}</span> بنجاح.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Link 
                href={`/dashboard/purchase-invoice?purchaseId=${completedPurchase._id}&branchName=${encodeURIComponent(completedPurchase.branchName)}`}
                target="_blank"
                style={{ background: '#06B6D4', color: '#fff', padding: '1rem', borderRadius: 16, fontWeight: 900, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Printer size={20} /> طباعة الفاتورة
              </Link>
              <button 
                onClick={() => setCompletedPurchase(null)}
                style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: 16, fontWeight: 900, cursor: 'pointer' }}
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </div>
  );
}
