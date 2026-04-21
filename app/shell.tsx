'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, X, PhoneCall } from 'lucide-react'

/**
 * ClientShell — conditionally mounts Navbar/Footer.
 * Dashboard routes get a clean, chrome-free canvas for their own layout.
 */
export default function ClientShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isDashboard = pathname.startsWith('/dashboard')
  const [showDemoModal, setShowDemoModal] = useState(false)

  useEffect(() => {
    // Expose global trigger for Sidebar and Page Guards
    ;(window as any).triggerDemoModal = () => setShowDemoModal(true)

    // Global Fetch Interceptor to catch DEMO mode API blocks
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)
      
      // We clone to not consume the stream before the actual caller
      const isApi = typeof args[0] === 'string' && args[0].startsWith('/api/') 
                  || (args[0] instanceof Request && args[0].url.includes('/api/'))
      
      if (isApi && response.status === 403) {
        try {
          const clone = response.clone()
          const data = await clone.json()
          if (data && data.isDemoInterception) {
            setShowDemoModal(true)
          }
        } catch (e) {
          // ignore parsing errors
        }
      }
      return response
    }
    return () => {
      window.fetch = originalFetch
      delete (window as any).triggerDemoModal
    }
  }, [])

  // Modals & Overlays
  const renderModals = () => (
    <AnimatePresence>
      {showDemoModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,8,15,0.85)', backdropFilter: 'blur(8px)' }}>
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }}
            style={{ width: '100%', maxWidth: 450, background: '#0B1120', borderRadius: 28, padding: '2.5rem', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', textAlign: 'center', position: 'relative' }}
          >
            <button onClick={() => setShowDemoModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={24} /></button>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid rgba(239,68,68,0.3)' }}>
              <ShieldAlert size={40} color="#EF4444" />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', marginBottom: '1rem', letterSpacing: '0.02em' }}>عفواً، حساب تجريبي!</h2>
            <p style={{ color: '#CBD5E1', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
              أنت تستخدم النسخة التجريبية (DEMO) من <strong style={{ color: '#06B6D4' }}>ORCA ERP</strong>. خصائص الحفظ والحذف والتعديل مقفلة. لتفعيل نسختك الخاصة والكاملة، يرجى التواصل مع إدارة المبيعات.
            </p>
            <a href="https://wa.me/201551190990" target="_blank" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', width: '100%', background: 'linear-gradient(90deg, #10B981, #059669)', color: '#fff', padding: '1rem', borderRadius: 16, textDecoration: 'none', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 8px 20px rgba(16,185,129,0.3)' }}>
              <PhoneCall size={20} /> اتصل بالمبيعات
            </a>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  if (isDashboard) {
    // Dashboard gets the full viewport with no chrome
    return <>
      {children}
      {renderModals()}
    </>
  }

  // Public store pages get Navbar + Footer
  return (
    <>
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
      {renderModals()}
    </>
  )
}
