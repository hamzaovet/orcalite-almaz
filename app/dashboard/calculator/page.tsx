'use client'

import { useState, useEffect } from 'react'
import { Activity, Monitor, Building2, ShieldCheck, Sparkles, Rocket, Tag, TrendingDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const PRICING = {
  B2B_WHALE: {
    defaultSetupFee: 150000,
    base: 8000,
    perBranch: 4000,
    perUser: 2500,
    label: 'ORCA (B2B Whales)',
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
  },
  B2C_RETAIL: {
    defaultSetupFee: 25000,
    base: 1500,
    perBranch: 800,
    perUser: 500,
    label: 'ORCA Lite (B2C Retail)',
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #A855F7, #EC4899)',
  },
}

export default function SaaS_CalculatorPage() {
  const [mode, setMode] = useState<'B2B_WHALE' | 'B2C_RETAIL'>('B2B_WHALE')
  const [branches, setBranches] = useState(1)
  const [users, setUsers]       = useState(1)
  const [setupFee, setSetupFee] = useState(PRICING['B2B_WHALE'].defaultSetupFee)

  // Discount engine
  const [discountType, setDiscountType] = useState<'EGP' | 'PERCENT'>('PERCENT')
  const [discountValue, setDiscountValue] = useState(0)

  // When mode changes, reset setup fee to the new default
  useEffect(() => {
    setSetupFee(PRICING[mode].defaultSetupFee)
    setDiscountValue(0)
  }, [mode])

  const p = PRICING[mode]

  // MRR calculation
  const monthlyCost = p.base + (branches > 1 ? (branches - 1) * p.perBranch : 0) + (users > 1 ? (users - 1) * p.perUser : 0)
  const yearlyCost  = monthlyCost * 12

  // Discount math
  const discountAmount = discountType === 'EGP'
    ? Math.min(Number(discountValue) || 0, setupFee)
    : Math.round((Number(discountValue) / 100) * setupFee)

  const finalSetupFee = setupFee - discountAmount
  const hasDiscount   = discountAmount > 0

  const inpStyle: React.CSSProperties = {
    width: '100%', padding: '0.9rem 1rem',
    background: '#ECFEFF', border: '1px solid rgba(6,182,212,0.2)',
    borderRadius: 12, color: '#0F172A', outline: 'none',
    fontSize: '1rem', fontWeight: 700, fontFamily: 'inherit',
    boxSizing: 'border-box',
  }
  const lblStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    color: '#475569', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem',
  }
  const cardStyle: React.CSSProperties = {
    background: '#F8FAFC', border: '1px solid rgba(6,182,212,0.18)',
    borderRadius: 24, padding: '2rem',
  }

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', color: '#1E293B' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <Sparkles color="#06B6D4" size={34} /> حاسبة تسعير ORCA 2060
        </h1>
        <p style={{ color: '#475569', fontSize: '1rem' }}>SaaS Pricing & Valuation Engine — الأسعار تعكس قيمة حصنٍ رقمي لملايين في المخزون</p>
      </div>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: '0.4rem', gap: '0.5rem', marginBottom: '2.5rem' }}>
        {(['B2B_WHALE', 'B2C_RETAIL'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '1.1rem', border: 'none', borderRadius: 14,
            fontWeight: 900, fontSize: '1.05rem', cursor: 'pointer', transition: 'all 0.3s',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.6rem',
            background: mode === m ? PRICING[m].gradient : 'transparent',
            color: mode === m ? '#fff' : '#64748B',
            boxShadow: mode === m ? '0 8px 32px rgba(0,0,0,0.3)' : 'none',
          }}>
            {m === 'B2B_WHALE' ? <Activity size={20} /> : <Rocket size={20} />}
            {PRICING[m].label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.25fr)', gap: '2rem', alignItems: 'start' }}>

        {/* ── Left: Inputs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Branches & Users */}
          <div style={cardStyle}>
            <div style={{ marginBottom: '2rem' }}>
              <label style={lblStyle}><Building2 size={17} color={p.color} /> عدد الفروع (Branches)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input type="range" min={1} max={50} value={branches} onChange={e => setBranches(Number(e.target.value))} style={{ flex: 1, accentColor: p.color }} />
                <input type="number" min={1} value={branches} onChange={e => setBranches(Math.max(1, Number(e.target.value)))} style={{ ...inpStyle, width: 80, padding: '0.6rem', textAlign: 'center' }} />
              </div>
            </div>

            <div>
              <label style={lblStyle}><Monitor size={17} color="#A855F7" /> عدد الشاشات / المستخدمين (Screens)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input type="range" min={1} max={100} value={users} onChange={e => setUsers(Number(e.target.value))} style={{ flex: 1, accentColor: '#A855F7' }} />
                <input type="number" min={1} value={users} onChange={e => setUsers(Math.max(1, Number(e.target.value)))} style={{ ...inpStyle, width: 80, padding: '0.6rem', textAlign: 'center' }} />
              </div>
            </div>
          </div>

          {/* Setup Fee + Discount */}
          <div style={cardStyle}>
            <label style={lblStyle}><ShieldCheck size={17} color="#F59E0B" /> رسوم التأسيس (Setup Fee)</label>
            <div style={{ position: 'relative', marginBottom: '1.75rem' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: '#475569', fontSize: '0.85rem' }}>EGP</span>
              <input
                type="number"
                value={setupFee}
                onChange={e => setSetupFee(Math.max(0, Number(e.target.value)))}
                style={{ ...inpStyle, paddingLeft: '3.5rem', fontSize: '1.4rem', fontWeight: 900, color: '#F59E0B' }}
              />
            </div>

            {/* Discount Engine */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1.5rem' }}>
              <label style={{ ...lblStyle, color: '#10B981' }}><TrendingDown size={17} color="#10B981" /> الخصم على التأسيس (Setup Discount)</label>

              {/* Toggle */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '0.3rem', gap: '0.4rem', marginBottom: '1rem' }}>
                {(['PERCENT', 'EGP'] as const).map(t => (
                  <button key={t} onClick={() => { setDiscountType(t); setDiscountValue(0) }} style={{
                    flex: 1, padding: '0.6rem', border: 'none', borderRadius: 10,
                    fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                    background: discountType === t ? '#10B981' : 'transparent',
                    color: discountType === t ? '#fff' : '#64748B',
                  }}>
                    {t === 'PERCENT' ? 'نسبة مئوية (%)' : 'مبلغ ثابت (EGP)'}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: '#10B981' }}>
                  {discountType === 'PERCENT' ? '%' : 'EGP'}
                </span>
                <input
                  type="number"
                  min={0}
                  max={discountType === 'PERCENT' ? 100 : setupFee}
                  value={discountValue || ''}
                  onChange={e => setDiscountValue(Number(e.target.value))}
                  placeholder="0"
                  style={{ ...inpStyle, paddingLeft: '3.5rem', color: '#10B981', fontWeight: 900, fontSize: '1.1rem' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Quotation Card ── */}
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ ...cardStyle, background: 'linear-gradient(180deg, #0B1120 0%, #0f1729 100%)', display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', right: -24, top: -24, opacity: 0.035, pointerEvents: 'none' }}>
            <ShieldCheck size={220} />
          </div>

          <h3 style={{ fontSize: '1rem', color: '#475569', fontWeight: 800, marginBottom: '0.25rem' }}>
            عرض السعر المقترح ← {p.label}
          </h3>

          {/* Setup Fee Block */}
          <div style={{ background: '#F1F5F9', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '1.5rem' }}>
            <span style={{ display: 'block', color: '#475569', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              دفعة التأسيس (مرة واحدة)
            </span>

            <AnimatePresence mode="wait">
              {hasDiscount ? (
                <motion.div key="discounted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Crossed-out original */}
                  <del style={{ color: '#475569', fontSize: '1.1rem', display: 'block', marginBottom: '0.4rem' }}>
                    {setupFee.toLocaleString('ar-EG')} ج.م
                  </del>
                  {/* Final price */}
                  <span style={{ fontSize: '2.6rem', fontWeight: 900, color: '#F59E0B', display: 'block', lineHeight: 1.1 }}>
                    {finalSetupFee.toLocaleString('ar-EG')} <span style={{ fontSize: '1.1rem' }}>ج.م</span>
                  </span>
                  {/* Savings badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem',
                    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                    color: '#10B981', padding: '0.35rem 0.9rem', borderRadius: 50,
                    fontWeight: 900, fontSize: '0.9rem',
                  }}>
                    <Tag size={14} /> وفرت {discountAmount.toLocaleString('ar-EG')} ج.م
                    {discountType === 'PERCENT' && ` (${discountValue}%)`}
                  </span>
                </motion.div>
              ) : (
                <motion.span key="original" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ fontSize: '2.6rem', fontWeight: 900, color: '#F59E0B', display: 'block' }}>
                  {setupFee.toLocaleString('ar-EG')} <span style={{ fontSize: '1.1rem' }}>ج.م</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* MRR Block */}
          <div style={{ background: `rgba(${mode === 'B2B_WHALE' ? '6,182,212' : '168,85,247'},0.08)`, border: `1px solid rgba(${mode === 'B2B_WHALE' ? '6,182,212' : '168,85,247'},0.2)`, borderRadius: 20, padding: '1.5rem' }}>
            <span style={{ display: 'block', color: '#475569', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              الاشتراك الشهري (MRR)
            </span>
            <span style={{ fontSize: '0.78rem', color: '#475569' }}>{branches} فرع • {users} شاش{users > 1 ? 'ات' : 'ة'} • {p.label}</span>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: p.color, marginTop: '0.5rem' }}>
              {monthlyCost.toLocaleString('ar-EG')} <span style={{ fontSize: '1rem' }}>ج.م / شهر</span>
            </div>
          </div>

          {/* ARR / Annual */}
          <div style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 20, padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ display: 'block', color: '#A855F7', fontWeight: 900, fontSize: '1rem' }}>الاشتراك السنوي (وفر 15%)</span>
              <span style={{ fontSize: '0.75rem', color: '#475569' }}>بدلاً من {yearlyCost.toLocaleString('ar-EG')} ج.م</span>
            </div>
            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#A855F7' }}>
              {(yearlyCost * 0.85).toLocaleString('ar-EG')}
            </span>
          </div>

          {/* Total Summary Row */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#475569', fontWeight: 700, fontSize: '0.9rem' }}>
              إجمالي الاستثمار<br />
              <span style={{ fontSize: '0.75rem' }}>(تأسيس + 12 شهر)</span>
            </span>
            <span style={{ fontWeight: 900, fontSize: '1.6rem', color: '#0F172A' }}>
              {(finalSetupFee + yearlyCost).toLocaleString('ar-EG')} <span style={{ fontSize: '0.9rem', color: '#475569' }}>ج.م</span>
            </span>
          </div>
        </motion.div>
      </div>

      <style>{`input[type=range]{height:4px;border-radius:4px;} input::placeholder{color:rgba(148,163,184,0.3);}`}</style>
    </div>
  )
}
