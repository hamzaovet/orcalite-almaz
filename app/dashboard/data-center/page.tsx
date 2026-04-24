'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Sparkles, Loader2, Save, UploadCloud, File, AlertCircle, 
  Database, ArrowRight, CheckCircle2, Server, Package, MapPin, Tags 
} from 'lucide-react'
import * as XLSX from 'xlsx'

type ParsedItem = {
  name: string
  categoryId: string
  qty: number
  buyPrice: number
  sellPrice: number
  sku: string
  storage: string
  battery: string
  color: string
  notes: string
  _isBulk?: boolean      // internal parser flag — true = accessory/bulk
  isDuplicate?: boolean
  dbProductId?: string
  status?: 'new' | 'existing'
  wholesaleMargin?: number
  wholesalePriceEGP?: number
  condition?: string
}

type PipeStatus = 'pending' | 'running' | 'done' | 'error'

const BULK_CATEGORIES = ['إكسسوارات', 'قطع غيار', 'خدمات وشحن']
// Normalize Arabic: remove hamza variants, taa marbuta, alef maqsoura differences
const normAr = (s: string) => s.trim()
  .replace(/[أإآ]/g, 'ا')
  .replace(/ة$/, 'ه')
  .replace(/ى$/, 'ي')
  .replace(/\s+/g, ' ')
const BULK_NORM = BULK_CATEGORIES.map(normAr)

