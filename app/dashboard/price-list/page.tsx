'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Loader2, Send, Share2, Plus, Users, LayoutList, Filter } from 'lucide-react'
import { motion } from 'framer-motion'

export default function PriceListPage() {
  const [units, setUnits] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [filteredContacts, setFilteredContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Advanced Filters
  const [targetAudience, setTargetAudience] = useState<'All' | 'Wholesale' | 'Retail'>('All')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedBrand, setSelectedBrand] = useState('All')
  const [groupSerialized, setGroupSerialized] = useState(false)

  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // CRM
  const [showCRM, setShowCRM] = useState(false)
  const [crmForm, setCrmForm] = useState({ name: '', phone: '', type: 'Wholesale' })
  const [savingCrm, setSavingCrm] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [invRes, crmRes, catRes] = await Promise.all([
          fetch('/api/inventory?status=Available'),
          fetch('/api/merchant-contacts'),
          fetch('/api/categories')
        ])
        const invData = await invRes.json()
        const crmData = await crmRes.json()
        const catData = await catRes.json()
        
        setUnits(invData.units || [])
        setContacts(crmData.contacts || [])
        // API returns { categories } not { data }
        setCategories(catData.categories || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (targetAudience === 'All') setFilteredContacts(contacts)
    else setFilteredContacts(contacts.filter(c => c.type === targetAudience))
  }, [contacts, targetAudience])

  // Extract unique category names from loaded inventory for the 'Brand/Category' secondary filter
  const availableCategoryNames = useMemo(() => {
    const names = new Set<string>()
    units.forEach(u => {
      // Try populated categoryId.name first, then fall back to product.category string
      const catName = u.productId?.categoryId?.name || u.productId?.category
      if (catName) names.add(catName)
    })
    return Array.from(names).sort()
  }, [units])

  // Aggregate and Filter
  const displayedItems = useMemo(() => {
    // 1. Initial Filtering
    const filtered = units.filter(u => {
      const p = u.productId
      if (!p) return false
      
      // MUST Block Pending Inventory (Ghost Stock)
      // If it requires a serial number but does not have one, it's pending.
      if (p.hasSerialNumbers !== false && !u.serialNumber) return false

      if (selectedCategory !== 'All' && String(p.categoryId?._id ?? p.categoryId) !== selectedCategory) return false
      // selectedBrand is repurposed as a secondary category-name filter
      if (selectedBrand !== 'All') {
        const catName = p.categoryId?.name || p.category || ''
        if (catName !== selectedBrand) return false
      }
      
      const title = p.name?.toLowerCase() || ''
      const sn = u.serialNumber?.toLowerCase() || ''
      const q = search.toLowerCase()
      return title.includes(q) || sn.includes(q)
    })

    // 2. Smart Aggregation
    const aggregated: any[] = []
    const bulkMap = new Map<string, any>()
    const groupMap = new Map<string, any>()

    filtered.forEach(u => {
      const p = u.productId
      const isBulk = p.hasSerialNumbers === false

      if (isBulk) {
        // Bulk items always group by productId
        const pid = String(p._id)
        if (bulkMap.has(pid)) {
          bulkMap.get(pid).quantity += 1
        } else {
          bulkMap.set(pid, { ...u, quantity: 1, isBulk: true })
        }
      } else {
        // Serialized
        if (groupSerialized) {
           // Compact mode: group by Product + Storage + Color + Condition (all 4 must match)
           const storage   = u.attributes?.storage     || u.productId?.storage     || ''
           const color     = u.attributes?.color       || u.productId?.color       || ''
           const condition = u.attributes?.condition   || u.productId?.condition   || ''
           const battery   = u.attributes?.batteryHealth || ''
           const attrKey   = `${p._id}||${storage}||${color}||${condition}||${battery}`
           if (groupMap.has(attrKey)) {
              groupMap.get(attrKey).quantity += 1
           } else {
              groupMap.set(attrKey, { ...u, quantity: 1, isGrouped: true })
           }
        } else {
           // Display Individually
           aggregated.push({ ...u, quantity: 1 })
        }
      }
    })

    const finalArray = [...aggregated, ...Array.from(bulkMap.values()), ...Array.from(groupMap.values())]
    return finalArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [units, search, selectedCategory, selectedBrand, groupSerialized])

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const saveContact = async () => {
    if (!crmForm.name || !crmForm.phone) return showToast('يرجى ملء الاسم والهاتف', 'err')
    setSavingCrm(true)
    try {
      const res = await fetch('/api/merchant-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crmForm)
      })
      const data = await res.json()
      if (res.ok) {
        setContacts([data.contact, ...contacts])
        setCrmForm({ name: '', phone: '', type: 'Wholesale' })
        setShowCRM(false)
        showToast('تمت إضافة جهة الاتصال بنجاح')
      } else throw new Error(data.message)
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ', 'err')
    } finally {
      setSavingCrm(false)
    }
  }

  const handleBroadcast = () => {
    if (filteredContacts.length === 0) return showToast('لا توجد جهات اتصال مطابقة', 'err')
    if (displayedItems.length === 0) return showToast('لا توجد قائمة بضاعة لتبثها', 'err')

    setIsBroadcasting(true)

    let msg = `🌟 *قائمة الأسعار والتحديثات - ORCA ERP* 🌟\n\n`
    msg += `التاريخ: ${new Date().toLocaleDateString('ar-EG')}\n`
    if (selectedCategory !== 'All') {
      const c = categories.find(c => String(c._id) === selectedCategory)
      if (c) msg += `📍 القسم: ${c.name}\n`
    }
    if (selectedBrand !== 'All') {
      msg += `🏷️ البراند: ${selectedBrand}\n`
    }
    msg += `======================\n\n`

    displayedItems.forEach((u, i) => {
      const pName = u.productId?.name || 'جهاز غير معروف'
      const rawPrice = u.productId?.sellingPrice || u.productId?.wholesalePriceEGP || u.productId?.price
      const price = rawPrice ? `${rawPrice.toLocaleString()} ج.م` : 'تواصل معنا'
      
      const attr = u.attributes || {}
      const details = [
        attr.storage ? `مساحة: ${attr.storage}` : '',
        attr.color ? `لون: ${attr.color}` : '',
        attr.batteryHealth ? `بطارية: ${attr.batteryHealth}%` : '',
        attr.condition ? `الحالة: ${attr.condition}` : '',
      ].filter(Boolean).join(' | ')

      msg += `*${i + 1}. ${pName}*\n`
      if (u.isBulk || u.isGrouped) {
         msg += `📦 الكمية المتاحة: ${u.quantity}\n`
         if (details) msg += `📍 التفاصيل: ${details}\n`
      } else {
         if (details) msg += `📍 التفاصيل: ${details}\n`
         if (u.serialNumber) msg += `🔢 السيريال: ${u.serialNumber}\n`
      }
      
      msg += `💰 السعر: ${price}\n\n`
    })

    msg += `======================\n`
    msg += `للحجز والاستفسار يرجى الرد على هذه الرسالة.\n`

    setTimeout(() => {
      setIsBroadcasting(false)
      showToast(`تم بث القائمة لـ ${filteredContacts.length} جهة اتصال (Webhook Simulation)`)
      
      const fallbackPhone = filteredContacts[0]?.phone || ''
      const waLink = `https://wa.me/${fallbackPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
      window.open(waLink, '_blank')
    }, 1500)
  }

  const cardStyle = {
    background: 'rgba(5, 8, 15, 0.6)', 
    borderRadius: 24, 
    border: '1px solid #E2E8F0',
    boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
  }

  const inpStyle = {
    background: '#F8FAFC', border: '1px solid rgba(6,182,212,0.2)', color: '#0F172A',
    borderRadius: 12, padding: '0.8rem 1rem', width: '100%', outline: 'none'
  }

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', color: '#1E293B' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.type === 'ok' ? '#06B6D4' : '#EF4444', color: '#0F172A', padding: '0.65rem 1.5rem', borderRadius: 50, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.22em', color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.4rem' }}>ORCA CRM & Broadcast</p>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0F172A' }}>محرك قوائم الأسعار</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Main List */}
        <div style={{ ...cardStyle, padding: '2rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
             <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0F172A' }}>
                <LayoutList color="#06B6D4" /> البضاعة ({displayedItems.length} سطر)
             </h2>

             {/* Filter Bar */}
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', background: '#F1F5F9', padding: '0.8rem 1rem', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Filter size={16} color="#94A3B8" />
                   <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#0F172A', outline: 'none', fontWeight: 700, fontSize: '0.85rem' }}>
                      <option value="All">كل الأقسام</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                   </select>
                </div>
                
                <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', height: 24 }}></div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <select value={selectedBrand} onChange={e=>setSelectedBrand(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#0F172A', outline: 'none', fontWeight: 700, fontSize: '0.85rem' }}>
                      <option value="All">كل الأصناف</option>
                      {availableCategoryNames.map(n => <option key={n} value={n}>{n}</option>)}
                   </select>
                </div>

                <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', height: 24 }}></div>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#475569', cursor: 'pointer', fontWeight: 700 }}>
                   <input type="checkbox" checked={groupSerialized} onChange={e=>setGroupSerialized(e.target.checked)} style={{ accentColor: '#06B6D4' }} />
                   تجميع هواتف نفس المواصفات
                </label>

                <div style={{ flex: 1 }}></div>

                <div style={{ position: 'relative', width: '100%', maxWidth: 250 }}>
                   <Search size={16} color="#64748B" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
                   <input type="text" placeholder="بحث بالاسم..." value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inpStyle, paddingRight: '2.5rem', padding: '0.5rem 1rem 0.5rem 2.5rem', fontSize: '0.85rem' }} />
                </div>
             </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
             {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 0' }}><Loader2 className="animate-spin" color="#06B6D4" size={30} style={{ margin: '0 auto' }} /></div>
             ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>اسم الجهاز (Device Name)</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>السيريال/الكمية (Serial/Qty)</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>المساحة (Storage)</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>اللون (Color)</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>البطارية (Battery)</th>
                      <th style={{ padding: '1rem', textAlign: 'center' }}>التصنيف (Condition)</th>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>السعر (Price)</th>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>التاريخ (Date)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedItems.map((u, i) => {
                      const rawPrice = u.productId?.sellingPrice || u.productId?.wholesalePriceEGP || u.productId?.price
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #F8FAFC', background: u.isBulk ? 'rgba(34,197,94,0.03)' : u.isGrouped ? 'rgba(168,85,247,0.03)' : 'transparent' }}>
                          <td style={{ padding: '1rem', color: '#0F172A', fontWeight: 800 }}>
                             {u.productId?.name || '—'}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', color: u.isBulk || u.isGrouped ? '#06B6D4' : '#94A3B8', fontWeight: 900, direction: 'ltr' }}>
                             {u.isBulk || u.isGrouped ? `الكمية: ${u.quantity}` : (u.serialNumber || '—')}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', color: '#475569', direction: 'ltr' }}>
                             {u.isBulk ? '-' : (u.attributes?.storage || '-')}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', color: '#475569' }}>
                             {u.isBulk ? '-' : (u.attributes?.color || '-')}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', color: '#475569', direction: 'ltr' }}>
                             {u.isBulk ? '-' : (u.attributes?.batteryHealth ? u.attributes.batteryHealth + '%' : '-')}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', color: '#475569' }}>
                             {u.isBulk ? '-' : (u.attributes?.condition || '-')}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'left', color: '#22C55E', fontWeight: 900, direction: 'ltr' }}>
                            {rawPrice ? `${rawPrice.toLocaleString()} ج.م` : '—'}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'left', color: '#475569', whiteSpace: 'nowrap' }}>
                            {new Date(u.createdAt).toLocaleDateString('ar-EG')}
                          </td>
                        </tr>
                      )
                    })}
                    {displayedItems.length === 0 && <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>لا توجد بيانات مطابقة</td></tr>}
                  </tbody>
                </table>
             )}
          </div>
        </div>

        {/* Right Column: CRM & Broadcast Engine */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           
           <div style={{ ...cardStyle, padding: '1.5rem', background: 'linear-gradient(135deg, rgba(6,182,212,0.05), rgba(168,85,247,0.05))', border: '1px solid rgba(168,85,247,0.3)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#A855F7', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <Share2 size={20} /> محرك البث (Broadcast)
              </h2>
              
              <div style={{ marginBottom: '1.5rem' }}>
                 <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', fontWeight: 700, marginBottom: '0.5rem' }}>الجمهور المستهدف (العملاء / التجار)</label>
                 <select value={targetAudience} onChange={e=>setTargetAudience(e.target.value as any)} style={inpStyle}>
                   <option value="All">الجميع ({contacts.length} جهة)</option>
                   <option value="Wholesale">التجار والجملة ({contacts.filter(c=>c.type==='Wholesale').length})</option>
                   <option value="Retail">عمليات التجزئة ({contacts.filter(c=>c.type==='Retail').length})</option>
                 </select>
              </div>

              <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: 16, marginBottom: '1.5rem', textAlign: 'center', border: '1px solid #F1F5F9' }}>
                <p style={{ color: '#06B6D4', fontWeight: 800, fontSize: '1.5rem' }}>{filteredContacts.length}</p>
                <p style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 700 }}>جهة اتصال مستهدفة</p>
              </div>

              <button 
                onClick={handleBroadcast} disabled={isBroadcasting}
                style={{ width: '100%', padding: '1.1rem', background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', color: '#0F172A', border: 'none', borderRadius: 14, fontWeight: 900, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}
              >
                {isBroadcasting ? <Loader2 className="animate-spin" size={20} /> : <><Send size={20} /> بث ({displayedItems.length} سطر)</>}
              </button>
           </div>

           <div style={{ ...cardStyle, padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                 <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                   <Users size={18} color="#06B6D4" /> قاعدة البيانات
                 </h2>
                 <button onClick={() => setShowCRM(!showCRM)} style={{ background: '#ECFEFF', color: '#06B6D4', border: 'none', borderRadius: 8, padding: '0.4rem 0.6rem', cursor: 'pointer' }}><Plus size={16} /></button>
              </div>

              {showCRM && (
                 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #F1F5F9' }}>
                    <input type="text" placeholder="الاسم" value={crmForm.name} onChange={e=>setCrmForm({...crmForm, name: e.target.value})} style={{...inpStyle, padding: '0.6rem'}} />
                    <input type="text" placeholder="الهاتف (+20...)" value={crmForm.phone} onChange={e=>setCrmForm({...crmForm, phone: e.target.value})} style={{...inpStyle, direction: 'ltr', padding: '0.6rem'}} />
                    <select value={crmForm.type} onChange={e=>setCrmForm({...crmForm, type: e.target.value})} style={{...inpStyle, padding: '0.6rem'}}>
                      <option value="Wholesale">تاجر بالجملة</option>
                      <option value="Retail">عميل تجزئة</option>
                    </select>
                    <button onClick={saveContact} disabled={savingCrm} style={{ background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 10, padding: '0.6rem', fontWeight: 800, cursor: 'pointer' }}>حفظ وإضافة</button>
                 </motion.div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 250, overflowY: 'auto', paddingRight: '0.4rem' }}>
                 {contacts.map((c, i) => (
                   <div key={c._id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '0.7rem', borderRadius: 10 }}>
                     <div>
                       <p style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A' }}>{c.name}</p>
                       <p style={{ fontSize: '0.7rem', color: '#475569', direction: 'ltr' }}>{c.phone}</p>
                     </div>
                     <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: 50, background: c.type === 'Wholesale' ? 'rgba(168,85,247,0.1)' : 'rgba(6,182,212,0.1)', color: c.type === 'Wholesale' ? '#A855F7' : '#06B6D4' }}>{c.type}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

      </div>
    </div>
  )
}
