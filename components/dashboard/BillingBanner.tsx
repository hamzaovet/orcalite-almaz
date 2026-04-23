'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'

interface BillingStatus {
  status: 'NORMAL' | 'WARNING' | 'GRACE' | 'SUSPENDED'
  daysRemaining: number
}

export default function BillingBanner() {
  const [billing, setBilling] = useState<BillingStatus | null>(null)

  useEffect(() => {
    // Fetch billing status for the current instance
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.storeId) {
          fetch(`/api/billing/status?storeId=${data.storeId}`)
            .then(res => res.json())
            .then(bData => {
              if (bData.status) setBilling(bData)
            })
        }
      })
      .catch(() => {})
  }, [])

  if (!billing || billing.status === 'NORMAL') return null

  const isWarning = billing.status === 'WARNING'
  const isGrace = billing.status === 'GRACE'

  return (
    <div
      style={{
        width: '100%',
        padding: '0.65rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        fontWeight: 700,
        fontSize: '0.88rem',
        background: isWarning ? '#F59E0B' : '#EA580C',
        color: '#0F172A',
        zIndex: 50,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        direction: 'rtl',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      {isWarning ? <AlertTriangle size={18} /> : <AlertCircle size={18} />}
      
      <p style={{ margin: 0 }}>
        {isWarning ? (
          `تنبيه: اقترب موعد تجديد اشتراك منصة أوركا (متبقي ${billing.daysRemaining} أيام). يرجى مراجعة الالتزامات المالية لضمان استمرار الخدمة.`
        ) : (
          `عفواً، انتهى الاشتراك. أنت الآن في فترة السماح. يرجى السداد فوراً لتجنب إيقاف النظام (موعد الإيقاف النهائي خلال 24 ساعة).`
        )}
      </p>

      {/* Action link or contact logic can be added here */}
    </div>
  )
}
