'use client'

import { useState, useEffect } from 'react'
import { Shield, Users, Eye, EyeOff, Plus, Trash2, Check, Loader2, DollarSign, Coins, RefreshCw, Upload } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const IMGBB_KEY = '1705736b8f2b46dcbaeec8a6025aca83'

type AdminUser = { id: string; name: string; username: string; role: string; email: string }

export default function SettingsPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }
  const [loadingUsers, setLoadingUsers] = useState(true)
  interface Currency { _id: string; code: string; name: string; exchangeRate: number }
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', exchangeRate: '1' })
  const [savingCurrencies, setSavingCurrencies] = useState(false)

  // System Settings
  const [storeSettings, setStoreSettings] = useState({ whatsappNumber: '', exchangeRate: 1, exchangeRateUSD: 1, storeName: 'ORCA ERP', storeLogoUrl: '', businessType: 'B2B_WHALE', salesWhatsapp: '', maintenanceWhatsapp: '' })
  const [currentUser, setCurrentUser] = useState<{role: string} | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd })
      const data = await res.json()
      if (data?.data?.display_url) {
        setStoreSettings(prev => ({ ...prev, storeLogoUrl: data.data.display_url }))
      } else {
        showToast('فشل رفع الصورة', 'err')
      }
    } catch {
      showToast('حدث خطأ أثناء رفع الصورة', 'err')
    } finally {
      setUploadingLogo(false)
    }
  }
  
  // Wipe Status
  const [showResetModal, setShowResetModal] = useState(false)
  const [accountPassword, setAccountPassword] = useState('')
  const [isWiping, setIsWiping] = useState(false)
  
  useEffect(() => {
    setLoadingUsers(true)
    Promise.all([
      fetch('/api/users').then(res => res.json()),
      fetch('/api/currencies').then(res => res.json()),
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/auth/me').then(res => res.json())
    ]).then(([userData, curData, settsData, meData]) => {
      if (meData?.user) {
        setCurrentUser(meData.user)
        const r = meData.user.role
        if (r !== 'Admin' && r !== 'SuperAdmin') {
          setAccessDenied(true)
          return
        }
      }
      if (userData.users) setUsers(userData.users)
      if (curData.currencies) setCurrencies(curData.currencies)
      if (settsData && !settsData.error) {
        setStoreSettings({
          whatsappNumber: settsData.whatsappNumber || '',
          exchangeRate: settsData.exchangeRate || 1,
          exchangeRateUSD: settsData.exchangeRateUSD || 1,
          storeName: settsData.storeName || 'ORCA ERP',
          storeLogoUrl: settsData.storeLogoUrl || '',
          businessType: settsData.businessType || 'B2B_WHALE',
          salesWhatsapp: settsData.salesWhatsapp || '',
          maintenanceWhatsapp: settsData.maintenanceWhatsapp || ''
        })
      }
    })
    .finally(() => {
      setLoadingUsers(false)
    })
  }, [])

  async function handleAddCurrency() {
    if (!newCurrency.code || !newCurrency.name) return
    setSavingCurrencies(true)
    try {
      const res = await fetch('/api/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCurrency)
      })
      const data = await res.json()
      if (data.success) {
        setCurrencies([...currencies, data.currency])
        setNewCurrency({ code: '', name: '', exchangeRate: '1' })
      }
    } finally { setSavingCurrencies(false) }
  }

  async function handleUpdateCurrency(id: string, rate: string) {
    if (!rate) return
    try {
      const res = await fetch('/api/currencies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, exchangeRate: rate })
      })
      const data = await res.json()
      if (data.success) {
        setCurrencies(prev => prev.map(c => c._id === id ? data.currency : c))
      }
    } catch {}
  }
  
  async function handleDeleteCurrency(id: string) {
    if (!confirm('حذف العملة نهائياً؟')) return
    try {
      const res = await fetch(`/api/currencies?id=${id}`, { method: 'DELETE' })
      if ((await res.json()).success) {
        setCurrencies(prev => prev.filter(c => c._id !== id))
      }
    } catch {}
  }

  /* ... existing state and logic ... */
  const [pwForm, setPwForm]   = useState({ old: '', new1: '', new2: '' })
  /* ... (rest of the file logic stays or is slightly adjusted) ... */
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')

  /* ── Add user form ── */
  const [addForm, setAddForm]   = useState({ name: '', email: '', username: '', password: '', role: 'Cashier' })
  const [showAddForm, setShowAddForm] = useState(false)
  const [userSaved, setUserSaved]     = useState(false)

  function handlePwSave(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (pwForm.new1 !== pwForm.new2) { setPwError('كلمتا المرور الجديدتان غير متطابقتين'); return }
    if (pwForm.new1.length < 6) { setPwError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    setPwSaved(true)
    setPwForm({ old: '', new1: '', new2: '' })
    setTimeout(() => setPwSaved(false), 3000)
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.name || !addForm.email || !addForm.username || !addForm.password) return

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, role: addForm.role.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setUsers([data.user, ...users])
        setAddForm({ name: '', email: '', username: '', password: '', role: 'Cashier' })
        setShowAddForm(false)
        setUserSaved(true)
        setTimeout(() => setUserSaved(false), 3000)
      } else {
        showToast(data.error || 'فشل في إضافة المستخدم', 'err')
      }
    } catch { showToast('فشل في إضافة المستخدم', 'err') }
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeSettings)
      })
      showToast('تم حفظ إعدادات النظام بنجاح', 'ok')
      setTimeout(() => window.location.reload(), 1500) // Reload to apply sidebar changes
    } catch {
      showToast('فشل حفظ الإعدادات', 'err')
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleNuclearWipe() {
    if (!accountPassword) {
      showToast('يرجى إدخال كلمة المرور للتأكيد', 'err')
      return
    }

    setIsWiping(true)
    try {
      const res = await fetch('/api/settings/factory-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: accountPassword })
      })
      const data = await res.json()
      if (data.success) {
        showToast(data.message, 'ok')
        setTimeout(() => window.location.reload(), 2000)
      } else {
        showToast(data.message || 'فشل المسح', 'err')
      }
    } catch {
      showToast('حدث خطأ أثناء المسح', 'err')
    } finally {
      setIsWiping(false)
    }
  }

  /* ── Styles ── */
  const card: React.CSSProperties = {
    background: 'rgba(6, 182, 212, 0.03)', borderRadius: 20, padding: '2rem',
    border: '1px solid rgba(6, 182, 212, 0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '0.8rem 1rem', border: '1px solid rgba(6, 182, 212, 0.15)',
    borderRadius: 12, fontSize: '0.92rem', fontFamily: 'inherit', color: '#0F172A',
    outline: 'none', background: 'rgba(6, 182, 212, 0.05)', boxSizing: 'border-box'
  }
  const lbl: React.CSSProperties = {
    fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.5rem',
  }

  if (accessDenied) {
    return (
      <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#475569', textAlign: 'center' }}>
        <Shield size={48} color="#EF4444" style={{ opacity: 0.6 }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EF4444' }}>وصول مرفوض</h2>
        <p style={{ fontSize: '0.9rem', maxWidth: 340, lineHeight: 1.7 }}>ليس لديك صلاحية الوصول إلى هذه الصفحة. هذه الصفحة مخصصة للمدراء والمشرفين فقط.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', color: '#1E293B' }}>
      {toast && <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: toast.type === 'ok' ? '#06B6D4' : '#EF4444', color: '#0F172A', padding: '0.7rem 1.6rem', borderRadius: 50, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>{toast.msg}</div>}
      
      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.22em', color: '#06B6D4', textTransform: 'uppercase', marginBottom: '0.4rem' }}>النظام والخصوصية</p>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0F172A' }}>إعدادات المتجر</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Global Store Settings (White Labeling) */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={22} color="#3B82F6" />
            </div>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: '1.25rem', color: '#0F172A' }}>إعدادات الهوية والتواصل</h2>
              <p style={{ fontSize: '0.82rem', color: '#475569' }}>تخصيص الفواتير وتفاصيل متجرك</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={lbl}>اسم المتجر (يظهر في الفواتير)</label>
              <input value={storeSettings.storeName} onChange={(e) => setStoreSettings({...storeSettings, storeName: e.target.value})} style={inp} placeholder="مثال: فري زون" />
            </div>
            <div>
              <label style={lbl}>رقم الواتساب للمتجر (للتصدير)</label>
              <input value={storeSettings.whatsappNumber} onChange={(e) => setStoreSettings({...storeSettings, whatsappNumber: e.target.value})} style={inp} placeholder="201xxxxxxxxx" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>شعار المتجر Logo (يظهر في الفواتير)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#ECFEFF', padding: '1rem', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                {storeSettings.storeLogoUrl ? (
                  <div style={{ position: 'relative', width: 60, height: 60, borderRadius: 10, overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={storeSettings.storeLogoUrl} alt="Logo preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ width: 60, height: 60, borderRadius: 10, background: '#ECFEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06B6D4' }}>
                    <Upload size={24} />
                  </div>
                )}
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <label style={{ cursor: 'pointer', background: '#06B6D4', color: '#0F172A', padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {uploadingLogo ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
                      {uploadingLogo ? 'جاري الرفع...' : storeSettings.storeLogoUrl ? 'تغيير الشعار' : 'رفع شعار جديد'}
                      <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} style={{ display: 'none' }} />
                    </label>
                    {storeSettings.storeLogoUrl && (
                      <button onClick={() => setStoreSettings(prev => ({...prev, storeLogoUrl: ''}))} style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none', padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        إزالة الشعار
                      </button>
                    )}
                  </div>
                  <p style={{ margin: 0, marginTop: '0.5rem', fontSize: '0.75rem', color: '#475569' }}>يدعم JPG, PNG. يتم الرفع مباشرة لخوادم ImgBB واستخراج الرابط تلقائياً.</p>
                </div>
              </div>
            </div>
            {currentUser?.role === 'SuperAdmin' && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>نوع النشاط (Magic Toggle)</label>
                <select value={storeSettings.businessType} onChange={(e) => setStoreSettings({...storeSettings, businessType: e.target.value})} style={inp}>
                  <option value="B2B_WHALE">الاستيراد والجملة (B2B WHALE)</option>
                  <option value="B2C_RETAIL">تجزئة ومحلات (B2C RETAIL)</option>
                </select>
              </div>
            )}

            {/* Smart Routing Section */}
            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(6,182,212,0.1)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <Shield size={18} color="#06B6D4" />
                <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0F172A' }}>توجيه الرسائل (Smart Routing)</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={lbl}>واتساب المبيعات (Sales)</label>
                  <input value={storeSettings.salesWhatsapp} onChange={(e) => setStoreSettings({...storeSettings, salesWhatsapp: e.target.value})} style={inp} placeholder="201xxxxxxxxx" />
                  <p style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: '#475569' }}>لحجز الأجهزة، شراء الأجهزة المستعملة، والاستفسارات العامة.</p>
                </div>
                <div>
                  <label style={lbl}>واتساب الصيانة (Maintenance)</label>
                  <input value={storeSettings.maintenanceWhatsapp} onChange={(e) => setStoreSettings({...storeSettings, maintenanceWhatsapp: e.target.value})} style={inp} placeholder="201xxxxxxxxx" />
                  <p style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: '#475569' }}>لطلبات فحص وتسعير صيانة الأجهزة أونلاين.</p>
                </div>
              </div>
              <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#06B6D4', fontWeight: 600, background: '#ECFEFF', padding: '0.6rem 1rem', borderRadius: 8 }}>
                💡 ملحوظة: إذا تركت هذه الحقول فارغة، سيتم تحويل كافة الطلبات تلقائياً إلى الرقم الأساسي للمتجر.
              </p>
            </div>
          </div>
          <button onClick={handleSaveSettings} disabled={savingSettings} style={{ background: '#3B82F6', color: '#0F172A', border: 'none', borderRadius: 12, padding: '0.8rem 2rem', fontWeight: 800, cursor: savingSettings ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
             {savingSettings ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'حفظ الإعدادات'}
          </button>
        </div>

        {/* Currency Management Card */}
        <div id="currency-section" style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#ECFEFF', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Coins size={22} color="#06B6D4" />
            </div>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: '1.25rem', color: '#0F172A' }}>إدارة العملات وصرف العملة</h2>
              <p style={{ fontSize: '0.82rem', color: '#475569' }}>تحديث أسعار صرف السوق لتسعير الجملة التلقائي</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            {currencies.map(cur => (
              <div key={cur._id} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: '#F8FAFC', padding: '1rem', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 900, fontSize: '1.1rem', background: '#ECFEFF', color: '#06B6D4', padding: '0.4rem 0.8rem', borderRadius: 8 }}>{cur.code}</span>
                  <span style={{ color: '#475569', fontWeight: 600 }}>{cur.name}</span>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input type="number" 
                    value={cur.exchangeRate} 
                    onChange={e => handleUpdateCurrency(cur._id, e.target.value)} 
                    style={{...inp, direction: 'ltr', fontWeight: 900}} 
                    placeholder="Rate vs EGP" 
                    step="0.01" 
                  />
                </div>
                <button onClick={() => handleDeleteCurrency(cur._id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.5rem' }}>
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(6,182,212,0.1)', pt: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', paddingTop: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>كود العملة (مثل SAR)</label>
              <input value={newCurrency.code} onChange={e => setNewCurrency({...newCurrency, code: e.target.value})} style={inp} placeholder="SAR" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>اسم العملة (مثل الريال السعودي)</label>
              <input value={newCurrency.name} onChange={e => setNewCurrency({...newCurrency, name: e.target.value})} style={inp} placeholder="الريال السعودي" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>سعر الصرف (للجنيه)</label>
              <input type="number" value={newCurrency.exchangeRate} onChange={e => setNewCurrency({...newCurrency, exchangeRate: e.target.value})} style={inp} placeholder="13.15" />
            </div>
            <button onClick={handleAddCurrency} disabled={savingCurrencies} style={{ background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 12, padding: '0.88rem 1.5rem', fontWeight: 800, cursor: 'pointer', height: 'fit-content' }}>
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Change Password Card */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#ECFEFF', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={22} color="#06B6D4" />
            </div>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: '1.25rem', color: '#0F172A' }}>تأمين الحساب</h2>
              <p style={{ fontSize: '0.82rem', color: '#475569' }}>تغيير كلمة المرور الخاصة بالإدارة</p>
            </div>
          </div>

          <AnimatePresence>
            {pwSaved && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid #22C55E', borderRadius: 12, padding: '0.8rem 1rem', marginBottom: '1.5rem', color: '#22C55E', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Check size={18} /> تم تحديث كلمة المرور بنجاح
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handlePwSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>كلمة المرور الحالية</label>
              <div style={{ position: 'relative' }}>
                <input required type={showOld ? 'text' : 'password'} value={pwForm.old} onChange={e => setPwForm({...pwForm, old: e.target.value})} style={{...inp, paddingLeft: '3rem'}} placeholder="••••••••" />
                <button type="button" onClick={() => setShowOld(!showOld)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', display: 'flex' }}>
                  {showOld ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            {[{ label: 'كلمة المرور الجديدة', key: 'new1' }, { label: 'تأكيد كلمة المرور', key: 'new2' }].map((f) => (
              <div key={f.key}>
                <label style={lbl}>{f.label}</label>
                <div style={{ position: 'relative' }}>
                  <input required type={showNew ? 'text' : 'password'} value={pwForm[f.key as 'new1'|'new2']} onChange={e => setPwForm({...pwForm, [f.key]: e.target.value})} style={{...inp, paddingLeft: '3rem'}} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#475569', display: 'flex' }}>
                    {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" style={{ background: '#06B6D4', color: '#0F172A', border: 'none', borderRadius: 14, padding: '0.9rem 2.5rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(6,182,212,0.3)' }}>تحديث كلمة المرور</button>
            </div>
          </form>
        </div>

        {/* User Management Card */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={22} color="#A855F7" />
              </div>
              <div>
                <h2 style={{ fontWeight: 900, fontSize: '1.25rem', color: '#0F172A' }}>إدارة الصلاحيات</h2>
                <p style={{ fontSize: '0.82rem', color: '#475569' }}>{users.length} مستخدمين نشطين</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#A855F7', color: '#0F172A', border: 'none', borderRadius: 12, padding: '0.75rem 1.4rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 8px 24px rgba(168,85,247,0.3)' }}
            >
              <Plus size={18} /> إضافة مستخدم جديد
            </button>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                onSubmit={handleAddUser} style={{ background: '#FFFFFF', borderRadius: 16, padding: '1.5rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', border: '1px solid rgba(168,85,247,0.2)', overflow: 'hidden' }}>
                {[{ label: 'الاسم الكامل', key: 'name' }, { label: 'البريد الإلكتروني', key: 'email', type: 'email' }, { label: 'اسم المستخدم', key: 'username' }, { label: 'كلمة المرور', key: 'password', type: 'password' }].map((f) => (
                  <div key={f.key}>
                    <label style={lbl}>{f.label}</label>
                    <input required type={f.type || 'text'} value={addForm[f.key as keyof typeof addForm]} onChange={e => setAddForm({...addForm, [f.key]: e.target.value})} style={inp} />
                  </div>
                ))}
                <div>
                  <label style={lbl}>الصلاحية</label>
                  <select value={addForm.role} onChange={e => setAddForm({...addForm, role: e.target.value as any})} style={inp}>
                    <option value="Admin">Admin</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketer">Marketer</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Technician">Technician</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
                  <button type="submit" style={{ flex: 1, background: '#A855F7', color: '#0F172A', border: 'none', borderRadius: 12, padding: '0.85rem', fontWeight: 800, cursor: 'pointer' }}>حفظ</button>
                  <button type="button" onClick={() => setShowAddForm(false)} style={{ flex: 1, background: '#F8FAFC', color: '#0F172A', border: 'none', borderRadius: 12, padding: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>إلغاء</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {users.map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderRadius: 16, background: '#F8FAFC', border: '1px solid #E2E8F0', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: ['SuperAdmin','Admin'].includes(u.role) ? 'rgba(6,182,212,0.1)' : 'rgba(168,85,247,0.1)', border: `1px solid ${['SuperAdmin','Admin'].includes(u.role)?'#06B6D4': '#A855F7'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: ['SuperAdmin','Admin'].includes(u.role)?'#06B6D4': '#A855F7' }}>{u.name.charAt(0)}</div>
                  <div>
                    <p style={{ fontWeight: 800, color: '#0F172A' }}>{u.name}</p>
                    <p style={{ fontSize: '0.78rem', color: '#475569' }}>@{u.username}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.3rem 0.8rem', borderRadius: 50, background: u.role.trim()==='مدير' ? 'rgba(6,182,212,0.1)' : 'rgba(168,85,247,0.1)', color: u.role.trim()==='مدير'?'#06B6D4': '#A855F7' }}>{u.role.trim()}</span>
                  {u.username !== 'admin_freezone' && (
                    <button onClick={async() => {if(confirm('حذف المستخدم؟')){await fetch(`/api/users?id=${u.id}`,{method:'DELETE'});setUsers(users.filter(x=>x.id!==u.id))}}} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.4)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='#EF4444'} onMouseLeave={e => e.currentTarget.style.color='rgba(239,68,68,0.4)'}><Trash2 size={18} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Nuclear Wipe Card */}
        <div style={{ ...card, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={22} color="#EF4444" />
            </div>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: '1.25rem', color: '#EF4444' }}>منطقة الخطر (Danger Zone)</h2>
              <p style={{ fontSize: '0.82rem', color: '#EF4444', opacity: 0.8 }}>هذا الإجراء سيقوم بتصفير بيانات المتجر (حذف العمليات والمخزون) للبدء من جديد</p>
            </div>
          </div>
          
          <button 
            onClick={() => { setShowResetModal(true); setAccountPassword(''); }} 
            style={{ width: '100%', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '1rem', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            تصفير بيانات المتجر (Demo Reset)
          </button>
        </div>

      </div>

      <AnimatePresence>
        {showResetModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(8,12,20,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1rem' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} style={{ background: '#F8FAFC', borderRadius: 24, border: '1px solid rgba(239,68,68,0.3)', width: '100%', maxWidth: 450, padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Trash2 size={32} color="#EF4444" />
                </div>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', textAlign: 'center', marginBottom: '0.5rem' }}>تصفير بيانات المتجر</h2>
              <p style={{ color: '#475569', textAlign: 'center', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                سيتم مسح كافة الفواتير، المخزون، العمليات المالية، والمحافظ الرقمية.<br/><strong>لن يتم مسح:</strong> الحسابات (المستخدمين) أو إعدادات المتجر العامة.
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                 <label style={{ ...lbl, color: '#EF4444' }}>أدخل كلمة مرور حسابك للتأكيد</label>
                 <input 
                   type="password"
                   value={accountPassword} 
                   onChange={e => setAccountPassword(e.target.value)} 
                   style={{ ...inp, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.2em' }} 
                   placeholder="••••••••" 
                 />
                 <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#475569' }}>
                   🔐 كلمة المرور مطلوبة للتحقق من هويتك قبل تنفيذ التصفير.
                 </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setShowResetModal(false)}
                  disabled={isWiping}
                  style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid #E2E8F0', color: '#475569', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  إلغاء التصفير
                </button>
                <button 
                  onClick={handleNuclearWipe}
                  disabled={isWiping || !accountPassword}
                  style={{ flex: 1, padding: '1rem', background: '#EF4444', border: 'none', color: '#0F172A', borderRadius: 12, fontWeight: 900, cursor: (isWiping || !accountPassword) ? 'not-allowed' : 'pointer', opacity: (isWiping || !accountPassword) ? 0.5 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  {isWiping ? <Loader2 className="animate-spin" /> : 'تأكيد التصفير'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from {transform:rotate(0deg)} to {transform:rotate(360deg)} } .animate-spin { animation: spin 1s linear infinite }`}</style>
    </div>
  )
}
