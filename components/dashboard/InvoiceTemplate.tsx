import React from 'react'

export interface InvoiceItem {
  productName: string
  serialNumber?: string
  storage?: string
  color?: string
  batteryHealth?: string
  condition?: string
  qty: number
  unitPrice: number
  actualUnitPrice: number
}

export interface InvoiceData {
  invoiceNumber: string
  date: string
  time: string
  customer: string
  phone?: string
  paymentMethod: string
  items: InvoiceItem[]
  totalListPrice: number
  totalSalePrice: number
  discount: number
  profit: number
  branchName?: string
}

const PAYMENT_LABELS: Record<string, string> = {
  Cash:           'كاش (نقدي) | Cash',
  Visa:           'فيزا | Visa',
  Valu:           'ValU تقسيط | Installments',
  InstaPay:       'إنستاباي | InstaPay',
  'Vodafone Cash':'فودافون كاش | Vodafone Cash',
}

function fmt(n: number) {
  return n.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function InvoiceTemplate({ data, storeName, storeLogoUrl }: { data: InvoiceData; storeName?: string; storeLogoUrl?: string }) {
  return (
    <div
      id="orca-invoice"
      dir="rtl"
      className="invoice-container"
      style={{
        width: '210mm',
        minHeight: '297mm',
        background: '#ffffff',
        fontFamily: '"IBM Plex Sans Arabic", "Segoe UI", sans-serif',
        color: '#0a0a0a',
        padding: '24px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* ── PRINT CSS ISOLATION ──────────────────────────────────── */}
      <style>{`
        @media print {
          /* Hide everything except the invoice */
          body > * { visibility: hidden !important; }
          #orca-invoice {
            visibility: visible !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: auto !important;
            background: #ffffff !important;
            z-index: 99999 !important;
            padding: 12mm !important;
            box-sizing: border-box !important;
          }
          #orca-invoice * { visibility: visible !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      {/* ── CINEMATIC WATERMARK ─────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(-30deg)',
        opacity: 0.07,
        width: '80%',
        zIndex: 0,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {storeLogoUrl ? (
          <img src={storeLogoUrl} style={{ width: '100%', maxWidth: 500 }} alt="" />
        ) : (
          <div style={{ fontSize: '10rem', fontWeight: 900, color: '#0a0a0a' }}>{storeName || 'ORCA ERP'}</div>
        )}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── TOP ACCENT BAR ─────────────────────────────────────── */}
        <div style={{ height: 6, background: 'linear-gradient(90deg, #0ea5e9 0%, #22c55e 100%)', marginBottom: 20 }} />

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 30
        }}>
          {/* Brand + Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {storeLogoUrl && (
              <img
                src={storeLogoUrl}
                alt={storeName || 'Store Logo'}
                style={{ width: 60, height: 60, objectFit: 'contain' }}
              />
            )}
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0a0a0a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {storeName || 'ORCA ERP'}
              </div>
            </div>
          </div>

          {/* Invoice Meta */}
          <div style={{ textAlign: 'left', direction: 'ltr' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', letterSpacing: '0.12em', marginBottom: 4 }}>
              TAX INVOICE | فاتورة ضريبية
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0a0a0a' }}>
              #{data.invoiceNumber}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0ea5e9', marginTop: 4 }}>
              فرع: {data.branchName || 'المركز الرئيسي'}
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              {data.date} — {data.time}
            </div>
          </div>
        </div>

        {/* ── CUSTOMER INFO ──────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
          background: '#f8fafc',
          padding: '24px',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          marginBottom: 30
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.1em' }}>
              BILL TO | فاتورة إلى
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0a0a0a' }}>{data.customer}</div>
            {data.phone && <div style={{ fontSize: 12, color: '#475569', direction: 'ltr', marginTop: 4 }}>{data.phone}</div>}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.1em' }}>
              PAYMENT | الدفع
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0a0a0a' }}>
              {PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod}
            </div>
            <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, marginTop: 4 }}>PAID | تم الدفع</div>
          </div>
        </div>

        {/* ── ITEMS TABLE ──────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
          <thead>
            <tr style={{ background: '#0a0a0a' }}>
              <th style={{ padding: '12px 16px', textAlign: 'right', color: '#0F172A', fontSize: 10, fontWeight: 800 }}>المنتج والتفاصيل | DESCRIPTION</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', color: '#0F172A', fontSize: 10, fontWeight: 800 }}>الكمية | QTY</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', color: '#0F172A', fontSize: 10, fontWeight: 800 }}>السعر | PRICE</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#0F172A', fontSize: 10, fontWeight: 800 }}>الإجمالي | TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#0a0a0a' }}>{item.productName}</div>
                  {/* Phase 82: Explicit spec display */}
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {item.color && (
                      <div style={{ fontSize: 11, color: '#475569' }}>
                        <span style={{ fontWeight: 700, color: '#7c3aed' }}>اللون: </span>{item.color}
                      </div>
                    )}
                    {item.storage && (
                      <div style={{ fontSize: 11, color: '#475569' }}>
                        <span style={{ fontWeight: 700, color: '#1d4ed8' }}>المساحة: </span>{item.storage}
                      </div>
                    )}
                    {item.batteryHealth && (
                      <div style={{ fontSize: 11, color: '#475569' }}>
                        <span style={{ fontWeight: 700, color: '#c2410c' }}>البطارية: </span>{item.batteryHealth}
                      </div>
                    )}
                    {item.condition && (
                      <div style={{ fontSize: 11, color: '#475569' }}>
                        <span style={{ fontWeight: 700 }}>الحالة: </span>{item.condition === 'Used' ? 'مستعمل' : 'جديد'}
                      </div>
                    )}
                  </div>
                  {item.serialNumber && (
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0ea5e9', direction: 'ltr', marginTop: 6, textAlign: 'right' }}>
                      IMEI / SN: {item.serialNumber}
                    </div>
                  )}
                </td>
                <td style={{ padding: '16px', textAlign: 'center', fontWeight: 800 }}>{item.qty}</td>
                <td style={{ padding: '16px', textAlign: 'center', fontWeight: 800, direction: 'ltr' }}>{fmt(item.actualUnitPrice)}</td>
                <td style={{ padding: '16px', textAlign: 'left', fontWeight: 900, fontSize: 15, direction: 'ltr' }}>{fmt(item.actualUnitPrice * item.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── TOTALS ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 60 }}>
          <div style={{ minWidth: 250 }}>
            {data.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 12, color: '#475569' }}>خصم | Discount</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>-{fmt(data.discount)} ج.م</span>
              </div>
            )}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px', marginTop: 12,
              background: '#0a0a0a', color: '#0F172A', borderRadius: 12,
              border: '2px solid #0ea5e9'
            }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>الإجمالي | TOTAL</span>
              <span style={{ fontSize: 22, fontWeight: 950, color: '#0ea5e9', direction: 'ltr' }}>{fmt(data.totalSalePrice)} EGP</span>
            </div>
          </div>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <div style={{ borderTop: '2px solid #0a0a0a', paddingTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 4 }}>THANK YOU FOR YOUR BUSINESS | شكراً لثقتكم</div>
              <div style={{ fontSize: 10, color: '#475569' }}>Keep this invoice for warranty purposes.</div>
            </div>
            <div style={{ textAlign: 'left', fontSize: 10, color: '#475569' }}>
              {storeName || 'ORCA ERP Store'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
