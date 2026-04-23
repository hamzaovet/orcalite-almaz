'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database,
  LayoutDashboard,
  Package,
  TrendingUp,
  BarChart3,
  Settings,
  ChevronLeft,
  LogOut,
  User,
  Tags,
  Users2,
  Smartphone,
  Phone,
  Landmark,
  MapPin,
  Shield,
  Briefcase,
  Layout,
  Coins,
  Zap,
  Scan,
  Megaphone,
  Calculator,
  Wrench,
  ShoppingBag,
  Inbox,
  Lock,
} from 'lucide-react'
import BillingBanner from '@/components/dashboard/BillingBanner'

const navItems = [
  { label: 'مركز البيانات',   href: '/dashboard/data-center',  icon: Database,   blockCashier: true, isAdminOnly: true },
  { label: 'نظرة عامة',    href: '/dashboard',            icon: LayoutDashboard, blockCashier: true },
  { label: 'المبيعات',     href: '/dashboard/sales',      icon: TrendingUp },
  { label: 'مركز الصيانة',  href: '/dashboard/maintenance', icon: Wrench, isRetail: true },
  { label: 'المشتريات',   href: '/dashboard/purchases', icon: ShoppingBag, isRetail: true },
  { label: 'عروض الشراء',  href: '/dashboard/offers', icon: Inbox, isRetail: true },
  { label: 'المستوردات',   href: '/dashboard/procurement', icon: Briefcase, blockRetail: true },
  { label: 'المخزن (الماسح)', href: '/dashboard/inventory',  icon: Scan },
  { label: 'الأسعار والتسويق', href: '/dashboard/price-list', icon: Megaphone, blockRetail: true },
  { label: 'الأقسام',      href: '/dashboard/categories', icon: Tags },
  { label: 'المنتجات',     href: '/dashboard/products',   icon: Package },
  { label: 'الموردون',     href: '/dashboard/suppliers',  icon: Users2 },
  { label: 'الفروع',       href: '/dashboard/branches',   icon: MapPin, blockCashier: true },
  { label: 'الصلاحيات',    href: '/dashboard/employees',  icon: Shield, isAdminOnly: true },
  { label: 'الخزنة',       href: '/dashboard/treasury',   icon: Landmark, blockCashier: true },
  { label: 'الخدمات الرقمية', href: '/dashboard/digital-services', icon: Smartphone },
  { label: 'التقارير',     href: '/dashboard/reports',    icon: BarChart3, blockCashier: true },
  { label: 'معرض المنتجات', href: '/dashboard/showroom',    icon: Smartphone, color: '#06B6D4' },
  { label: 'إدارة المحتوى', href: '/dashboard/content',    icon: Layout,    blockCashier: true },
  { label: 'العملات',      href: '/dashboard/settings#currency-section', icon: Coins, blockCashier: true, blockRetail: true },
  { label: 'الإعدادات',   href: '/dashboard/settings',   icon: Settings, isAdminOnly: true },
  { label: 'حاسبة أوركا (Sales)', href: '/dashboard/godfather-calc', icon: Calculator, isGodfather: true },
]

