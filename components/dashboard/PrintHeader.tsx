'use client'

import { useEffect, useState } from 'react'

interface PrintHeaderProps {
  title: string
  subtitle?: string
}

export function PrintHeader({ title, subtitle }: PrintHeaderProps) {
  const [storeName, setStoreName] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        setStoreName(d.storeName || d.companyName || 'ORCA ERP')
      })
      .catch(() => setStoreName('ORCA ERP'))
  }, [])

  const today = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <>
      {/* Only visible when printing */}
      <style>{`
        .print-header { display: none; }
        @media print {
          .print-header { display: block !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="print-header" style={{
        borderBottom: '3px solid #000',
        paddingBottom: '1rem',
        marginBottom: '1.5rem',
        fontFamily: 'Tahoma, Arial, sans-serif',
        direction: 'rtl',
        color: '#000'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0 }}>{storeName}</h1>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.3rem 0 0', color: '#333' }}>{title}</h2>
            {subtitle && <p style={{ fontSize: '0.9rem', color: '#555', margin: '0.2rem 0 0' }}>{subtitle}</p>}
          </div>
          <div style={{ textAlign: 'left', fontSize: '0.85rem', color: '#555' }}>
            <p style={{ margin: 0 }}>تاريخ التقرير:</p>
            <p style={{ margin: '0.2rem 0 0', fontWeight: 700, color: '#000' }}>{today}</p>
          </div>
        </div>
      </div>
    </>
  )
}
