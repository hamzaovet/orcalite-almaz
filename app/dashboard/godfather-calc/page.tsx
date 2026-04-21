'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calculator,
  Plus,
  Minus,
  Crown,
  Building2,
  Monitor,
  PackageSearch,
  MessageSquare,
  FileText,
  Download,
  X,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  User,
  Hash,
  AlertTriangle,
  Briefcase,
  ShieldCheck,
  Zap,
} from 'lucide-react'
// jsPDF removed in favor of Native Print View

// ─── PRICING CONSTANTS ───────────────────────────────────────────────────────
const PRICING = {
  ORCA_B2B: {
    label: 'ORCA (B2B Whales)',
    setupBase: 95000,
    perBranch: 3000,
    perScreen: 1500,
    procurement: 20000,
    whatsapp: 15000,
    mrr_label_branch: 'فرع/شهر',
    mrr_label_screen: 'شاشة/شهر',
  },
  ORCA_LITE: {
    label: 'ORCA Lite (B2C Retail)',
    setupBase: 15000,
    perBranch: 2000,
    perScreen: 750,
    procurement: 0,
    whatsapp: 8000,
    mrr_label_branch: 'فرع/شهر',
    mrr_label_screen: 'شاشة/شهر',
  },
}
const ANNUAL_DISCOUNT_RATE = 0.15 // 15% off annual
const GODFATHER_PASSWORD = '123456'
const MAX_DISCOUNT_PERCENT = 0.10 // 10% of setup fee

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('en-EG')

