'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function ContractPrintContent() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const rawData = searchParams.get('data')
    if (rawData) {
      try {
        // Safe Base64 decoding for Unicode/Arabic
        const jsonStr = decodeURIComponent(Array.from(atob(rawData)).map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
        setData(JSON.parse(jsonStr))
      } catch (err) {
        console.error('Failed to parse contract data', err)
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (data) {
      // Small delay to ensure styles and fonts are loaded before printing
      const timer = setTimeout(() => {
        window.print()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [data])

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen font-sans">
        <div className="text-center p-8 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500">جاري تحميل بيانات العقد...</p>
        </div>
      </div>
    )
  }

  const fmt = (num: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(num)
    return `${formatted} ج.م`
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 print:bg-white print:text-black">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
          .contract-container { padding: 15mm !important; border: none !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }

        body {
          font-family: 'Amiri', serif;
          direction: rtl;
        }

        .contract-container {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 20mm;
          min-height: 297mm;
          box-shadow: 0 0 40px rgba(0,0,0,0.05);
          position: relative;
          color: #1f2937;
        }

        .header-line { border-bottom: 3px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: start; }
        .contract-title { text-align: center; color: #1e3a8a; font-size: 28pt; font-weight: bold; margin: 30pt 0; border-bottom: 3pt double #1e3a8a; padding-bottom: 15pt; }
        .section-header { background: #f3f4f6; padding: 10pt 15pt; font-weight: bold; font-size: 16pt; margin: 25pt 0 12pt; border-right: 8pt solid #1e3a8a; color: #1e3a8a; }
        .party-box { border: 1.5pt solid #e5e7eb; padding: 18pt; border-radius: 12pt; min-height: 120pt; }
        .specs-table { width: 100%; border-collapse: collapse; margin-bottom: 40pt; font-size: 14pt; }
        .specs-table td { padding: 12pt; border: 1pt solid #e5e7eb; }
        .specs-label { background: #f9fafb; font-weight: bold; width: 45%; color: #374151; }
        .clause-item { margin-bottom: 12pt; text-align: justify; line-height: 1.8; font-size: 13pt; }
        .signature-section { margin-top: 80pt; display: grid; grid-template-columns: 1fr 1fr; gap: 100pt; text-align: center; }
        .sig-line { border-top: 2.5pt solid #1e3a8a; padding-top: 12pt; font-weight: bold; color: #1e3a8a; font-size: 16pt; }
      `}} />

      <div className="contract-container">
        {/* Header */}
        <div className="header-line">
          <div style={{ textAlign: 'right', flexGrow: 1 }}>
            <h1 style={{ margin: 0, color: '#1e3a8a', fontSize: '28pt', fontWeight: 900, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>NEXARA - FULL MARK WORK</h1>
            <p style={{ margin: '8pt 0', fontWeight: 'bold', fontSize: '15pt' }}>حمزة عباس حمزة - إدارة منصة ORCA ERP</p>
          </div>
          <div style={{ textAlign: 'left', fontSize: '13pt', color: '#4b5563' }}>
            <p style={{ margin: 0 }}>مرجع العقد: <span style={{ fontWeight: 'bold' }}>{data.ref}</span></p>
            <p style={{ margin: '8pt 0' }}>تاريخ التعاقد: <span style={{ fontWeight: 'bold' }}>{data.contractDate}</span></p>
          </div>
        </div>

        <div className="contract-title">عقد ترخيص استخدام برمجيات وتقديم خدمات سحابية</div>

        {/* Parties */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30pt', marginBottom: '30pt' }}>
          <div className="party-box">
            <div style={{ color: '#1e3a8a', fontWeight: 'bold', fontSize: '14pt', borderBottom: '1pt solid #eee', paddingBottom: '6pt', marginBottom: '10pt' }}>الطرف الأول (المرخص)</div>
            <p style={{ margin: '5pt 0', fontWeight: 'bold', fontSize: '15pt' }}>شركة نكسارا - فل مارك وورك</p>
            <p style={{ margin: 0 }}>المدير المسؤول: حمزة عباس حمزة</p>
            <p style={{ margin: 0 }}>قطاع البرمجيات - منصة أوركا (ORCA ERP)</p>
          </div>
          <div className="party-box">
            <div style={{ color: '#1e3a8a', fontWeight: 'bold', fontSize: '14pt', borderBottom: '1pt solid #eee', paddingBottom: '6pt', marginBottom: '10pt' }}>الطرف الثاني (المرخص له)</div>
            <p style={{ margin: '5pt 0', fontWeight: 'bold', fontSize: '15pt' }}>{data.clientName}</p>
            <p style={{ margin: 0 }}>اسم المتجر/العلامة: {data.storeName}</p>
            <p style={{ margin: 0 }}>السجل التجاري/الهوية: {data.legalId}</p>
          </div>
        </div>

        {/* Technical Specs */}
        <div className="section-header">المواصفات الفنية وباقة الاشتراك المعتمدة</div>
        <table className="specs-table">
          <tbody>
            <tr><td className="specs-label">نوع النظام المختار</td><td>{data.label} ({data.mode})</td></tr>
            <tr><td className="specs-label">نطاق التغطية (عدد الفروع)</td><td>{data.branches} فرع رئيسي/فرعي</td></tr>
            <tr><td className="specs-label">عدد نقاط البيع (POS Screens)</td><td>{data.screens} شاشة بيع مستقلة</td></tr>
            <tr><td className="specs-label">إدارة المشتريات والمخازن (Procurement)</td><td>{data.hasProcurement ? 'مفعل ومشمول في الباقة' : 'غير مفعل'}</td></tr>
            <tr><td className="specs-label">خدمة البث وربط الواتساب (WhatsApp)</td><td>{data.hasWhatsApp ? 'مفعل ومشمول في الباقة' : 'غير مفعل'}</td></tr>
            <tr><td className="specs-label">دورة السداد المالية</td><td>{data.paymentMode === 'monthly' ? 'اشتراك شهري دوري' : 'اشتراك سنوي (مطبق خصم الدفع المقدم 15%)'}</td></tr>
            <tr><td className="specs-label">رسوم التأسيس والإعداد (تُدفع مرة واحدة)</td><td><strong style={{ color: '#000' }}>{fmt(data.setupFee)}</strong></td></tr>
            <tr><td className="specs-label">قيمة الاشتراك الدوري المستحق</td><td><strong style={{ color: '#000' }}>{data.paymentMode === 'monthly' ? fmt(data.monthlyMRR) + ' شهرياً' : fmt(data.annualMRR) + ' سنوياً'}</strong></td></tr>
            <tr style={{ background: '#eff6ff' }}>
              <td className="specs-label" style={{ fontSize: '16pt' }}>إجمالي القيمة المطلوب سدادها (الدفعة الأولى)</td>
              <td><strong style={{ fontSize: '20pt', color: '#1e3a8a' }}>{fmt(data.totalInvestment)}</strong></td>
            </tr>
            <tr><td className="specs-label">تاريخ بداية سريان التعاقد</td><td>{data.contractDate}</td></tr>
            <tr><td className="specs-label">موعد تجديد الترخيص القادم</td><td>{data.renewalDate}</td></tr>
          </tbody>
        </table>

        {/* Clauses */}
        <div className="section-header">البنود القانونية والالتزامات العامة</div>
        <div className="clauses">
          <div className="clause-item"><strong>1. الضمان وكفاءة النظام:</strong> تضمن شركة نكسارا أن يعمل نظام ORCA بكفاءة تامة وفقاً للمتطلبات التقنية المتفق عليها، مع الالتزام بتوفير تحديثات دورية لضمان استقرار الخدمة طوال فترة التعاقد.</div>
          <div className="clause-item"><strong>2. الدعم الفني وخدمات ما بعد البيع:</strong> يلتزم الطرف الأول بتوفير الدعم الفني اللازم عبر القنوات الرسمية خلال ساعات العمل، مع الالتزام بالاستجابة للأعطال التقنية الحرجة التي تعيق سير العمل خلال 24 ساعة عمل.</div>
          <div className="clause-item"><strong>3. التحديثات والترقيات:</strong> يحق للطرف الثاني الحصول على كافة التحديثات الأمنية والوظيفية للنسخة المتعاقد عليها مجاناً. الترقيات لإصدارات كبرى أو إضافة موديولات جديدة تخضع لاتفاق مالي منفصل.</div>
          <div className="clause-item"><strong>4. سرية وخصوصية البيانات:</strong> يقر الطرف الأول بأن جميع البيانات والعمليات المسجلة على النظام هي ملكية حصرية وخاصة للطرف الثاني، ويلتزم المرخص بعدم مشاركتها أو استخدامها بأي شكل يضر بمصلحة العميل.</div>
          <div className="clause-item"><strong>5. شروط السداد والالتزامات المالية:</strong> يلتزم المرخص له بسداد رسوم التأسيس والتشغيل فور توقيع العقد، والالتزام بمواعيد تجديد الاشتراكات الدورية لضمان استمرار الخدمة دون انقطاع.</div>
          <div className="clause-item"><strong>6. فسخ التعاقد والتصفية:</strong> يحق لأي من الطرفين طلب إنهاء التعاقد بموجب إخطار رسمي قبل 30 يوماً. وفي حال الإنهاء، يتم تسليم الطرف الثاني نسخة احتياطية من بياناته بتنسيق برمجي معتاد.</div>
          <div className="clause-item"><strong>7. القانون الواجب التطبيق والمنازعات:</strong> يخضع هذا التعاقد لقوانين جمهورية مصر العربية، وأي نزاع قد ينشأ حول تفسير أو تنفيذ بنود العقد يتم الفصل فيه ودياً، وإلا يتم اللجوء للمحاكم المختصة بالقاهر.</div>
        </div>

        {/* Signatures */}
        <div className="signature-section">
          <div>
            <div className="sig-line">الطرف الأول (المرخص)</div>
            <p style={{ marginTop: '15pt', fontWeight: 'bold', fontSize: '18pt' }}>حمزة عباس حمزة</p>
            <p style={{ fontSize: '12pt', color: '#4b5563' }}>نكسارا - فل مارك وورك</p>
          </div>
          <div>
            <div className="sig-line">الطرف الثاني (المرخص له)</div>
            <p style={{ marginTop: '15pt', fontWeight: 'bold', fontSize: '18pt' }}>{data.clientName}</p>
            <p style={{ fontSize: '12pt', color: '#4b5563' }}>ممثلاً عن متجر: {data.storeName}</p>
          </div>
        </div>

        {/* Footer info */}
        <div style={{ marginTop: '40pt', textAlign: 'center', fontSize: '10pt', color: '#9ca3af', borderTop: '1px solid #eee', paddingTop: '10pt' }}>
          تم إصدار هذا العقد آلياً بواسطة محرك ORCA Godfather ونكسارا - جميع الحقوق محفوظة 2026
        </div>
      </div>
    </div>
  )
}

export default function ContractPrintPage() {
  return (
    <Suspense fallback={
       <div className="flex items-center justify-center min-h-screen">
         <p>جاري التحميل...</p>
       </div>
    }>
      <ContractPrintContent />
    </Suspense>
  )
}
