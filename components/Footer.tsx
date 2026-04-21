'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { MapPin, Phone, MessageCircle } from 'lucide-react'
import { formatWhatsApp } from '@/lib/whatsapp'

export default function Footer() {
  const year = new Date().getFullYear()
  const [landingData, setLandingData] = useState<any>(null)
  const [settings, setSettings]     = useState<any>(null)

  useEffect(() => {
    fetch('/api/landing-page')
      .then((res) => res.json())
      .then((data) => setLandingData(data))
      .catch(console.error)

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(console.error)
  }, [])

  const contact = landingData?.contact || {
    phone: '01129592916',
    whatsapp: '01129592916',
    address: 'السراج مول، مكرم عبيد، مدينة نص‏ر'
  }
  
  // Safe 3-layer fallback for Sales Routing
  const salesNum = settings?.salesWhatsapp || settings?.whatsappNumber || contact.whatsapp || '01129592916'
  const whatsappLink = `https://wa.me/${formatWhatsApp(salesNum)}`

  return (
    <footer
      style={{
        background: '#F9FAFB',
        color: '#0F172A',
        padding: '6rem 2rem 3rem',
        direction: 'rtl',
        borderTop: '1px solid rgba(0,0,0,0.06)'
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Top Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '4rem',
            marginBottom: '4rem',
          }}
        >
          {/* Brand column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div
                style={{
                  direction: 'ltr',
                  fontSize: '1.5rem',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontWeight: 900, color: '#06B6D4' }}>ORCA</span>
                <span style={{ fontWeight: 300, color: '#64748B', letterSpacing: '0.25em', marginLeft: '2px' }}>ERP</span>
              </div>
            </div>
            <p
              style={{
                fontSize: '1rem',
                color: '#475569',
                lineHeight: 1.8,
                maxWidth: 400,
                fontWeight: 500
              }}
            >
              {landingData?.footerDescription || 'أوركا ERP: درعك المحاسبي ومحرك مبيعاتك. المنظومة الأولى المصممة خصيصاً لتجار وموزعي الهواتف الذكية للسيطرة على حركة السوق.'}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 900,
                color: '#0F172A',
                marginBottom: '1.5rem',
                borderBottom: '3px solid #06B6D4',
                paddingBottom: '0.5rem',
                display: 'inline-block',
              }}
            >
              روابط سريعة
            </h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'الرئيسية', href: '/' },
                { label: 'المتجر', href: '#categories' },
                { label: 'اتصل بنا', href: '#contact' },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    style={{
                      color: '#475569',
                      textDecoration: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.color = '#06B6D4')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.color = '#475569')
                    }
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Block */}
          <div id="contact">
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 900,
                color: '#FFFFFF',
                marginBottom: '1.5rem',
                borderBottom: '3px solid #06B6D4',
                paddingBottom: '0.5rem',
                display: 'inline-block',
              }}
            >
              تواصل معنا
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <MapPin size={20} color="#06B6D4" strokeWidth={2.5} />
                <span style={{ color: '#0F172A', fontSize: '1rem', fontWeight: 700 }}>
                  {contact.address}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Phone size={20} color="#06B6D4" strokeWidth={2.5} />
                <span style={{ color: '#0F172A', fontSize: '1rem', fontWeight: 700, direction: 'ltr' }}>
                  هاتف: {contact.phone}
                </span>
              </div>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: 'rgba(6,182,212,0.1)',
                  border: '1px solid rgba(6,182,212,0.35)',
                  color: '#06B6D4',
                  padding: '0.65rem 1.75rem',
                  borderRadius: 16,
                  fontSize: '1rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  transition: 'all 0.3s',
                  marginTop: '0.5rem',
                  width: 'fit-content',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.background = 'rgba(6,182,212,0.25)'
                  el.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.background = 'rgba(6,182,212,0.1)'
                  el.style.transform = 'translateY(0)'
                }}
              >
                <MessageCircle size={18} strokeWidth={2.5} />
                واتساب المبيعات
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.2), transparent)',
            marginBottom: '3rem',
          }}
        />

        {/* Bottom Signatures */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            textAlign: 'center',
          }}
        >
          {/* NEXARA Signature */}
          <a
            href="https://nexara-platform.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#06B6D4',
              fontWeight: 900,
              fontSize: '0.9rem',
              textDecoration: 'none',
              letterSpacing: '0.08em',
              textShadow: '0 0 18px rgba(6,182,212,0.5)',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.textShadow = '0 0 30px rgba(6,182,212,0.8)'
              el.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.textShadow = '0 0 18px rgba(6,182,212,0.5)'
              el.style.color = '#06B6D4'
            }}
          >
            ✦ Infrastructure by NEXARA FMW ✦
          </a>

          {/* Dr. Hamza Signature */}
          <a
            href="https://wa.me/201551190990"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#3B82F6',
              fontWeight: 900,
              fontSize: '0.9rem',
              letterSpacing: '0.08em',
              textShadow: '0 0 18px rgba(59,130,246,0.5)',
              textDecoration: 'none',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.textShadow = '0 0 30px rgba(59,130,246,0.8)'
              el.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.textShadow = '0 0 18px rgba(59,130,246,0.5)'
              el.style.color = '#3B82F6'
            }}
          >
            ✦ Operations Managed by Dr. Hamza ✦
          </a>
        </div>
      </div>
    </footer>
  )
}