const RESTRICTED_DEMO_PATHS = [
  '/dashboard/settings',
  '/dashboard/content',
  '/dashboard/price-list',
  '/dashboard/employees'
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{name: string, role: string, username: string} | null>(null)
  const [businessType, setBusinessType] = useState<'B2B_WHALE'|'B2C_RETAIL'>('B2B_WHALE')
  const [isRestricted, setIsRestricted] = useState(false)
  const [billingStatus, setBillingStatus] = useState<'NORMAL'|'WARNING'|'GRACE'|'SUSPENDED'>('NORMAL')

  // Showroom Guard State
  const [showGuardModal, setShowGuardModal] = useState(false)
  const [targetHref, setTargetHref] = useState('')
  const [passInput, setPassInput] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [guardError, setGuardError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
        } else {
          router.replace('/login')
        }
      })
      .catch(() => router.replace('/login'))

    // Fetch settings for businessType
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.businessType) {
          setBusinessType(data.businessType)
        }
      })
      .catch(console.error)

    // Check Billing Status for enforcement
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.storeId) {
          fetch(`/api/billing/status?storeId=${data.storeId}`)
            .then(res => res.json())
            .then(bData => {
              if (bData.status) setBillingStatus(bData.status)
            })
        }
      })
      .catch(() => {})
  }, [])

  // Absolute Page Guard for DEMO users
  useEffect(() => {
    if (user?.role === 'DEMO') {
      const restricted = RESTRICTED_DEMO_PATHS.some(path => pathname.startsWith(path))
      if (restricted) {
        setIsRestricted(true)
        // Delay slightly to ensure window.triggerDemoModal is defined by Shell
        setTimeout(() => {
          if ((window as any).triggerDemoModal) {
            ;(window as any).triggerDemoModal()
          }
        }, 100)
      } else {
        setIsRestricted(false)
      }
    }
  }, [user, pathname])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100dvh',
        background: 'var(--bg-primary)',
        direction: 'rtl',
      }}
    >
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        className="print:hidden"
        style={{
          width: 256,
          background: '#0B1120',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem 1rem',
          gap: '0.35rem',
          borderLeft: '1px solid rgba(6,182,212,0.12)',
          position: 'sticky',
          top: 0,
          height: '100dvh',
          overflowY: 'auto',
        }}
      >
        {/* Sidebar header */}
        <div style={{ marginBottom: '1.75rem', padding: '0 0.5rem' }}>
          {/* Typographic logo */}
          <div
            style={{
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/assets/images/orca-logo.png" 
              alt="ORCA ERP Logo" 
              style={{ width: '100%', maxWidth: '160px', objectFit: 'contain' }}
              onError={(e) => {
                // Fallback to text if missing
                (e.target as HTMLImageElement).style.display = 'none';
                ((e.target as HTMLImageElement).nextSibling as HTMLElement).style.display = 'block';
              }} 
            />
            <div style={{ display: 'none', direction: 'ltr', fontSize: '1.25rem', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 900, color: '#06B6D4' }}>ORCA</span>
              <span style={{ fontWeight: 300, color: '#94A3B8', letterSpacing: '0.2em', marginLeft: '2px' }}>ERP</span>
            </div>
          </div>

          {/* User Profile Info */}
          {user && (
            <div style={{ 
              marginTop: '1.25rem', padding: '0.75rem', 
              background: 'rgba(6,182,212,0.06)', 
              border: '1px solid rgba(6,182,212,0.15)', 
              borderRadius: 12, display: 'flex', alignItems: 'center', gap: '0.65rem' 
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={16} color="#06B6D4" />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-tajawal)' }}>{user.name}</p>
                <p style={{ color: '#06B6D4', fontSize: '0.7rem', fontWeight: 600 }}>
                  {user.role === 'SuperAdmin' ? 'مالك (SuperAdmin)' : user.role === 'Admin' ? 'مدير نظام (Admin)' : user.role === 'Manager' ? 'مدير فرع (Manager)' : user.role === 'Cashier' ? 'كاشير (Cashier)' : user.role}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Nav links */}
        {navItems.map((item) => {
          // Security Hide for Cashiers
          const isCashier = user?.role === 'Cashier' || user?.role === 'كاشير'
          if (isCashier && item.blockCashier) return null

          // Restricted for Godfather only
          const isMaestro = user?.username === 'maestro' || user?.role === 'SuperAdmin'
          if (item.isGodfather && !isMaestro) return null

          // Phase 34: Admin Only Restriction
          const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'Admin'
          if ((item as any).isAdminOnly && !isAdmin) return null

          // Business Type Filters
          if (businessType === 'B2B_WHALE' && item.isRetail) return null
          if (businessType === 'B2C_RETAIL' && item.blockRetail) return null

          const Icon = item.icon
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                const isDemo = user?.role === 'DEMO'
                const isRestrictedPath = RESTRICTED_DEMO_PATHS.some(p => item.href.startsWith(p))
                
                // Showroom Guard Interception
                if (pathname === '/dashboard/showroom' && item.href !== '/dashboard/showroom') {
                  e.preventDefault()
                  setTargetHref(item.href)
                  setShowGuardModal(true)
                  return
                }

                if (isDemo && isRestrictedPath) {
                  e.preventDefault()
                  if ((window as any).triggerDemoModal) {
                    ;(window as any).triggerDemoModal()
                  }
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.72rem 0.9rem',
                borderRadius: 12,
                textDecoration: 'none',
                fontWeight: active ? 800 : 500,
                fontSize: '0.92rem',
                color: active ? '#06B6D4' : 'rgba(255,255,255,0.6)',
                background: active ? 'rgba(6,182,212,0.1)' : 'transparent',
                border: active
                  ? '1px solid rgba(6,182,212,0.22)'
                  : '1px solid transparent',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.color = 'rgba(255,255,255,0.9)'
                  el.style.background = 'rgba(6,182,212,0.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.color = 'rgba(255,255,255,0.6)'
                  el.style.background = 'transparent'
                }
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
              {item.label}
            </Link>
          )
        })}

        {/* Logout Button */}
        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              color: '#ef4444',
              fontSize: '0.84rem',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '0.5rem 0.85rem',
              transition: 'color 0.2s',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              width: '100%'
            }}
          >
            <LogOut size={16} />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────── */}
      <main className="print:p-0" style={{ flex: 1, padding: '2.5rem', overflowY: 'auto', position: 'relative' }}>
        <BillingBanner />
        
        {/* Full-Screen Suspension Block */}
        {billingStatus === 'SUSPENDED' && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(11,17,32,0.96)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)', padding: '2rem', textAlign: 'center'
          }}>
            <div style={{
              background: '#F8FAFC', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '24px', padding: '3rem', maxWidth: '500px',
              boxShadow: '0 25px 50px -12px rgba(239,68,68,0.25)'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🚫</div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', marginBottom: '1rem' }}>الحساب معلق</h2>
              <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '1rem' }}>
                عفواً، تم تعليق حساب هذه المؤسسة لمراجعة الالتزامات المالية أو انتهاء صلاحية الترخيص.
              </p>
              <p style={{ color: '#06B6D4', fontWeight: 700, marginTop: '1.5rem', fontSize: '1.1rem' }}>
                يرجى التواصل مع إدارة نكسارا (نظام أوركا) فوراً لتفعيل الخدمة.
              </p>
              <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
                <button 
                   onClick={() => window.location.href = 'tel:201551190990'}
                   style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', background: '#06B6D4', border: 'none', color: '#0F172A', fontWeight: 800, cursor: 'pointer' }}
                >
                  اتصل بالمبيعات
                </button>
                <button 
                   onClick={handleLogout}
                   style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        )}

        {isRestricted ? (
          <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 600, fontSize: '1.2rem' }}>
             يتم فحص الصلاحيات...
          </div>
        ) : children}

        {/* ── Showroom Auth Guard Modal ── */}
        <AnimatePresence>
          {showGuardModal && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(8, 12, 20, 0.4)', backdropFilter: 'blur(16px)',
              padding: '1.5rem', direction: 'rtl'
            }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 32, padding: '3rem',
                  maxWidth: 450, width: '100%',
                  textAlign: 'center', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{
                  width: 64, height: 64, borderRadius: 20,
                  background: 'rgba(6, 182, 212, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.5rem', border: '1px solid rgba(6, 182, 212, 0.2)'
                }}>
                  <Lock size={32} color="#06B6D4" />
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', marginBottom: '1rem', fontFamily: 'var(--font-tajawal)' }}>نطقة محمية</h2>
                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '2rem' }}>
                  عذراً، هذه المنطقة تتطلب صلاحيات الإدارة. يرجى إدخال كلمة مرور مدير النظام للمتابعة.
                </p>

                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                  <input
                    type="password"
                    autoFocus
                    placeholder="كلمة المرور الإدارية"
                    value={passInput}
                    onChange={(e) => setPassInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGuardVerify()}
                    style={{
                      width: '100%', padding: '1.1rem 1.5rem', borderRadius: 16,
                      background: '#F1F5F9', border: guardError ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                      color: '#0F172A', fontSize: '1.1rem', outline: 'none', transition: 'all 0.2s', textAlign: 'center'
                    }}
                  />
                  {guardError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                      style={{ color: '#EF4444', fontSize: '0.8rem', fontWeight: 700, marginTop: '0.75rem' }}
                    >
                      {guardError}
                    </motion.p>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <button
                    disabled={isVerifying}
                    onClick={handleGuardVerify}
                    style={{
                      padding: '1.1rem', borderRadius: 16, border: 'none',
                      background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                      color: '#0F172A', fontWeight: 900, fontSize: '1rem', cursor: 'pointer',
                      boxShadow: '0 10px 25px -5px rgba(6, 182, 212, 0.4)'
                    }}
                  >
                    {isVerifying ? 'جاري التحقق...' : 'دخول'}
                  </button>
                  <button
                    onClick={() => {
                      setShowGuardModal(false)
                      setPassInput('')
                      setGuardError('')
                    }}
                    style={{
                      padding: '1.1rem', borderRadius: 16, border: '1px solid #E2E8F0',
                      background: '#F1F5F9', color: '#475569',
                      fontWeight: 700, fontSize: '1rem', cursor: 'pointer'
                    }}
                  >
                    انسحاب
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )

  async function handleGuardVerify() {
    if (!passInput) return
    setIsVerifying(true)
    setGuardError('')
    try {
      const res = await fetch('/api/auth/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passInput })
      })
      const data = await res.json()
      if (data.success) {
        setShowGuardModal(false)
        setPassInput('')
        router.push(targetHref)
      } else {
        setGuardError(data.message || 'نعتذر، الرقم السري غير صحيح')
      }
    } catch (err) {
      setGuardError('حدث خطأ أثناء التحقق، يرجى المحاولة لاحقاً')
    } finally {
      setIsVerifying(false)
    }
  }
}

