'use client'

import React, { useRef, useEffect, useState } from 'react'
import { X, Scan, Zap, CameraOff } from 'lucide-react'

interface ImeiScannerProps {
  onScanSuccess: (serial: string) => void
  onClose: () => void
}

export function ImeiScanner({ onScanSuccess, onClose }: ImeiScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasCamera, setHasCamera] = useState(true)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    let currentStream: MediaStream | null = null

    async function enableCamera() {
      try {
        const constraints = { video: { facingMode: 'environment' } }
        currentStream = await navigator.mediaDevices.getUserMedia(constraints)
        setStream(currentStream)
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream
        }
      } catch (err) {
        console.warn('Camera access denied or unavailable', err)
        setHasCamera(false)
      }
    }

    enableCamera()

    return () => {
      // Cleanup stream on close
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // The Magic Function Mock trigger
  const mockScan = () => {
    // We mock an IMEI that starts with 356 for iPhone 11 (as per instruction logic)
    // or just a random typical iPhone serial.
    const mockImeis = [
      '356123456789012', // Will map to iPhone 11
      '359999999999999',
      '354444444444444' 
    ]
    const randomImei = mockImeis[Math.floor(Math.random() * mockImeis.length)]
    onScanSuccess(randomImei)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)'
    }}>
      <div style={{
        position: 'relative', width: '100%', maxWidth: 480, background: '#0a0a0a',
        borderRadius: 24, padding: '1.5rem', boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        border: '1px solid rgba(14,165,233,0.3)', overflow: 'hidden'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Scan size={24} color="#0ea5e9" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
              الرادار الذكي (Free Zone Radar)
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 50, padding: '0.4rem', color: '#0F172A', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Viewfinder Container */}
        <div style={{ position: 'relative', width: '100%', height: 320, borderRadius: 18, background: '#111', overflow: 'hidden', border: '2px solid rgba(14,165,233,0.15)' }}>
          {hasCamera ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569', gap: '0.5rem' }}>
              <CameraOff size={32} />
              <span style={{ fontSize: '0.85rem' }}>الكاميرا غير متوفرة</span>
            </div>
          )}

          {/* Scanning Reticle over the viewfinder */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {/* Corners */}
            <div style={{ position: 'absolute', top: 20, left: 20, width: 40, height: 40, borderTop: '4px solid #0ea5e9', borderLeft: '4px solid #0ea5e9', borderRadius: '10px 0 0 0' }} />
            <div style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderTop: '4px solid #0ea5e9', borderRight: '4px solid #0ea5e9', borderRadius: '0 10px 0 0' }} />
            <div style={{ position: 'absolute', bottom: 20, left: 20, width: 40, height: 40, borderBottom: '4px solid #0ea5e9', borderLeft: '4px solid #0ea5e9', borderRadius: '0 0 0 10px' }} />
            <div style={{ position: 'absolute', bottom: 20, right: 20, width: 40, height: 40, borderBottom: '4px solid #0ea5e9', borderRight: '4px solid #0ea5e9', borderRadius: '0 0 10px 0' }} />
            
            {/* Laser line animation */}
            <div style={{
              position: 'absolute', left: 20, right: 20, height: 2, background: '#0ea5e9',
              boxShadow: '0 0 15px #0ea5e9, 0 0 30px #0ea5e9',
              animation: 'scan-laser 2.5s infinite linear'
            }} />
          </div>

          {/* Overlay gradient */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(14,165,233,0.1), transparent 20%, transparent 80%, rgba(14,165,233,0.1))', pointerEvents: 'none' }} />
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ color: '#475569', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
            قم بتوجيه الكاميرا نحو الـ Barcode أو الـ IMEI للتعرف التلقائي
          </p>
          
          <button
            onClick={mockScan}
            style={{
              padding: '1rem', background: '#0ea5e9', color: '#0F172A', borderRadius: 14,
              border: 'none', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: '0 8px 24px rgba(14,165,233,0.3)', fontFamily: 'inherit'
            }}
          >
            <Zap size={18} fill="#ffffff" />
            محاكاة فحص IMEI (Simulate Scan)
          </button>
        </div>

      </div>

      <style>{`
        @keyframes scan-laser {
          0% { top: 20px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: calc(100% - 22px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
