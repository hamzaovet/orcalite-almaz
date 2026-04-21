'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UploadCloud, File, Loader2, Database } from 'lucide-react'
import * as XLSX from 'xlsx'

function transformProductName(raw: string): string {
  if (!raw) return 'منتج غير معروف'
  let val = raw.trim()
  
  const namesToStrip = ['عبد العزيز', 'خالد', 'حاتم', 'جديد'];
  const pattern = new RegExp(namesToStrip.join('|'), 'gi');
  val = val.replace(pattern, '').replace(/\s+/g, ' ').trim();

  if (/^(\d{2}|X|XR|XS|XS Max)$/i.test(val)) return `أيفون ${val}`
  if (/^(A|S|Note)\s?\d{1,2}/i.test(val)) return `سامسونج ${val}`
  if (/^(Poco)\s?\w{1,3}/i.test(val)) return `بوكو ${val}`
  if (/^(Note)\s?\w{1,3}/i.test(val) && !val.toLowerCase().includes('samsung')) return `شاومي ${val}`
  
  return val || 'منتج غير معروف'
}

const BULK_CATEGORIES = ['إكسسوارات', 'قطع غيار', 'خدمات وشحن']

export function ExcelPurchaseModal({
  onClose,
  onComplete,
  products
}: {
  onClose: () => void
  onComplete: (data: any) => void
  products: any[]
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [previewItems, setPreviewItems] = useState<any[]>([])
  
  const card = { background: 'rgba(6,182,212,0.03)', borderRadius: 16, border: '1px solid rgba(6,182,212,0.15)', padding: '1.5rem' }

  async function handleAnalyze() {
    if (!selectedFile) return
    setParsing(true)
    try {
      const data = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(worksheet) as any[]

      // Strict 9-Column Invoice Mapping (no supplier - selected manually in parent)
      const grouped: any[] = []
      for (const r of rows) {
        const rawName   = String(r['اسم المنتج'] || r['البيان'] || r['Product'] || '').trim()
        if (!rawName) continue

        const name        = transformProductName(rawName)
        const rawCat      = String(r['التصنيف'] || r['القسم'] || r['Category'] || 'أجهزة محمولة').trim()
        
        // CEO PHASE 70: Dynamic Schema Logic
        const isBulk = BULK_CATEGORIES.includes(rawCat)

        const serial      = isBulk ? 'لا يوجد' : (String(r['السيريال'] || r['السريال'] || r['Serial'] || r['IMEI'] || '').trim() || 'لا يوجد')
        const storage     = isBulk ? '' : String(r['المساحة'] || r['Storage'] || '').trim()
        const rawBattery  = isBulk ? '' : String(r['البطارية'] || r['Battery'] || '')
        const battery     = rawBattery.replace(/\D/g, '') ? rawBattery.replace(/\D/g, '') + '%' : ''
        const color       = String(r['اللون'] || r['Color'] || '').trim()
        const unitCost    = Number(String(r['سعر الشراء'] || r['التكلفة'] || r['Cost'] || '0').replace(/,/g, '')) || 0
        const salePrice   = Number(String(r['سعر البيع']  || r['السعر']   || r['Price'] || '0').replace(/,/g, '')) || (unitCost + 2000)
        const rawCond     = String(r['حالة الجهاز'] || r['الحالة'] || r['Condition'] || (isBulk ? 'جديد' : 'مستعمل')).trim()
        const condition   = rawCond === 'مستعمل' ? 'Used' : (rawCond === 'جديد' ? 'New' : 'Used')

        const rowQty      = isBulk ? (Number(r['الكمية'] || r['الكميه'] || r['Qty'] || 1) || 1) : 1

        // Match existing product in DB by name
        const matchedProduct = (products || []).find(
          (p: any) => p.name.toLowerCase().trim() === name.toLowerCase().trim()
        )

        // Merge serials with same product+cost
        const existing = grouped.find(
          g => g.productName === (matchedProduct?.name || name) && g.unitCost === unitCost && g.color === color
        )
        if (existing) {
          existing.qty += rowQty
          if (serial !== 'لا يوجد') existing.imeis.push(serial)
        } else {
          grouped.push({
            productId:    matchedProduct?._id || '',
            productName:  matchedProduct?.name || name,
            categoryName: rawCat,
            serial,
            storage,
            battery,
            color,
            qty:          rowQty,
            unitCost,
            salePrice,
            notes:        '',
            condition,
            imeis:        serial !== 'لا يوجد' ? [serial] : []
          })
        }
      }

      if (grouped.length === 0) {
        alert('لم يتم العثور على بيانات صالحة في الملف')
        return
      }

      setPreviewItems(grouped)
      setStep(2)
    } catch (err: any) {
      alert('حدث خطأ أثناء معالجة ملف الإكسيل')
    } finally {
      setParsing(false)
    }
  }

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelectedFile(file)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(8,12,20,0.85)', backdropFilter: 'blur(10px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ background: '#0B1120', borderRadius: 28, border: '1px solid rgba(6,182,212,0.2)', width: '100%', maxWidth: 850, padding: '2rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 950, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Database color="#06B6D4" size={26} /> إدراج فاتورة من منصة الإكسيل
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginTop: '0.3rem' }}>قم برفع ملف الإكسيل لاستخراج الأصناف والخصائص (سريال، بطارية، حالة) بدقة.</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '50%', padding: '0.6rem', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div 
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                ...card, 
                border: `2px dashed ${isDragging ? '#06B6D4' : 'rgba(6,182,212,0.3)'}`,
                padding: '4rem 2rem', 
                textAlign: 'center', 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: isDragging ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.02)'
              }}
            >
              <input type="file" ref={fileInputRef} hidden accept=".xlsx,.xls,.csv" onChange={e => { if (e.target.files) setSelectedFile(e.target.files[0]) }} />
              <div style={{ background: 'rgba(6,182,212,0.1)', width: 80, height: 80, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <UploadCloud size={40} color="#06B6D4" />
              </div>
              <h3 style={{ fontWeight: 900, fontSize: '1.2rem', color: '#fff', marginBottom: '0.5rem' }}>قم بسحب وإفلات ملف Excel هنا</h3>
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>أو اضغط لاختيار الملف من جهازك</p>
              <p style={{ color: '#475569', fontSize: '0.78rem' }}>الأعمدة المتوقعة: التصنيف، اسم المنتج، السيريال، المساحة، البطارية، اللون، سعر الشراء، سعر البيع، حالة الجهاز</p>

              {selectedFile && (
                <div style={{ marginTop: '2rem', padding: '0.8rem 1.2rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: '0.75rem', color: '#10B981', fontWeight: 800 }}>
                    <File size={20} /> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
            
            <button 
              onClick={handleAnalyze} 
              disabled={parsing || !selectedFile}
              style={{ padding: '1.25rem', borderRadius: 16, background: selectedFile ? '#06B6D4' : '#334155', color: '#fff', border: 'none', fontWeight: 900, fontSize: '1.1rem', cursor: selectedFile ? 'pointer' : 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s' }}
            >
              {parsing ? <Loader2 className="animate-spin" /> : <Database />} تحليل الملف واستخراج الأصناف
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ ...card, background: 'rgba(34,197,94,0.03)', borderColor: 'rgba(34,197,94,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#22C55E', fontWeight: 900 }}>✓ تم استخراج {previewItems.length} صنف بنجاح</p>
                <p style={{ color: '#94A3B8', fontSize: '0.82rem', marginTop: '0.3rem' }}>راجع الأصناف أدناه ثم اضغط «اعتماد» لإضافتها للفاتورة.</p>
              </div>
              <button onClick={() => setStep(1)} style={{ padding: '0.5rem 1rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>تراجع</button>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid rgba(6,182,212,0.15)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(6,182,212,0.1)', borderBottom: '1px solid rgba(6,182,212,0.2)' }}>
                    {['اسم المنتج', 'السيريال', 'المساحة', 'البطارية', 'اللون', 'سعر الشراء', 'سعر البيع', 'الحالة', 'الكمية'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', color: '#94A3B8', fontWeight: 800, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                   {previewItems.map((it, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                      <td style={{ padding: '0.6rem 1rem', color: '#fff', fontWeight: 700 }}>{it.productName}</td>
                      <td style={{ padding: '0.6rem 1rem', color: '#06B6D4', fontFamily: 'monospace', fontSize: '0.75rem', opacity: it.serial === 'لا يوجد' ? 0.3 : 1 }}>{it.serial}</td>
                      <td style={{ padding: '0.6rem 1rem', color: '#94A3B8', opacity: it.serial === 'لا يوجد' ? 0.3 : 1 }}>{it.storage}</td>
                      <td style={{ padding: '0.6rem 1rem', color: '#94A3B8', opacity: it.serial === 'لا يوجد' ? 0.3 : 1 }}>{it.battery}</td>
                      <td style={{ padding: '0.6rem 1rem', color: '#94A3B8' }}>{it.color}</td>
                      <td style={{ padding: '0.6rem 1rem', color: '#F59E0B', fontWeight: 700 }}>{it.unitCost.toLocaleString()}</td>
                      <td style={{ padding: '0.6rem 1rem', color: '#10B981', fontWeight: 700 }}>{it.salePrice.toLocaleString()}</td>
                      <td style={{ padding: '0.6rem 1rem' }}>
                        <span style={{ background: it.condition === 'Used' ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)', color: it.condition === 'Used' ? '#EAB308' : '#22C55E', padding: '2px 8px', borderRadius: 6, fontWeight: 800, fontSize: '0.75rem' }}>
                          {it.condition === 'Used' ? 'مستعمل' : 'جديد'}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 1rem', color: '#fff', fontWeight: 900, textAlign: 'center' }}>{it.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => { onComplete({ items: previewItems }); onClose() }}
              style={{ padding: '1.25rem', borderRadius: 16, background: '#10B981', color: '#fff', border: 'none', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}
            >
              <Database size={20} /> اعتماد وإضافة {previewItems.length} صنف للفاتورة
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