export default function GodfatherCalcPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // ── Mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'ORCA_B2B' | 'ORCA_LITE'>('ORCA_B2B')
  const pricing = PRICING[mode]

  // ── Calculator inputs ────────────────────────────────────────────────────
  const [branches, setBranches] = useState(1)
  const [screens, setScreens] = useState(1)
  const [hasProcurement, setHasProcurement] = useState(false)
  const [hasWhatsApp, setHasWhatsApp] = useState(false)
  const [paymentMode, setPaymentMode] = useState<'monthly' | 'annual'>('monthly')

  // ── Godfather Discount ───────────────────────────────────────────────────
  const [discountApplied, setDiscountApplied] = useState(0) // EGP value after approval
  const [godfatherUsed, setGodfatherUsed] = useState(false) // disable icon after use
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [discountInput, setDiscountInput] = useState('')
  const [discountMode, setDiscountMode] = useState<'percent' | 'egp'>('egp')
  const [discountError, setDiscountError] = useState('')
  const [discountSuccess, setDiscountSuccess] = useState(false)

  // ── Contract Modal ───────────────────────────────────────────────────────
  const [showContractModal, setShowContractModal] = useState(false)
  const [clientName, setClientName] = useState('')
  const [storeName, setStoreName] = useState('')
  const [legalId, setLegalId] = useState('')
  const [contractDate, setContractDate] = useState(() => new Date().toISOString().split('T')[0])
  const [renewalDate, setRenewalDate] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().split('T')[0]
  })

  // ── Provisioning Modal ──────────────────────────────────────────────────
  const [showProvisionModal, setShowProvisionModal] = useState(false)
  const [provisioningStatus, setProvisioningStatus] = useState<'idle'|'processing'|'success'|'error'>('idle')
  const [provisionError, setProvisionError] = useState('')

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.user || (data.user.role !== 'SuperAdmin' && data.user.username !== 'maestro')) {
          router.replace('/dashboard')
        } else {
          setUser(data.user)
        }
      })
      .catch(() => router.replace('/dashboard'))
      .finally(() => setLoading(false))
  }, [router])

  // ── Computation ──────────────────────────────────────────────────────────
  const setupFee =
    pricing.setupBase +
    branches * pricing.perBranch +
    screens * pricing.perScreen +
    (hasProcurement ? pricing.procurement : 0) +
    (hasWhatsApp ? pricing.whatsapp : 0) -
    discountApplied

  const monthlyMRR = branches * pricing.perBranch + screens * pricing.perScreen

  const annualMRR = Math.round(monthlyMRR * 12 * (1 - ANNUAL_DISCOUNT_RATE))

  const totalInvestment =
    paymentMode === 'monthly'
      ? setupFee + monthlyMRR
      : setupFee + annualMRR

  const maxGodfatherDiscount = Math.floor(
    (pricing.setupBase +
      branches * pricing.perBranch +
      screens * pricing.perScreen +
      (hasProcurement ? pricing.procurement : 0) +
      (hasWhatsApp ? pricing.whatsapp : 0)) * MAX_DISCOUNT_PERCENT
  )

  // ── Godfather password check ─────────────────────────────────────────────
  const handlePasswordSubmit = () => {
    if (passwordInput === GODFATHER_PASSWORD) {
      setPasswordError('')
      setShowPasswordModal(false)
      setPasswordInput('')
      setShowDiscountModal(true)
    } else {
      setPasswordError('كلمة المرور خاطئة. حاول مرة أخرى.')
    }
  }

  // ── Godfather discount apply ─────────────────────────────────────────────
  const handleDiscountApply = () => {
    const raw = parseFloat(discountInput)
    if (isNaN(raw) || raw <= 0) { setDiscountError('أدخل قيمة صحيحة.'); return }

    const egpValue = discountMode === 'percent'
      ? Math.round((raw / 100) * (setupFee + discountApplied))
      : raw

    if (egpValue > maxGodfatherDiscount) {
      setDiscountError(`عذراً يا عراب، الحد الأقصى للخصم هو 10% (${fmt(maxGodfatherDiscount)} EGP)`)
      return
    }

    setDiscountError('')
    setDiscountSuccess(true)
    setTimeout(() => {
      setDiscountApplied(egpValue)
      setGodfatherUsed(true)
      setShowDiscountModal(false)
      setDiscountSuccess(false)
      setDiscountInput('')
    }, 1800)
  }

  // ── PDF Contract Generator ────────────────────────────────────────────────
  // ── Native Print View Handler ───────────────────────────────────────────
  const generateContract = () => {
    if (!clientName || !storeName || !legalId) return

    const contractData = {
      clientName,
      storeName,
      legalId,
      label: pricing.label,
      mode: mode === 'orca' ? 'B2B Whale' : 'ORCA Lite',
      branches,
      screens,
      hasProcurement,
      hasWhatsApp,
      paymentMode,
      setupFee,
      monthlyMRR,
      annualMRR,
      totalInvestment,
      contractDate,
      renewalDate,
      ref: `ORCA-${Date.now()}`
    }

    // Safe Base64 encoding for Unicode/Arabic
    const jsonStr = JSON.stringify(contractData)
    const base64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16))
    }))

    window.open(`/dashboard/contract-print?data=${base64}`, '_blank')
    setShowContractModal(false)
  }

  // ── Provisioning Logic ────────────────────────────────────────────────────
  const handleProvisionStore = async () => {
    if (!clientName || !storeName || !legalId) {
      alert('الرجاء ملء بيانات العقد أولاً لتفعيل النسخة')
      return
    }

    setProvisioningStatus('processing')
    setProvisionError('')

    try {
      // Calculate Renewal Date based on Payment Mode
      const renew = new Date()
      if (paymentMode === 'monthly') {
        renew.setDate(renew.getDate() + 31)
      } else {
        renew.setFullYear(renew.getFullYear() + 1)
      }

      const res = await fetch('/api/superadmin/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName,
          storeId: `store_${Date.now()}`, // Generate unique ID
          clientName,
          renewalDate: renew.toISOString(),
          maxUsers: screens,
          maxBranches: branches,
          subscriptionType: paymentMode === 'monthly' ? 'Monthly' : 'Annual'
        })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'فشلت عملية التفعيل')

      setProvisioningStatus('success')
      setTimeout(() => {
        setShowProvisionModal(false)
        setProvisioningStatus('idle')
        router.push('/dashboard/superadmin/stores') // Redirect to control plane
      }, 2000)

    } catch (err: any) {
      console.error('[Provisioning] Error:', err)
      setProvisioningStatus('error')
      setProvisionError(err.message)
    }
  }

  if (loading) return null

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1060px', margin: '0 auto', color: '#fff', direction: 'rtl', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ position: 'relative' }}>
          {/* 🎩 Godfather Secret Icon */}
          <button
            onClick={() => {
              if (godfatherUsed) return
              setShowPasswordModal(true)
              setPasswordError('')
              setPasswordInput('')
            }}
            title={godfatherUsed ? 'تم تطبيق خصم العراب' : 'وضع العراب السري'}
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-36px',
              background: 'none',
              border: 'none',
              cursor: godfatherUsed ? 'not-allowed' : 'pointer',
              opacity: godfatherUsed ? 0.25 : 1,
              transition: 'all 0.3s',
              padding: '4px',
              fontSize: '20px',
              lineHeight: 1,
              filter: godfatherUsed ? 'grayscale(1)' : 'drop-shadow(0 0 6px rgba(245,158,11,0.8))',
            }}
          >
            🎩
          </button>

          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Crown size={30} color="#06B6D4" />
            حاسبة العروض البيعية (ORCA)
          </h1>
          <p style={{ color: '#94A3B8', marginTop: '0.4rem', fontWeight: 500, fontSize: '0.88rem' }}>
            خاص بالعراب — تسعير حلول أوركا للمؤسسات والأفراد
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', padding: '0.4rem 0.9rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#06B6D4', fontWeight: 800, fontSize: '0.85rem' }}>Maestro Mode Active</span>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          </div>
          {discountApplied > 0 && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.3rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', color: '#F59E0B', fontWeight: 700 }}>
              ✦ خصم العراب مُفعَّل: {fmt(discountApplied)} EGP
            </div>
          )}
        </div>
      </header>

      {/* ── Mode Selector ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem' }}>
        {(['ORCA_B2B', 'ORCA_LITE'] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setBranches(1); setScreens(1); setHasProcurement(false); setHasWhatsApp(false) }}
            style={{
              flex: 1, padding: '0.85rem 1.25rem', borderRadius: '16px', cursor: 'pointer', fontWeight: 700, fontSize: '0.93rem',
              background: mode === m ? '#06B6D4' : 'rgba(11,17,32,0.7)',
              color: mode === m ? '#05080F' : '#94A3B8',
              border: mode === m ? '2px solid #06B6D4' : '2px solid rgba(255,255,255,0.06)',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            {m === 'ORCA_B2B' ? <Building2 size={18} /> : <Briefcase size={18} />}
            {PRICING[m].label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>

        {/* ── Left: Inputs ── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* System Config */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '1.5rem', background: 'rgba(11,17,32,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px' }}
          >
            <h3 style={{ marginBottom: '1.25rem', color: '#94A3B8', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>تكوين النظام الأساسي</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Branches */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ color: '#E2E8F0', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={16} color="#06B6D4" />
                  الفروع <span style={{ color: '#64748B', fontSize: '0.75rem' }}>(+{fmt(pricing.perBranch)} EGP/فرع)</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#05080F', padding: '0.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button onClick={() => setBranches(Math.max(1, branches - 1))} style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={15} /></button>
                  <span style={{ flex: 1, textAlign: 'center', color: '#06B6D4', fontSize: '1.15rem', fontWeight: 800 }}>{branches}</span>
                  <button onClick={() => setBranches(branches + 1)} style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={15} /></button>
                </div>
              </div>
              {/* Screens */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ color: '#E2E8F0', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Monitor size={16} color="#06B6D4" />
                  شاشات الكاشير <span style={{ color: '#64748B', fontSize: '0.75rem' }}>(+{fmt(pricing.perScreen)} EGP/شاشة)</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#05080F', padding: '0.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button onClick={() => setScreens(Math.max(1, screens - 1))} style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={15} /></button>
                  <span style={{ flex: 1, textAlign: 'center', color: '#06B6D4', fontSize: '1.15rem', fontWeight: 800 }}>{screens}</span>
                  <button onClick={() => setScreens(screens + 1)} style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={15} /></button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Add-ons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ padding: '1.5rem', background: 'rgba(11,17,32,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px' }}
          >
            <h3 style={{ marginBottom: '1.25rem', color: '#94A3B8', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>الإضافات والخدمات</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Procurement */}
              {mode === 'ORCA_B2B' && (
                <div
                  onClick={() => setHasProcurement(!hasProcurement)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem',
                    background: hasProcurement ? 'rgba(6,182,212,0.1)' : 'rgba(5,8,15,0.8)',
                    border: hasProcurement ? '1px solid rgba(6,182,212,0.35)' : '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '14px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PackageSearch color="#06B6D4" size={19} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>نظام المشتريات والعملات (Forex)</p>
                      <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>إدارة الاستيراد ببيانات حقيقية</p>
                    </div>
                  </div>
                  <div style={{ color: '#06B6D4', fontWeight: 800, fontSize: '0.9rem' }}>+ {fmt(pricing.procurement)} EGP</div>
                </div>
              )}
              {/* WhatsApp */}
              <div
                onClick={() => setHasWhatsApp(!hasWhatsApp)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem',
                  background: hasWhatsApp ? 'rgba(34,197,94,0.1)' : 'rgba(5,8,15,0.8)',
                  border: hasWhatsApp ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '14px', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare color="#22c55e" size={19} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>محرك بث الواتساب (Mass Broadcast)</p>
                    <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>إرسال قوائم الأسعار للعملاء</p>
                  </div>
                </div>
                <div style={{ color: '#22c55e', fontWeight: 800, fontSize: '0.9rem' }}>+ {fmt(pricing.whatsapp)} EGP</div>
              </div>
            </div>
          </motion.div>

          {/* Payment Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ padding: '1.25rem 1.5rem', background: 'rgba(11,17,32,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div>
              <h3 style={{ color: '#E2E8F0', fontSize: '0.95rem', fontWeight: 700 }}>دورة الدفع</h3>
              <p style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                {paymentMode === 'annual' ? `خصم ${Math.round(ANNUAL_DISCOUNT_RATE * 100)}% على الاشتراك السنوي` : 'دفع شهري عادي'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', background: '#05080F', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => setPaymentMode('monthly')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                  background: paymentMode === 'monthly' ? '#06B6D4' : 'transparent',
                  color: paymentMode === 'monthly' ? '#05080F' : '#64748B',
                  transition: 'all 0.2s'
                }}
              >دفع شهري</button>
              <button
                onClick={() => setPaymentMode('annual')}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                  background: paymentMode === 'annual' ? '#22c55e' : 'transparent',
                  color: paymentMode === 'annual' ? '#05080F' : '#64748B',
                  transition: 'all 0.2s'
                }}
              >دفع سنوي ✦</button>
            </div>
          </motion.div>

        </section>

        {/* ── Right: Summary ── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div style={{
            background: '#05080F', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '22px',
            padding: '1.75rem', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: '8px', background: '#06B6D4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calculator color="#fff" size={20} />
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 900 }}>ملخص عرض الاستثمار</h2>
              </div>

              {/* Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '1.25rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: '#94A3B8' }}>النظام الأساسي:</span>
                  <span style={{ fontWeight: 700 }}>{fmt(pricing.setupBase)} EGP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: '#94A3B8' }}>الفروع ({branches} × {fmt(pricing.perBranch)}):</span>
                  <span style={{ fontWeight: 700 }}>{fmt(branches * pricing.perBranch)} EGP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: '#94A3B8' }}>الشاشات ({screens} × {fmt(pricing.perScreen)}):</span>
                  <span style={{ fontWeight: 700 }}>{fmt(screens * pricing.perScreen)} EGP</span>
                </div>
                {hasProcurement && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#06B6D4' }}>
                    <span>نظام المشتريات:</span>
                    <span style={{ fontWeight: 700 }}>+ {fmt(pricing.procurement)} EGP</span>
                  </div>
                )}
                {hasWhatsApp && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#22c55e' }}>
                    <span>بث الواتساب:</span>
                    <span style={{ fontWeight: 700 }}>+ {fmt(pricing.whatsapp)} EGP</span>
                  </div>
                )}
                {discountApplied > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#F59E0B' }}>
                    <span>✦ خصم العراب:</span>
                    <span style={{ fontWeight: 700 }}>− {fmt(discountApplied)} EGP</span>
                  </div>
                )}

                {/* Separator */}
                <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', margin: '0.25rem 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: '#94A3B8' }}>رسوم التأسيس:</span>
                  <span style={{ fontWeight: 800, color: '#fff' }}>{fmt(setupFee)} EGP</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                  <span style={{ color: '#94A3B8' }}>الاشتراك الشهري (MRR):</span>
                  <span style={{ fontWeight: 700, color: '#06B6D4' }}>{fmt(monthlyMRR)} EGP</span>
                </div>

                {paymentMode === 'annual' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: '#94A3B8' }}>الاشتراك السنوي (ARR):</span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{fmt(annualMRR)} EGP <span style={{ fontSize: '0.7rem' }}>(-{Math.round(ANNUAL_DISCOUNT_RATE * 100)}%)</span></span>
                  </div>
                )}
              </div>

              {/* Total Investment */}
              <div style={{ marginTop: '1.5rem' }}>
                <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.78rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                  إجمالي الاستثمار — {paymentMode === 'monthly' ? 'دفعة أولى شهر واحد' : 'دفعة سنوية كاملة'}
                </p>
                <div style={{ textAlign: 'center', background: 'rgba(6,182,212,0.1)', padding: '1.25rem', borderRadius: '18px', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: 950, color: '#06B6D4' }}>{fmt(totalInvestment)}</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#06B6D4', marginRight: '6px' }}>EGP</span>
                </div>
              </div>

              {/* Badges */}
              <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {['دعم فني 24/7', 'تحديثات سنوية', 'استضافة سحابية'].map(t => (
                  <div key={t} style={{ textAlign: 'center' }}>
                    <ShieldCheck size={15} color="#22c55e" style={{ margin: '0 auto 0.2rem' }} />
                    <p style={{ fontSize: '0.62rem', color: '#94A3B8' }}>{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => setShowContractModal(true)}
              style={{
                width: '100%', padding: '1.1rem', background: 'linear-gradient(135deg, #06B6D4, #0284C7)',
                color: '#fff', borderRadius: '16px', border: 'none', fontWeight: 900, fontSize: '1rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem',
                boxShadow: '0 8px 24px rgba(6,182,212,0.3)', transition: 'transform 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <FileText size={20} />
              إنشاء عقد التعاقد والتراخيص (PDF)
            </button>

            <button
              onClick={() => {
                 if (!clientName || !storeName || !legalId) {
                   setShowContractModal(true); return
                 }
                 setShowProvisionModal(true)
              }}
              style={{
                width: '100%', padding: '1.1rem', background: 'rgba(5,8,15,0.8)',
                color: '#fff', borderRadius: '16px', border: '1px solid rgba(34,197,94,0.3)', 
                fontWeight: 800, fontSize: '0.95rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#22c55e'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)'}
            >
              <Zap size={19} color="#22c55e" />
              تفعيل النسخة للعميل الآن (Provisioning)
            </button>
          </div>
        </section>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Godfather Password
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' }}
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#0B1120', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '24px',
                padding: '2rem', width: '360px', direction: 'rtl'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.8))' }}>🎩</div>
                <h2 style={{ fontWeight: 900, fontSize: '1.25rem' }}>بوابة العراب</h2>
                <p style={{ color: '#64748B', fontSize: '0.82rem', marginTop: '0.35rem' }}>أدخل كلمة مرور الوصول المميز</p>
              </div>

              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={e => { setPasswordInput(e.target.value); setPasswordError('') }}
                  onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder="كلمة المرور..."
                  style={{
                    width: '100%', padding: '0.9rem 1rem', paddingLeft: '3rem',
                    background: '#05080F', border: `1px solid ${passwordError ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '12px', color: '#fff', fontSize: '1rem', outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
                <button onClick={() => setPasswordVisible(!passwordVisible)} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                  {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {passwordError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  <AlertTriangle size={14} /> {passwordError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => setShowPasswordModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8', cursor: 'pointer', fontWeight: 600 }}>إلغاء</button>
                <button onClick={handlePasswordSubmit} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: '#F59E0B', border: 'none', color: '#05080F', cursor: 'pointer', fontWeight: 800 }}>دخول</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Godfather Discount
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showDiscountModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              style={{
                background: '#0B1120', border: '1px solid rgba(245,158,11,0.5)', borderRadius: '28px',
                padding: '2.5rem', width: '420px', direction: 'rtl', boxShadow: '0 30px 80px rgba(245,158,11,0.15)'
              }}
            >
              <AnimatePresence mode="wait">
                {!discountSuccess ? (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎩</div>
                      <h2 style={{ fontWeight: 900, fontSize: '1.4rem', color: '#F59E0B' }}>مرحباً يا عراب</h2>
                      <p style={{ color: '#64748B', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                        الحد الأقصى للخصم: <span style={{ color: '#F59E0B', fontWeight: 700 }}>{fmt(maxGodfatherDiscount)} EGP (10%)</span>
                      </p>
                    </div>

                    {/* Discount mode toggle */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: '#05080F', padding: '4px', borderRadius: '12px' }}>
                      {(['egp', 'percent'] as const).map(dm => (
                        <button key={dm} onClick={() => setDiscountMode(dm)} style={{
                          flex: 1, padding: '0.6rem', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                          background: discountMode === dm ? '#F59E0B' : 'transparent',
                          color: discountMode === dm ? '#05080F' : '#64748B', transition: 'all 0.2s'
                        }}>
                          {dm === 'egp' ? 'قيمة EGP' : 'نسبة %'}
                        </button>
                      ))}
                    </div>

                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                      <input
                        type="number"
                        value={discountInput}
                        onChange={e => { setDiscountInput(e.target.value); setDiscountError('') }}
                        placeholder={discountMode === 'egp' ? 'قيمة الخصم بالجنيه...' : 'نسبة الخصم %...'}
                        style={{
                          width: '100%', padding: '1rem 1rem', background: '#05080F',
                          border: `1px solid ${discountError ? '#ef4444' : 'rgba(245,158,11,0.3)'}`,
                          borderRadius: '14px', color: '#fff', fontSize: '1.1rem', fontWeight: 700,
                          outline: 'none', boxSizing: 'border-box', textAlign: 'center'
                        }}
                        autoFocus
                      />
                    </div>

                    {discountError && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.82rem', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <AlertTriangle size={15} /> {discountError}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={() => { setShowDiscountModal(false); setDiscountError(''); setDiscountInput('') }} style={{ flex: 1, padding: '0.85rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8', cursor: 'pointer', fontWeight: 600 }}>إلغاء</button>
                      <button onClick={handleDiscountApply} style={{ flex: 1, padding: '0.85rem', borderRadius: '14px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', color: '#05080F', cursor: 'pointer', fontWeight: 800 }}>تطبيق الخصم</button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                    <h2 style={{ fontWeight: 900, fontSize: '1.5rem', color: '#22c55e' }}>تمت الموافقة يا عراب</h2>
                    <p style={{ color: '#94A3B8', marginTop: '0.5rem' }}>يتم الآن تطبيق الخصم على الحاسبة...</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Contract Generator
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showContractModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)', padding: '1rem' }}
            onClick={() => setShowContractModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#0B1120', border: '1px solid rgba(6,182,212,0.4)', borderRadius: '28px',
                padding: '2.25rem', width: '520px', maxWidth: '100%', direction: 'rtl',
                boxShadow: '0 40px 100px rgba(6,182,212,0.15)', maxHeight: '90vh', overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText color="#06B6D4" size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontWeight: 900, fontSize: '1.2rem' }}>عقد التعاقد والتراخيص</h2>
                    <p style={{ color: '#64748B', fontSize: '0.78rem', marginTop: '0.2rem' }}>نكسارا - فل مارك وورك</p>
                  </div>
                </div>
                <button onClick={() => setShowContractModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', padding: '0.5rem', cursor: 'pointer', color: '#94A3B8' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Summary row */}
              <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '14px', padding: '1rem', marginBottom: '1.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                {[
                  ['رسوم التأسيس', `${fmt(setupFee)} EGP`],
                  [paymentMode === 'monthly' ? 'MRR' : 'ARR', `${fmt(paymentMode === 'monthly' ? monthlyMRR : annualMRR)} EGP`],
                  ['إجمالي الاستثمار', `${fmt(totalInvestment)} EGP`],
                ].map(([label, val]) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <p style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 600 }}>{label}</p>
                    <p style={{ color: '#06B6D4', fontWeight: 800, fontSize: '0.88rem', marginTop: '0.2rem' }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { label: 'اسم العميل (الطرف الثاني)', value: clientName, setter: setClientName, placeholder: 'الاسم الكامل...', icon: <User size={16} /> },
                  { label: 'اسم المحل / الشركة', value: storeName, setter: setStoreName, placeholder: 'اسم المنشأة...', icon: <Building2 size={16} /> },
                  { label: 'الرقم القانوني / السجل التجاري', value: legalId, setter: setLegalId, placeholder: 'رقم التسجيل...', icon: <Hash size={16} /> },
                ].map(({ label, value, setter, placeholder, icon }) => (
                  <div key={label}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      {icon} {label}
                    </label>
                    <input
                      value={value}
                      onChange={e => setter(e.target.value)}
                      placeholder={placeholder}
                      style={{
                        width: '100%', padding: '0.85rem 1rem', background: '#05080F',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
                        color: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.4)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                ))}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {[
                    { label: 'تاريخ التعاقد', value: contractDate, setter: setContractDate },
                    { label: 'تاريخ تجديد الترخيص', value: renewalDate, setter: setRenewalDate },
                  ].map(({ label, value, setter }) => (
                    <div key={label}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        <Calendar size={14} /> {label}
                      </label>
                      <input
                        type="date"
                        value={value}
                        onChange={e => setter(e.target.value)}
                        style={{
                          width: '100%', padding: '0.85rem 1rem', background: '#05080F',
                          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
                          color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                          colorScheme: 'dark'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {(!clientName || !storeName || !legalId) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.78rem', marginTop: '1rem' }}>
                  <Lock size={13} /> الرجاء ملء جميع الحقول لتفعيل إنشاء العقد
                </div>
              )}

              <button
                onClick={generateContract}
                disabled={!clientName || !storeName || !legalId}
                style={{
                  width: '100%', padding: '1.1rem', marginTop: '1.5rem',
                  background: (!clientName || !storeName || !legalId) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #06B6D4, #0284C7)',
                  color: (!clientName || !storeName || !legalId) ? '#475569' : '#fff',
                  borderRadius: '16px', border: 'none',
                  fontWeight: 900, fontSize: '1rem', cursor: (!clientName || !storeName || !legalId) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem',
                  transition: 'all 0.2s',
                  boxShadow: (!clientName || !storeName || !legalId) ? 'none' : '0 8px 24px rgba(6,182,212,0.3)'
                }}
              >
                <Download size={20} />
                إنشاء العقد القانوني وتحميله (PDF)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Provisioning Confirmation
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showProvisionModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)', padding: '1.5rem' }}
            onClick={() => provisioningStatus !== 'processing' && setShowProvisionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#0B1120', border: '2px solid rgba(34,197,94,0.4)', borderRadius: '32px',
                padding: '2.5rem', width: '450px', maxWidth: '100%', direction: 'rtl', textAlign: 'center'
              }}
            >
              {provisioningStatus === 'idle' && (
                <>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🚀</div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.75rem' }}>تأكيد تفعيل النسخة</h2>
                  <p style={{ color: '#94A3B8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                    أنت على وشك تحويل هذا العرض إلى **نسخة نشطة** للنظام.
                    سيتم تخصيص <span style={{ color: '#22c55e', fontWeight: 700 }}>{screens} شاشات</span> و <span style={{ color: '#22c55e', fontWeight: 700 }}>{branches} فروع</span> لمتجر <span style={{ color: '#06B6D4', fontWeight: 700 }}>{storeName}</span>.
                  </p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setShowProvisionModal(false)} style={{ flex: 1, padding: '0.9rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#64748B', fontWeight: 700, cursor: 'pointer' }}>إلغاء</button>
                    <button onClick={handleProvisionStore} style={{ flex: 1, padding: '0.9rem', borderRadius: '14px', background: '#22c55e', border: 'none', color: '#05080F', fontWeight: 900, cursor: 'pointer' }}>تفعيل الآن</button>
                  </div>
                </>
              )}

              {provisioningStatus === 'processing' && (
                <div style={{ padding: '2rem 0' }}>
                  <div className="animate-spin" style={{ width: '50px', height: '50px', border: '4px solid rgba(6,182,212,0.1)', borderTopColor: '#06B6D4', borderRadius: '50%', margin: '0 auto 1.5rem' }} />
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>جاري ربط الماكينة بالعقد...</h3>
                  <p style={{ color: '#64748B', marginTop: '0.5rem' }}>يرجى الانتظار، يتم إنشاء سجلات التراخيص</p>
                </div>
              )}

              {provisioningStatus === 'success' && (
                <div style={{ padding: '2rem 0' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#22c55e' }}>تم التفعيل بنجاح!</h3>
                  <p style={{ color: '#94A3B8', marginTop: '0.5rem' }}>تم إنشاء سجل العميل وتحديث تراخيص النظام.</p>
                </div>
              )}

              {provisioningStatus === 'error' && (
                <div style={{ padding: '1rem 0' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⚠️</div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ef4444' }}>فشل التفعيل</h3>
                  <p style={{ color: '#94A3B8', marginTop: '0.5rem' }}>{provisionError}</p>
                  <button onClick={() => setProvisioningStatus('idle')} style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer' }}>حاول مرة أخرى</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
