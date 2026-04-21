import { readFileSync, writeFileSync } from 'fs'

const file = 'd:/Work/freezone-erp/components/dashboard/ShipmentModal.tsx'
let content = readFileSync(file, 'utf8')

// 1. Inject State
const stateInjection = `  const [localProducts, setLocalProducts] = useState(products)
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
`

content = content.replace('const [saving, setSaving] = useState(false)', 'const [saving, setSaving] = useState(false)\n\n' + stateInjection)

// 2. Adjust rendering of the product dropdown
const dropdownSearch = `<select style={inp} value={item.productId} onChange={e => {
                        const newItems = [...form.items]; newItems[idx].productId = e.target.value; setForm({ ...form, items: newItems })
                      }}>
                        <option value="">اختر منتج...</option>
                        {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </select>`
                      
const dropdownReplace = `<div style={{ display: 'flex', gap: '0.4rem' }}>
                        <select style={{...inp, flex: 1}} value={item.productId} onChange={e => {
                          const newItems = [...form.items]; newItems[idx].productId = e.target.value; setForm({ ...form, items: newItems })
                        }}>
                          <option value="">اختر منتج...</option>
                          {localProducts.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                        <button title="إضافة منتج سريع (Quick Add)" onClick={() => setQuickAddIndex(idx)} style={{ background: 'rgba(6,182,212,0.1)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 10, padding: '0 0.8rem', cursor: 'pointer', fontWeight: 900, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>`

content = content.replace(dropdownSearch, dropdownReplace)

// 3. Inject Quick Add Modal UI right before the final </motion.div>
const quickAddUI = `      
        {/* Quick Add Modal */}
        <AnimatePresence>
          {quickAddIndex !== null && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}>
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{ background: '#0B1120', padding: '2rem', borderRadius: 24, width: '100%', maxWidth: 450, border: '1px solid rgba(168,85,247,0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#A855F7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={22} /> إضافة منتج سريع
                  </h3>
                  <button onClick={() => setQuickAddIndex(null)} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: 50, padding: '0.4rem', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={lbl}>اسم المنتج *</label>
                    <input style={inp} autoFocus placeholder="مثال: سكرين حماية آيفون 15" value={quickForm.name} onChange={e => setQuickForm({ ...quickForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label style={lbl}>القسم</label>
                    <select style={inp} value={quickForm.category} onChange={e => setQuickForm({ ...quickForm, category: e.target.value })}>
                      {categories.length > 0 ? categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>) : <option value="إكسسوارات">إكسسوارات</option>}
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(168,85,247,0.05)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(168,85,247,0.15)' }}>
                    <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', flexShrink: 0 }}>
                      <input type="checkbox" style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} checked={quickForm.isSerialized} onChange={e => setQuickForm({...quickForm, isSerialized: e.target.checked})} />
                      <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: quickForm.isSerialized ? '#06B6D4' : 'rgba(255,255,255,0.1)', transition: '.3s', borderRadius: '24px' }}>
                        <span style={{ position: 'absolute', height: '14px', width: '14px', left: quickForm.isSerialized ? '22px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.3s', borderRadius: '50%' }} />
                      </span>
                    </label>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: quickForm.isSerialized ? '#06B6D4' : '#A855F7', display: 'block' }}>تتبع بالأرقام التسلسلية (IMEI)</span>
                      <span style={{ fontSize: '0.65rem', color: '#64748B' }}>أوقفه للإكسسوارات والكميات</span>
                    </div>
                  </div>

                  <button onClick={handleQuickSave} disabled={quickSaving} style={{ background: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)', color: '#fff', border: 'none', borderRadius: 14, padding: '1rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
                    {quickSaving ? <Loader2 size={20} className="animate-spin" /> : 'حفظ واختيار تلقائي'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
`

const targetDiv = `      </motion.div>
    </div>`
content = content.replace(targetDiv, quickAddUI + '\n' + targetDiv)

writeFileSync(file, content, 'utf8')
console.log('ShipmentModal updated for Quick Add')
