'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Lock, X, Loader2 } from 'lucide-react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => Promise<void>
  title?: string
  description?: string
  isLoading?: boolean
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'تأكيد الحذف',
  description = 'هذا الإجراء لا يمكن التراجع عنه. يرجى إدخال كلمة مرور الإدارة لتأكيد الحذف.',
  isLoading = false
}: DeleteConfirmModalProps) {
  const [password, setPassword] = useState('')

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (!password) return
    await onConfirm(password)
    if (!isLoading) {
      setPassword('')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(8, 12, 20, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: '1rem' }}>
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.95, opacity: 0 }} 
            style={{ background: '#F8FAFC', borderRadius: 24, border: '1px solid rgba(239,68,68,0.3)', width: '100%', maxWidth: 420, overflow: 'hidden' }}
          >
            <div style={{ background: 'rgba(239,68,68,0.1)', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={24} color="#EF4444" />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#EF4444', margin: 0 }}>{title}</h2>
              </div>
              <button onClick={onClose} disabled={isLoading} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                {description}
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>كلمة مرور الإدارة</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', border: '1px solid #E2E8F0',
                      borderRadius: 12, fontSize: '1rem', color: '#0F172A', outline: 'none',
                      background: '#FFFFFF', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '0.2em'
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirm()
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={onClose}
                  disabled={isLoading}
                  style={{ flex: 1, padding: '0.9rem', background: '#F1F5F9', border: 'none', color: '#475569', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  إلغاء
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={isLoading || !password}
                  style={{ flex: 1, padding: '0.9rem', background: '#EF4444', border: 'none', color: '#FFFFFF', borderRadius: 12, fontWeight: 900, cursor: (isLoading || !password) ? 'not-allowed' : 'pointer', opacity: (isLoading || !password) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'تأكيد الحذف'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
