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
  cost: number
  price: number // Sale Price
  serial: string
  storage: string
  battery: string
  color: string
  notes: string
  isDuplicate?: boolean
  dbProductId?: string
  status?: 'new' | 'existing'
  wholesaleMargin?: number
  wholesalePriceEGP?: number
  condition?: string
}

type PipeStatus = 'pending' | 'running' | 'done' | 'error'

const BULK_CATEGORIES = ['إكسسوارات', 'قطع غيار', 'خدمات وشحن']

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

  function transformProductName(raw: string): string {
    if (!raw) return 'منتج غير معروف'
    let val = raw.trim()
    
    // Phase 37: Name Sanitization - Strip person names and 'جديد'
    const namesToStrip = ['عبد العزيز', 'خالد', 'حاتم', 'جديد'];
    const pattern = new RegExp(namesToStrip.join('|'), 'gi');
    val = val.replace(pattern, '').replace(/\s+/g, ' ').trim();

    // iPhone shorthand
    if (/^(\d{2}|X|XR|XS|XS Max)$/i.test(val)) return `أيفون ${val}`
    // Samsung (A series, S series, Note)
    if (/^(A|S|Note)\s?\d{1,2}/i.test(val)) return `سامسونج ${val}`
    // Xiaomi / Poco (Note, Poco)
    if (/^(Poco)\s?\w{1,3}/i.test(val)) return `بوكو ${val}`
    if (/^(Note)\s?\w{1,3}/i.test(val) && !val.toLowerCase().includes('samsung')) return `شاومي ${val}`
    
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
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        extracted = rows.map(r => {
          const rawCat = String(r['التصنيف'] || r['القسم'] || r['Category'] || 'أجهزة محمولة').trim();
          const matchedDbCat = dbCategories.find(c => c.name.toLowerCase() === rawCat.toLowerCase());
          
          // CEO PHASE 70: Dynamic Schema Detection
          const isBulk = BULK_CATEGORIES.includes(rawCat) || (matchedDbCat && BULK_CATEGORIES.includes(matchedDbCat.name));

          const rawName = String(r['اسم المنتج'] || r['البيان'] || r['الاسم'] || r['Product'] || '').trim();
          const name = transformProductName(rawName);
          
          // If bulk, serial/storage/battery are ignored. Expected: 'الكمية'
          const serial = isBulk ? 'لا يوجد' : (String(r['السيريال'] || r['السريال'] || r['Serial'] || r['IMEI'] || '').trim() || 'لا يوجد');
          const storage = isBulk ? '' : String(r['المساحة'] || r['المساحه'] || r['Storage'] || '').trim();
          
          const rawBattery = isBulk ? '' : String(r['البطارية'] || r['Battery'] || '');
          const batteryValue = rawBattery.replace(/\D/g, ''); 
          const battery = batteryValue ? batteryValue + '%' : '';
          
          const color = String(r['اللون'] || r['Color'] || '').trim();
          
          const cost = Number(String(r['سعر الشراء'] || r['التكلفة'] || r['Cost'] || '0').replace(/,/g, '')) || 0;
          const salePrice = Number(String(r['سعر البيع'] || r['السعر'] || r['Sale Price'] || '0').replace(/,/g, '')) || 0;
          const finalSalePrice = (salePrice === 0) ? (cost + 2000) : salePrice;
          
          const rawNotes = String(r['الملاحظات'] || r['ملاحظات'] || r['Notes'] || r['البيان'] || '').trim();
          const hasBox = rawNotes.toLowerCase().includes('علبة') || rawNotes.toLowerCase().includes('box');
          const finalNotes = rawNotes + (hasBox && !rawNotes.toLowerCase().includes('علبة') ? ' (علبة)' : '');
          
          const rawCondition = String(r['الحالة'] || r['حالة الجهاز'] || r['Condition'] || '').trim();
          const condition = rawCondition === 'جديد' ? 'New' : (rawCondition === 'مستعمل' ? 'Used' : 'New');

          // Quantity Logic: use 'الكمية' for bulk, 1 for serialized
          const qty = isBulk ? (Number(r['الكمية'] || r['الكميه'] || r['Qty'] || 1) || 1) : 1;

          return {
            categoryId: matchedDbCat ? matchedDbCat._id : (categoryId || ''),
            name,
            serial,
            storage,
            battery,
            color,
            cost,
            price: finalSalePrice,
            notes: finalNotes || 'تسوية جرد',
            condition,
            qty
          }
        });
      } else if (ext === 'pdf') {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const res = await fetch('/api/ai/extract-inventory', { method: 'POST', body: formData });
        const json = await res.json();
        if (json.success) {
          extracted = json.data.map((d: any) => ({ 
            ...d, 
            categoryId, 
            serial: d.serial || 'لا يوجد',
            price: d.price || (d.cost + 2000),
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
        const serials = extracted.map(e => e.serial).filter(s => s && s.length > 5)
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
            isDuplicate: dupSet.has(e.serial)
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
      const reconciledItems = []
      
      // Pipe 1: Create/Match Products (Global Master Establishment)
      for (const [idx, it] of items.entries()) {
        if (it.isDuplicate) {
          setProcessedCount(idx + 1)
          continue
        }

        let productId = it.dbProductId
        
        // Local cache check for same-batch duplicates
        const localMatch = reconciledItems.find(fi => 
          fi.name.toLowerCase().trim() === it.name.toLowerCase().trim() && 
          String(fi.categoryId) === String(it.categoryId)
        )
        if (localMatch?.productId) {
          productId = localMatch.productId
        }

        if (!productId && it.status === 'new') {
          const pRes = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: it.name,
              categoryId: (it.categoryId && it.categoryId.length === 24) ? it.categoryId : (dbCategories[0]?._id),
              category: dbCategories.find(c => c._id === it.categoryId)?.name || 'أجهزة محمولة',
              price: it.price,
              costPrice: it.cost,
              stock: 0,
              condition: (it.condition || 'New').toLowerCase(),
              isSerialized: it.serial !== 'لا يوجد',
              hasSerialNumbers: it.serial !== 'لا يوجد',
              serialNumber: it.serial !== 'لا يوجد' ? it.serial : undefined,
              storage: it.storage,
              color: it.color,
              batteryHealth: it.battery,
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

        reconciledItems.push({
          ...it,
          productId: productId
        })

        setProcessedCount(idx + 1)
      }
      setPipe1('done')

      // Pipe 3: Reconciliation Engine (Direct Inventory Adjustment)
      setPipe3('running')
      const reconRes = await fetch('/api/inventory/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reconciledItems,
          branchId: branchId
        })
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
                <p style={{ color: '#475569', marginTop: '0.3rem' }}>تم استخراج {items.length} عنصر للمطابقة. الكميات الموضحة ستصبح هي الكميات النهائية في المخزن.</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setStep(1)} style={{ padding: '0.8rem 1.5rem', borderRadius: 12, background: '#F8FAFC', color: '#475569', border: 'none', fontWeight: 700, cursor: 'pointer' }}>تراجع</button>
                <button onClick={handleApprovePipes} style={{ padding: '0.8rem 2rem', borderRadius: 12, background: '#22C55E', color: '#0F172A', border: 'none', fontWeight: 900, cursor: 'pointer' }}>اعتماد المطابقة (Execute Recon)</button>
              </div>
            </div>

            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ background: '#ECFEFF', borderBottom: '1px solid rgba(6,182,212,0.2)' }}>
                      <th style={{ padding: '1.25rem', width: '130px' }}>التصنيف</th>
                      <th style={{ padding: '1.25rem', width: '220px' }}>اسم المنتج</th>
                      <th style={{ padding: '1.25rem', width: '90px' }}>العدد الفعلي</th>
                      <th style={{ padding: '1.25rem', width: '180px' }}>السيريال / SKU</th>
                      <th style={{ padding: '1.25rem', width: '180px' }}>تكلفة الوحدة</th>
                      <th style={{ padding: '1.25rem', width: '250px' }}>البيان / ملاحظات التسوية</th>
                      <th style={{ padding: '1.25rem', width: '100px' }}>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? 'transparent' : 'transparent' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <select value={it.categoryId} onChange={e => updateItem(i, 'categoryId', e.target.value)} style={{ ...inpStyle, padding: '0.6rem', fontSize: '0.85rem' }}>
                            <option value="">-- التصنيف --</option>
                            {dbCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                           <input value={it.name} onChange={e => updateItem(i, 'name', e.target.value)} style={{ ...inpStyle, padding: '0.6rem', fontSize: '0.9rem', width: '100%' }} />
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <input type="number" value={it.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))} style={{ ...inpStyle, padding: '0.6rem', fontSize: '0.9rem', textAlign: 'center' }} />
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <input disabled={it.serial === 'لا يوجد'} value={it.serial} onChange={e => updateItem(i, 'serial', e.target.value)} style={{ ...inpStyle, padding: '0.6rem', fontSize: '0.85rem', fontFamily: 'monospace' }} />
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <input type="number" value={it.cost} onChange={e => updateItem(i, 'cost', Number(e.target.value))} style={{ ...inpStyle, padding: '0.6rem', fontSize: '0.85rem', textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <input value={it.notes} onChange={e => updateItem(i, 'notes', e.target.value)} style={{ ...inpStyle, padding: '0.6rem', fontSize: '0.85rem' }} placeholder="البيان..." />
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                           <span style={{ fontSize: '0.75rem', background: '#ECFEFF', color: '#06B6D4', padding: '4px 8px', borderRadius: 8, fontWeight: 800 }}>
                              {it.status === 'existing' ? 'موجود' : 'جديد'}
                           </span>
                        </td>
                      </tr>
                    ))}
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
