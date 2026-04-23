'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PrintHeader } from '@/components/dashboard/PrintHeader'
import { Loader2 } from 'lucide-react'

function ContractContent() {
  const searchParams = useSearchParams()
  const purchaseId = searchParams.get('purchaseId')
  const [purchase, setPurchase] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(res => res.json()),
      purchaseId ? fetch(`/api/purchases/${purchaseId}`).then(res => res.json()) : Promise.resolve({ success: false })
    ]).then(([settsData, purchData]) => {
      if (settsData && !settsData.error) setSettings(settsData)
      if (purchData.success) setPurchase(purchData.purchase)
    }).finally(() => setLoading(false))
  }, [purchaseId])

  useEffect(() => {
    if (purchase && settings) {
      const timer = setTimeout(() => {
        window.print()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [purchase, settings])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-cyan-600" size={48} />
      <span className="mr-3 font-bold text-gray-600">جاري معالجة العقد القانوني...</span>
    </div>
  )

  if (!purchase) return <div className="p-20 text-center">خطأ: لم يتم العثور على بيانات الفاتورة</div>

  return (
    <div className="min-h-screen bg-white text-gray-900 font-serif rtl" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-content { padding: 15mm !important; }
        }

        body { font-family: 'Amiri', serif; }
        .contract-border { border: 2pt solid #1e3a8a; padding: 2pt; margin: 10mm; min-height: 277mm; }
        .inner-border { border: 1pt solid #1e3a8a; padding: 15mm; min-height: 270mm; position: relative; }
        .stamp-area { position: absolute; bottom: 40pt; left: 40pt; width: 120pt; height: 120pt; border: 1pt dashed #ccc; display: flex; alignItems: center; justifyContent: center; color: #ccc; font-size: 10pt; border-radius: 50%; opacity: 0.5; }
      `}} />

      <div className="contract-border">
        <div className="inner-border">
          
          <PrintHeader title="عقد مبايعة جهاز محمول" subtitle="عقد قانوني ملزم لنقل الملكية" />

          <div className="text-center my-8">
            <h1 className="text-3xl font-bold text-blue-900 border-b-2 border-blue-900 pb-4 inline-block">
              إقرار بيع وتنازل (مبايعة)
            </h1>
          </div>

          <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-xl leading-relaxed text-lg">
            أقر أنا السيد/ <strong className="text-blue-900">{purchase.walkInName || purchase.supplierName}</strong> <br />
            بأنني قد بعت وتنازلت عن ملكية الأجهزة الموضحة أدناه إلى / <strong>{settings?.storeName || 'المحل'}</strong> <br />
            وأن هذه الأجهزة هي ملكيتي الخاصة وتحت حيازتي القانونية، وأقر بمسئوليتي الكاملة (مدنياً وجنائياً) عن أي إدعاء بغير ذلك أو في حال ظهور أي عيب قانوني في مصدر هذه الأجهزة.
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-blue-800 mb-4 border-r-4 border-blue-800 pr-3">بيانات البائع:</h2>
            <div className="grid grid-cols-2 gap-4 text-lg">
              <div className="bg-gray-50 p-3 rounded"><strong>الاسم:</strong> {purchase.walkInName || purchase.supplierName}</div>
              <div className="bg-gray-50 p-3 rounded"><strong>الرقم القومي:</strong> {purchase.nationalId || '—'}</div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold text-blue-800 mb-4 border-r-4 border-blue-800 pr-3">تفاصيل الأجهزة المتنازل عنها:</h2>
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-blue-700 text-slate-900">
                  <th className="border p-3">اسم المنتج والمواصفات</th>
                  <th className="border p-3 text-center">الكمية</th>
                  <th className="border p-3">الأرقام التسلسلية / IMEI</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="p-4">
                      <div className="font-bold text-lg">{item.productName}</div>
                      {/* Spec Pills */}
                      {(item.productId?.color || item.productId?.storage || item.productId?.batteryHealth) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.productId?.color && (
                            <span className="text-xs bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-full font-semibold">🎨 {item.productId.color}</span>
                          )}
                          {item.productId?.storage && (
                            <span className="text-xs bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded-full font-semibold">💾 {item.productId.storage}</span>
                          )}
                          {item.productId?.batteryHealth && (
                            <span className="text-xs bg-orange-100 text-orange-800 border border-orange-300 px-2 py-0.5 rounded-full font-semibold">🔋 {item.productId.batteryHealth}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center font-bold">{item.qty}</td>
                    <td className="p-4 font-mono text-sm leading-relaxed">
                      {item.imeis && item.imeis.length > 0 ? (
                        item.imeis.map((imei: string, i: number) => (
                          <div key={i} className="border-b border-dashed border-gray-200 py-1 last:border-0">{imei}</div>
                        ))
                      ) : (
                        <span className="text-gray-600 italic">بدون سيريال مسجل</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-12 leading-relaxed text-gray-700 italic border-t pt-6">
            توقيع هذا العقد يُعد إقراراً نهائياً باستلام الثمن المتفق عليه وهو 
            <strong className="mx-2 text-black text-xl">({purchase.totalAmount.toLocaleString('ar-EG')} ج.م)</strong>
             وإبراءً لذمة المشتري من أي مطالبات مالية أو قانونية لاحقة بخصوص هذه العملية.
          </div>

          <div className="grid grid-cols-2 gap-20 text-center mt-20">
            <div>
              <div className="border-t-2 border-blue-900 pt-3 font-bold text-xl">توقيع البـائع (العميل)</div>
              <div className="mt-4 text-gray-600 italic">البصمة / الختم</div>
            </div>
            <div>
              <div className="border-t-2 border-blue-900 pt-3 font-bold text-xl">توقيع المستلم (المحل)</div>
              <div className="mt-4 text-gray-600 italic">ختم المؤسسة</div>
            </div>
          </div>

          <div className="stamp-area">ختم المعرض الرسمي</div>

          <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-gray-600">
            تم إصدار هذا العقد آلياً بواسطة ORCA ERP - {new Date(purchase.createdAt).toLocaleString('ar-EG')}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PurchaseContractPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center">جاري تحميل المحرك السحابي...</div>}>
      <ContractContent />
    </Suspense>
  )
}
