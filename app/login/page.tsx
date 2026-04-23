'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, User, LogIn, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'إسم المستخدم أو كلمة المرور غير صحيحة')
      }

      // Success, perform hard redirect to dashboard to ensure cookies are sent and middleware applies
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c', direction: 'rtl', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        src="/assets/videos/orca-trailer.mp4"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0
        }}
      />
      
      {/* Dark Overlay for Readability */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(5, 8, 15, 0.8)',
        zIndex: 1,
        backdropFilter: 'blur(4px)'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        style={{ width: '100%', maxWidth: 420, padding: '2.5rem', background: 'rgba(10, 10, 15, 0.85)', borderRadius: 24, boxShadow: '0 24px 60px rgba(0,0,0,0.6)', zIndex: 2, border: '1px solid rgba(6,182,212,0.15)', backdropFilter: 'blur(16px)' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/assets/images/orca-logo.png" 
            alt="ORCA ERP" 
            style={{ width: '100%', maxWidth: '200px', margin: '0 auto 1rem', objectFit: 'contain' }} 
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              ((e.target as HTMLImageElement).nextSibling as HTMLElement).style.display = 'block';
            }}
          />
          <div style={{ display: 'none', marginBottom: '1rem' }}>
             <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#06B6D4', letterSpacing: '0.05em' }}>ORCA <span style={{ fontWeight: 300, color: '#94A3B8' }}>ERP</span></h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>الوجهة الأولى لحيتان الموبايلات</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#dc2626', fontSize: '0.88rem', fontWeight: 700, textAlign: 'center' }}>
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '0.4rem' }}>اسم المستخدم</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', background: '#111', color: '#ededed', boxSizing: 'border-box' }}
                placeholder="admin_orca"
              />
              <User size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '0.4rem' }}>كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', background: '#111', color: '#ededed', boxSizing: 'border-box' }}
                placeholder="••••••••"
                dir="ltr"
              />
              <Lock size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: '0.5rem', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 12, padding: '0.9rem', fontWeight: 800, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 8px 20px rgba(14,165,233,0.25)', transition: 'transform 0.2s', opacity: loading ? 0.8 : 1 }}
          >
            {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><LogIn size={20} /> دخول للوحة التحكم</>}
          </button>
        </form>
      </motion.div>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