export default function DataCenterPage() {
  const [items, setItems] = useState<ParsedItem[]>([])
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [branchId, setBranchId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Step: 1-Upload, 2-Preview, 3-Pipes
  const [step, setStep] = useState<1 | 2 | 3>(1)
  
  // Pipes State
  const [pipe1, setPipe1] = useState<PipeStatus>('pending')
  const [pipe3, setPipe3] = useState<PipeStatus>('pending')
  const [processedCount, setProcessedCount] = useState(0)
  
  const [dbBranches, setDbBranches] = useState<any[]>([])
  const [dbCategories, setDbCategories] = useState<any[]>([])
  const [dbProducts, setDbProducts] = useState<any[]>([])
  const [businessType, setBusinessType] = useState('B2B_WHALE')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [resB, resC, resS] = await Promise.all([
        fetch('/api/branches'),
        fetch('/api/categories'),
        fetch('/api/settings')
      ])
      const [dataB, dataC, dataS] = await Promise.all([resB.json(), resC.json(), resS.json()])
      setDbBranches(dataB.branches || [])
      setDbCategories(dataC.categories || [])
      if (dataS.businessType) setBusinessType(dataS.businessType)
    } catch (err) {
      showToast('فشل تحميل البيانات التأسيسية', 'err')
    }
  }

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  // Flexible column reader — tries every key variant until one has a value
  function col(row: any, ...keys: string[]): string {
    // 1. Exact match priority
    for (const k of keys) {
      const v = row[k]
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
    }
    // 2. Fuzzy match (e.g. 'الكمية او Qty' matches 'الكمية')
    const rowKeys = Object.keys(row)
    for (const k of keys) {
      const fuzzyKey = rowKeys.find(rk => rk.toLowerCase().includes(k.toLowerCase()))
      if (fuzzyKey) {
        const v = row[fuzzyKey]
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
      }
    }
    return ''
  }

  function transformProductName(raw: string): string {
    if (!raw) return 'منتج غير معروف'
    let val = raw.trim()

    // Strip unwanted tokens
    const namesToStrip = ['عبد العزيز', 'خالد', 'حاتم', 'جديد']
    val = val.replace(new RegExp(namesToStrip.join('|'), 'gi'), '').replace(/\s+/g, ' ').trim()

    // iPhone — handles both 'iPhone 14 Pro Max' and legacy shorthand '14'
    const iphoneMatch = val.match(/^(?:iphone|ايفون|أيفون)\s*(.+)$/i)
    if (iphoneMatch) return `أيفون ${iphoneMatch[1].trim()}`
    if (/^(\d{2}|X|XR|XS|XS\s*Max|Pro\s*Max)$/i.test(val)) return `أيفون ${val}`

    // Samsung
    const samsungMatch = val.match(/^samsung\s*(.+)$/i)
    if (samsungMatch) return `سامسونج ${samsungMatch[1].trim()}`
    if (/^(A|S|Note)\s?\d{1,2}/i.test(val)) return `سامسونج ${val}`

    // Xiaomi / Poco
    const pocoMatch = val.match(/^poco\s*(.+)$/i)
    if (pocoMatch) return `بوكو ${pocoMatch[1].trim()}`
    if (/^(Note)\s?\w{1,3}/i.test(val) && !val.toLowerCase().includes('samsung')) return `شاومي ${val}`

    // Huawei
    const huaweiMatch = val.match(/^huawei\s*(.+)$/i)
    if (huaweiMatch) return `هواوي ${huaweiMatch[1].trim()}`

    return val || 'منتج غير معروف'
  }

  async function handleAI() {
    if (!selectedFile) return showToast('الرجاء اختيار ملف الجرد أولاً', 'err')
    setParsing(true)
    try {
      let extracted: any[] = [];
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();

      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(data, {
          // raw:false → reads numbers as their display string (prevents IMEI float-precision loss)
          // cellText:true → ensures text cells come through as-is
          raw: false, cellText: true
        });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        // defval:'' → fills missing cells with '' so no row is accidentally dropped
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];

        console.log(`[DataCenter] Raw rows from Excel: ${rows.length}`);

        extracted = rows
          .filter(r => Object.values(r).some(v => v !== '' && v !== null && v !== undefined))
          .map(r => {
            // ── Category ─────────────────────────────────────────────────────
            const rawCat = col(r, 'التصنيف', 'القسم', 'Category', 'تصنيف');
            // Fuzzy-match category: handles hamza/alef variants in Excel
            const matchedDbCat = dbCategories.find((c: any) => normAr(c.name) === normAr(rawCat));

            // ── Serial / IMEI ──────────────────────────────────────────────
            const sku = col(r,
              'السيريال', 'السريال', 'Serial', 'IMEI',
              'IMEI / السيريال', 'السيريال / IMEI', 'IMEI/السيريال',
              'IMEI / السريال', 'السيريال / IMEI',
              'رقم السيريال', 'الإيمي', 'رقم تسلسلي', 'IMEI Number', 'serial number'
            );

            // ── DEFINITIVE bulk flag: determined by sku presence ──────────────────
            const finalIsBulk = !sku;

            // ── Device-only fields (blank for bulk) ────────────────────────
            const storage = finalIsBulk ? '' : col(r, 'المساحة', 'المساحه', 'Storage', 'الذاكرة', 'السعة');
            const rawBattery = finalIsBulk ? '' : col(r, 'البطارية', 'Battery', 'البطارية %', 'نسبة البطارية');
            const batteryValue = rawBattery.replace(/\D/g, '');
            const battery = batteryValue ? (parseInt(batteryValue, 10) + '%') : '';
            const color = finalIsBulk ? '' : col(r, 'اللون', 'Color', 'اللون / Color');

            // ── Prices ────────────────────────────────────────────────────
            const rawBuy  = col(r, 'سعر الشراء', 'التكلفة', 'Cost', 'سعر الشراء (ج.م)', 'سعر الشراء (EGP)');
            const rawSell = col(r, 'سعر البيع', 'السعر', 'Sale Price', 'سعر البيع (ج.م)', 'سعر البيع (EGP)');
            const buyPrice  = Number(rawBuy.replace(/[,+A-Za-z\s]/g, ''))  || 0;
            const sellPrice = Number(rawSell.replace(/[,+A-Za-z\s]/g, '')) || 0;

            // ── Notes ─────────────────────────────────────────────────────
            const rawNotes = col(r, 'الملاحظات', 'ملاحظات', 'Notes', 'البيان');
            const finalNotes = rawNotes || 'تسوية جرد';

            // ── Condition (devices only) ──────────────────────────────────
            const rawCondition = finalIsBulk ? '' : col(r, 'الحالة', 'حالة الجهاز', 'Condition', 'الحاله');
            const condition = rawCondition.includes('مستعمل') || rawCondition.toLowerCase().includes('used') ? 'Used' : 'New';

            // ── Quantity ──────────────────────────────────────────────────
            // Devices always 1; Bulk reads from qty column
            const qtyRaw = col(r, 'الكمية', 'الكميه', 'Qty', 'العدد', 'الكمية المتاحة', 'الكمية الكلية');
            const qty = finalIsBulk ? (Number(qtyRaw.replace(/[^\d.]/g, '')) || 1) : 1;

            // ── Product Name ──────────────────────────────────────────────
            const rawName = col(r, 'اسم المنتج', 'البيان', 'الاسم', 'Product', 'المنتج');
            // Bulk: skip phone-name transformation (accessories aren't phones)
            const name = finalIsBulk ? (rawName || 'منتج غير معروف') : transformProductName(rawName);

            return {
              categoryId: matchedDbCat ? matchedDbCat._id : (categoryId || ''),
              _isBulk: finalIsBulk,
              name, sku, storage, battery, color,
              buyPrice, sellPrice,
              notes: finalNotes,
              condition, qty
            }
          })
          .filter(e => e.name && e.name !== 'منتج غير معروف');
      } else if (ext === 'pdf') {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const res = await fetch('/api/ai/extract-inventory', { method: 'POST', body: formData });
        const json = await res.json();
        if (json.success) {
          extracted = json.data.map((d: any) => ({ 
            ...d, 
            categoryId, 
            sku: d.sku || d.serial || '',
            sellPrice: d.sellPrice || d.price || 0,
            buyPrice: d.buyPrice || d.cost || 0,
            notes: d.notes || 'تسوية جرد',
            condition: d.condition === 'New' || d.condition === 'Used' ? d.condition : 'New'
          }));
        } else {
          showToast(json.message || 'فشل استخراج بيانات PDF', 'err');
        }
      }

      if (extracted.length > 0) {
        // 1. Fetch Existing Products for matching
        const resP = await fetch('/api/products')
        const dataP = await resP.json()
        const existingProds = dataP.products || []
        setDbProducts(existingProds)

        // 2. Duplicate Serial Check
        const serials = extracted.map(e => e.sku).filter(s => s && s.length > 5)
        let dupSet = new Set<string>()
        if (serials.length > 0) {
          const checkRes = await fetch('/api/products/check-serials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serials })
          })
          const checkData = await checkRes.json()
          if (checkData.success) dupSet = new Set(checkData.existing)
        }

        // 3. Status Mapping & Matching
        extracted = extracted.map(e => {
          const match = existingProds.find((p: any) => 
            p.name.toLowerCase().trim() === e.name.toLowerCase().trim() &&
            String(p.categoryId?._id || p.categoryId) === String(e.categoryId)
          )
          return {
            ...e,
            dbProductId: match?._id,
            status: match ? 'existing' : 'new',
            isDuplicate: dupSet.has(e.sku)
          }
        })

        setItems(extracted)
        setStep(2)
      } else {
        showToast('لم يتم العثور على بيانات صالحة في الملف', 'err')
      }
    } catch (err) {
      console.error('Excel Parsing Error Details:', err)
      showToast('خطأ أثناء معالجة الملف', 'err')
    } finally {
      setParsing(false)
    }
  }

  async function handleApprovePipes() {
    if (!branchId) return showToast('حدد الفرع المستهدف للتسوية أولاً', 'err')
    if (items.some(it => !it.categoryId)) return showToast('يرجى تحديد الأقسام لجميع المنتجات', 'err')
    
    setStep(3)
    setPipe1('running')
    setProcessedCount(0)
    
    try {
      const reconciledItems: any[] = []
      // Cache: modelKey → productId  (prevents duplicate Product creation within the same batch)
      const modelProductCache: Record<string, string> = {}

      // ── Pipe 1: Find-or-Create Product PER MODEL (not per serial) ─────────────
      for (const [idx, it] of items.entries()) {
        if (it.isDuplicate) { setProcessedCount(idx + 1); continue }

        // A serialized item is one explicitly NOT bulk (has a real IMEI/serial)
        const isSerialized = !it._isBulk

        // Model key = name + categoryId + serialized flag
        const modelKey = `${it.name.toLowerCase().trim()}|${it.categoryId}|${isSerialized}`

        let productId: string | undefined = modelProductCache[modelKey] || it.dbProductId

        // If no cached/matched product → try to find by name+category in the global list first
        if (!productId) {
          const existingModel = dbProducts.find((p: any) =>
            p.name.toLowerCase().trim() === it.name.toLowerCase().trim() &&
            String(p.categoryId?._id || p.categoryId) === String(it.categoryId) &&
            Boolean(p.isSerialized ?? p.hasSerialNumbers) === isSerialized
          )
          if (existingModel) productId = existingModel._id
        }

        // Still not found → create the model Product (once per model, no serialNumber stored here)
        if (!productId) {
          const catName = dbCategories.find((c: any) => c._id === it.categoryId)?.name || 'أجهزة محمولة'
          const pRes = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: it.name,
              categoryId: (it.categoryId && it.categoryId.length === 24) ? it.categoryId : dbCategories[0]?._id,
              category: catName,
              price: it.sellPrice,
              costPrice: it.buyPrice,
              stock: 0,
              condition: (it.condition || 'New').toLowerCase(),
              isSerialized,
              hasSerialNumbers: isSerialized,
              // IMPORTANT: Do NOT attach serialNumber to the Product model
              // Individual unit serials live on InventoryUnit.serialNumber
              description: it.notes
            })
          })
          const pData = await pRes.json()
          if (!pData.success) {
            setPipe1('error')
            return showToast(`فشل Pipe 1: ${pData.message}`, 'err')
          }
          productId = pData.product._id
        }

        // Cache so the next row with the same model reuses it
        if (productId) modelProductCache[modelKey] = productId

        // Build the payload the reconcile API expects
        reconciledItems.push({
          productId,
          // Correct field names expected by reconcile/route.ts
          serial: it.sku,          // ← was wrongly sent as 'sku'
          cost: it.buyPrice,       // ← was wrongly sent as 'buyPrice'
          sellPrice: it.sellPrice,
          qty: it.qty,
          storage: it.storage,
          color: it.color,
          battery: it.battery,
          condition: it.condition,
          notes: it.notes,
          isSerialized,            // ← tells the API how to handle this unit
        })

        setProcessedCount(idx + 1)
      }
      setPipe1('done')

      // ── Pipe 3: Reconciliation Engine ──────────────────────────────────────────
      setPipe3('running')
      const reconRes = await fetch('/api/inventory/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: reconciledItems, branchId })
      })
      const reconData = await reconRes.json()
      if (!reconData.success) {
        setPipe3('error')
        return showToast(reconData.message || 'فشل محرك تسوية المخزون', 'err')
      }
      
      setPipe3('done')
      showToast('تمت تسوية المخزون وتحديث الكميات بنجاح!', 'ok')
      
    } catch (err) {
      setPipe1('error')
      setPipe3('error')
      showToast('فشل في معالجة القنوات البرمجية', 'err')
    }
  }

  function updateItem(index: number, field: keyof ParsedItem, value: any) {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const cardStyle = { background: '#FFFFFF', borderRadius: 24, border: '1px solid #E2E8F0', padding: '2rem' }
  const inpStyle = { width: '100%', padding: '1rem', border: '1px solid #E2E8F0', borderRadius: 14, fontSize: '0.95rem', color: '#0F172A', outline: 'none', background: '#ECFEFF', boxSizing: 'border-box' as const }
  const lblStyle = { fontSize: '0.82rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.6rem' }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', color: '#1E293B' }}>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -50, opacity: 0 }} style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: toast.type === 'ok' ? '#10B981' : '#EF4444', color: '#0F172A', padding: '1rem 2rem', borderRadius: 50, fontWeight: 800, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Database size={40} color="#06B6D4" /> مركز تسوية المخزون السيادي
          </h1>
          <p style={{ color: '#475569', marginTop: '0.5rem', fontSize: '1.1rem' }}>Stock Reconciliation & Physical Count Center</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
               <div style={cardStyle}>
                  <label style={lblStyle}><MapPin size={16} /> الفرع المستهدف للتسوية الجردية</label>
                  <select style={inpStyle} value={branchId} onChange={e => setBranchId(e.target.value)}>
                    <option value="">-- اختر الفرع والمستودع --</option>
                    {dbBranches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
               </div>
               <div style={cardStyle}>
                  <label style={lblStyle}><Tags size={16} /> التصنيف الافتراضي</label>
                  <select style={inpStyle} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                    <option value="">-- التصنيف الافتراضي --</option>
                    {dbCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
               </div>
            </div>

            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files[0]) setSelectedFile(e.dataTransfer.files[0]) }}
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                ...cardStyle, 
                border: `3px dashed ${isDragging ? '#06B6D4' : 'rgba(6,182,212,0.2)'}`,
                padding: '6rem 2rem', 
                textAlign: 'center', 
                cursor: 'pointer',
                background: isDragging ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.02)'
              }}
            >
              <input type="file" ref={fileInputRef} hidden accept=".xlsx,.csv,.pdf" onChange={e => e.target.files && setSelectedFile(e.target.files[0])} />
              <div style={{ background: '#ECFEFF', width: 100, height: 100, borderRadius: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                <UploadCloud size={50} color="#06B6D4" />
              </div>
              <h2 style={{ fontWeight: 900, fontSize: '1.8rem', color: '#0F172A', marginBottom: '0.75rem' }}>إسقاط كشوف الجرد</h2>
              <p style={{ color: '#475569', fontSize: '1.1rem' }}>اسحب ملف Excel أو PDF الخاص بالجرد الميداني هنا</p>
              
              {selectedFile && (
                <div style={{ marginTop: '2.5rem', padding: '1rem 2rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', gap: '1rem', color: '#10B981', fontWeight: 900 }}>
                   <File size={26} /> {selectedFile.name}
                </div>
              )}
            </div>

            <button 
              onClick={handleAI} 
              disabled={parsing || !selectedFile}
              style={{ 
                padding: '1.5rem', borderRadius: 20, 
                background: selectedFile ? 'linear-gradient(135deg, #06B6D4, #3B82F6)' : '#F8FAFC', 
                color: '#0F172A', border: 'none', fontWeight: 900, fontSize: '1.25rem', 
                cursor: selectedFile ? 'pointer' : 'not-allowed', 
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' 
              }}
            >
              {parsing ? <Loader2 className="animate-spin" size={28} /> : <Sparkles size={28} />} 
              {parsing ? 'جاري تحليل كشوف الجرد...' : 'بدء التحليل الرقمي والمطابقة'}
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ ...cardStyle, background: 'rgba(34,197,94,0.03)', borderColor: 'rgba(34,197,94,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#22C55E', fontWeight: 900, fontSize: '1.3rem' }}>مطابقة الجرد الفعلي</h3>
                <p style={{ color: '#475569', marginTop: '0.3rem' }}>
                  تم استخراج <strong style={{ color: '#22C55E' }}>{items.length}</strong> عنصر
                  {' · '}مسلسل: <strong style={{ color: '#06B6D4' }}>{items.filter(i => i.sku).length}</strong>
                  {' · '}بدون سيريال: <strong style={{ color: '#A855F7' }}>{items.filter(i => !i.sku).length}</strong>
                  {items.some(i => i.isDuplicate) && (<span style={{ color: '#EF4444', marginRight: '0.5rem' }}> · ⚠️ مكرر: {items.filter(i => i.isDuplicate).length}</span>)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setStep(1)} style={{ padding: '0.8rem 1.5rem', borderRadius: 12, background: '#F8FAFC', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>تراجع</button>
                <button onClick={handleApprovePipes} style={{ padding: '0.8rem 2rem', borderRadius: 12, background: '#22C55E', color: '#0F172A', border: 'none', fontWeight: 900, cursor: 'pointer' }}>اعتماد المطابقة (Execute Recon)</button>
              </div>
            </div>

            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#ECFEFF', borderBottom: '2px solid rgba(6,182,212,0.2)' }}>
                      <th style={{ padding: '1rem', width: '50px', color: '#94A3B8' }}>#</th>
                      <th style={{ padding: '1rem', width: '120px' }}>التصنيف</th>
                      <th style={{ padding: '1rem', minWidth: '200px' }}>اسم المنتج</th>
                      <th style={{ padding: '1rem', width: '80px' }}>الكمية</th>
                      {/* Device-only columns — shown only when at least one serialized row exists */}
                      {items.some(x => !(x as any)._isBulk) && (<>
                        <th style={{ padding: '1rem', width: '170px' }}>السيريال / IMEI</th>
                        <th style={{ padding: '1rem', width: '90px' }}>اللون</th>
                        <th style={{ padding: '1rem', width: '75px' }}>البطارية</th>
                        <th style={{ padding: '1rem', width: '75px' }}>المساحة</th>
                        <th style={{ padding: '1rem', width: '100px' }}>الحالة</th>
                      </>)}
                      <th style={{ padding: '1rem', width: '100px' }}>سعر الشراء</th>
                      <th style={{ padding: '1rem', width: '100px' }}>سعر البيع</th>
                      <th style={{ padding: '1rem', minWidth: '160px' }}>البيان</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => {
                      const isBulkRow = (it as any)._isBulk
                      const hasSerialized = items.some(x => !(x as any)._isBulk)
                      const rowBg = isBulkRow ? 'rgba(168,85,247,0.03)' : 'transparent'
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: rowBg }}>
                          <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem' }}>
                            {isBulkRow
                              ? <span style={{ background: 'rgba(168,85,247,0.1)', color: '#A855F7', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 }}>بلك</span>
                              : <span style={{ background: 'rgba(6,182,212,0.1)', color: '#06B6D4', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 }}>جهاز</span>
                            }
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem' }}>
                            <select value={it.categoryId} onChange={e => updateItem(i, 'categoryId', e.target.value)} style={{ ...inpStyle, padding: '0.5rem', fontSize: '0.8rem' }}>
                              <option value="">-- التصنيف --</option>
                              {dbCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem' }}>
                            <input value={it.name} onChange={e => updateItem(i, 'name', e.target.value)} style={{ ...inpStyle, padding: '0.5rem', fontSize: '0.83rem' }} />
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem' }}>
                            {isBulkRow
                              ? <input type="number" min={1} value={it.qty || ''} onChange={e => updateItem(i, 'qty', parseFloat(e.target.value) || 1)} style={{ ...inpStyle, padding: '0.5rem', fontSize: '0.9rem', textAlign: 'center', fontWeight: 800 }} />
                              : <span style={{ display: 'block', textAlign: 'center', fontWeight: 700, color: '#475569' }}>1</span>
                            }
                          </td>
                          {/* Device-only cells */}
                          {hasSerialized && (<>
                            <td style={{ padding: '0.6rem 0.5rem' }}>
                              {isBulkRow
                                ? <span style={{ color: '#94A3B8', fontSize: '0.75rem', display: 'block', textAlign: 'center' }}>—</span>
                                : <input value={it.sku || ''} placeholder="IMEI..." onChange={e => updateItem(i, 'sku', e.target.value)} style={{ ...inpStyle, padding: '0.5rem', fontSize: '0.8rem', fontFamily: 'monospace' }} />}
                            </td>
                            <td style={{ padding: '0.6rem 0.5rem' }}>
                              {isBulkRow
                                ? <span style={{ color: '#94A3B8', fontSize: '0.75rem', display: 'block', textAlign: 'center' }}>—</span>
                                : <input value={it.color || ''} placeholder="اللون" onChange={e => updateItem(i, 'color', e.target.value)} style={{ ...inpStyle, padding: '0.5rem', fontSize: '0.8rem' }} />}
                            </td>
                            <td style={{ padding: '0.6rem 0.5rem' }}>
                              {isBulkRow
                                ? <span style={{ color: '#94A3B8', fontSize: '0.75rem', display: 'block', textAlign: 'center' }}>—</span>
                                : <input value={it.battery || ''} placeholder="%" onChange={e => updateItem(i, 'battery', e.target.value)} style={{ ...inpStyle, padding: '0.5rem', fontSize: '0.8rem', textAlign: 'center' }} />}
                            </td>
                            <td style={{ padding: '0.6rem 0.5rem' }}>
                              {isBulkRow
                                ? <span style={{ color: '#94A3B8', fontSize: '0.75rem', display: 'block', textAlign: 'center' }}>—</span>
                                : <input value={it.storage || ''} placeholder="GB" onChange={e => updateItem(i, 'storage', e.target.value)} style={{ ...inpStyle, padding: '0.5rem', fontSize: '0.8rem', textAlign: 'center' }} />}
                            </td>
                            <td style={{ padding: '0.6rem 0.5rem' }}>
                              {isBulkRow
                                ? <span style={{ color: '#94A3B8', fontSize: '0.75rem', display: 'block', textAlign: 'center' }}>—</span>
                                : <select value={it.condition} onChange={e => updateItem(i, 'condition', e.target.value)} style={{ ...inpStyle, padding: '0.5rem', fontSize: '0.8rem', background: '#F0FDF4', borderColor: '#BBF7D0' }}>
                                    <option value="New">جديد</option>
                                    <option value="Used">مستعمل</option>
                                    <option value="Kaser Zero">كسر زيرو</option>
                                    <option value="A+">A+</option>
                                  </select>
                              }
                            </td>
                          </>)}
                          <td style={{ padding: '0.6rem 0.5rem' }}>
                            <input type="number" value={it.buyPrice || ''} onChange={e => updateItem(i, 'buyPrice', parseFloat(e.target.value) || 0)} style={{ ...inpStyle, padding: '0.5rem', fontSize: '0.83rem', textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem' }}>
                            <input type="number" value={it.sellPrice || ''} onChange={e => updateItem(i, 'sellPrice', parseFloat(e.target.value) || 0)} style={{ ...inpStyle, padding: '0.5rem', fontSize: '0.83rem', textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '0.6rem 0.5rem' }}>
                            <input value={it.notes} onChange={e => updateItem(i, 'notes', e.target.value)} style={{ ...inpStyle, padding: '0.5rem', fontSize: '0.82rem' }} placeholder="البيان..." />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} style={{ ...cardStyle, background: '#F8FAFC', padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3rem' }}>
            <div style={{ textAlign: 'center' }}>
               <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>جاري تنفيذ تسوية المخزون (Data Recon)</h2>
               <p style={{ color: '#475569' }}>تحديث الكميات الفعلية وتصحيح الأرصدة في القنوات البرمجية.</p>
            </div>

            <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: '#ECFEFF', padding: '1.5rem', borderRadius: 20, border: '1px solid #F1F5F9' }}>
                <div style={{ background: pipe1 === 'done' ? '#22C55E' : pipe1 === 'running' ? '#06B6D4' : '#F8FAFC', width: 50, height: 50, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {pipe1 === 'done' ? <CheckCircle2 color="#fff" /> : pipe1 === 'running' ? <Loader2 className="animate-spin" color="#fff" /> : <Package color="#475569" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 800 }}>Pipe 1: مطابقة تعريفات المنتجات</span>
                    <span style={{ fontSize: '0.8rem', color: '#06B6D4' }}>{processedCount} / {items.length}</span>
                  </div>
                  <div style={{ height: 8, background: '#ECFEFF', borderRadius: 10, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(processedCount / items.length) * 100}%` }} style={{ height: '100%', background: '#06B6D4' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(168,85,247,0.05)', padding: '1.5rem', borderRadius: 20, border: '1px solid rgba(168,85,247,0.1)', opacity: pipe1 === 'done' ? 1 : 0.5 }}>
                <div style={{ background: pipe3 === 'done' ? '#22C55E' : pipe3 === 'running' ? '#A855F7' : '#F8FAFC', width: 50, height: 50, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {pipe3 === 'done' ? <CheckCircle2 color="#fff" /> : pipe3 === 'running' ? <Loader2 className="animate-spin" color="#fff" /> : <Server color="#475569" />}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 800 }}>Pipe 3: محرك تسوية المخزون الفعلي</span>
                  <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.3rem' }}>
                    {pipe3 === 'running' ? 'جاري تحديث وحدات المخزن وإعادة حساب الأرصدة...' : pipe3 === 'done' ? 'تم اكتمال المطابقة بنجاح ✓' : 'في انتظار اكتمال المحرك السابق...'}
                  </p>
                </div>
              </div>

            </div>

            {pipe3 === 'done' && (
              <button 
                onClick={() => window.location.href = '/dashboard/inventory'}
                style={{ padding: '1rem 3rem', borderRadius: 15, background: '#06B6D4', color: '#0F172A', border: 'none', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer' }}
              >
                الذهاب لدفتر المخزن (Audit) <ArrowRight size={20} style={{ display: 'inline', marginLeft: '0.5rem' }} />
              </button>
            )}
          </motion.div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .animate-spin { animation: spin 1s linear infinite }
        select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
      `}</style>
    </div>
  )
}
