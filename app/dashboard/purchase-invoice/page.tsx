'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PrintHeader } from '@/components/dashboard/PrintHeader'
import { Loader2 } from 'lucide-react'

function InvoiceContent() {
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
      <span className="mr-3 font-bold text-gray-600">جاري تحميل الفاتورة الرسمية...</span>
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
        .invoice-border { border: 2pt solid #06B6D4; padding: 2pt; margin: 10mm; min-height: 277mm; }
        .inner-border { border: 1pt solid #06B6D4; padding: 15mm; min-height: 270mm; position: relative; }
      `}} />

      <div className="invoice-border">
        <div className="inner-border">
          
          <PrintHeader title="فاتورة مشتريات (Wholesale)" subtitle="سجل توريد مخزون رسمي" />

          <div className="flex justify-between items-start my-10 border-b border-cyan-100 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-cyan-900 mb-2">فاتورة مشتريات</h1>
              <p className="text-gray-500">رقم الفاتورة: #{purchase._id.toString().substring(0, 8)}</p>
              <p className="text-gray-500">التاريخ: {new Date(purchase.createdAt).toLocaleDateString('ar-EG')}</p>
            </div>
            <div className="text-left">
               <h2 className="text-xl font-bold text-cyan-800">{settings?.storeName || 'مؤسسة أركا'}</h2>
               <p className="text-sm text-gray-400">فرع: {searchParams.get('branchName') || purchase.branchName || purchase.branchId?.name || 'المركز الرئيسي'}</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-bold text-cyan-800 mb-4 px-3 border-r-4 border-cyan-500">بيانات المورد:</h2>
            <div className="bg-cyan-50/30 p-4 rounded-xl border border-cyan-100">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">اسم المورد:</span> <strong className="text-cyan-950 text-lg">{purchase.supplierName}</strong></div>
                <div><span className="text-gray-500">طريقة الدفع:</span> <strong>{purchase.paymentMethod === 'Cash' ? 'نقدي' : purchase.paymentMethod}</strong></div>
              </div>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-lg font-bold text-cyan-800 mb-4 px-3 border-r-4 border-cyan-500">الأصناف الموردة:</h2>
            <table className="w-full text-right border-collapse rounded-xl overflow-hidden border border-gray-200">
              <thead>
                <tr className="bg-cyan-900 text-white">
                  <th className="border-b p-4">المنتج والمواصفات</th>
                  <th className="border-b p-4 text-center">الكمية</th>
                  <th className="border-b p-4 text-center">التكلفة</th>
                  <th className="border-b p-4 text-center">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items.map((item: any, idx: number) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-4 border-b">
                      <div className="font-bold text-cyan-950">{item.productName}</div>
                      {/* Phase 81: Device Specifications */}
                      {(item.productId?.storage || item.productId?.color || item.productId?.batteryHealth) && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {item.productId?.color && (
                            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">🎨 {item.productId.color}</span>
                          )}
                          {item.productId?.storage && (
                            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">💾 {item.productId.storage}</span>
                          )}
                          {item.productId?.batteryHealth && (
                            <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">🔋 {item.productId.batteryHealth}</span>
                          )}
                        </div>
                      )}
                      {item.imeis && item.imeis.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1 font-mono leading-relaxed">{item.imeis.join(' / ')}</div>
                      )}
                    </td>
                    <td className="p-4 border-b text-center font-bold">{item.qty}</td>
                    <td className="p-4 border-b text-center font-mono">{item.unitCost.toLocaleString()} ج.م</td>
                    <td className="p-4 border-b text-center font-mono font-bold text-cyan-900">{(item.qty * item.unitCost).toLocaleString()} ج.م</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 mr-auto w-72">
             <div className="flex justify-between p-3 border-b border-gray-100">
               <span className="text-gray-600">إجمالي البضاعة:</span>
               <span className="font-bold">{purchase.totalAmount.toLocaleString()} ج.م</span>
             </div>
             <div className="flex justify-between p-3 border-b border-cyan-100 bg-cyan-50/50">
               <span className="text-cyan-800 font-bold">المدفوع من الخزنة:</span>
               <span className="text-cyan-900 font-extrabold">{purchase.amountPaid.toLocaleString()} ج.م</span>
             </div>
             <div className="flex justify-between p-3">
               <span className="text-red-600 font-bold">المتبقي (مديونية):</span>
               <span className="text-red-700 font-bold">{purchase.remaining.toLocaleString()} ج.م</span>
             </div>
          </div>

          <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end border-t border-gray-100 pt-6">
             <div className="text-xs text-gray-400 italic">
               صدرت آلياً بواسطة ORCA ERP - {new Date().toLocaleString('ar-EG')}
             </div>
             <div className="text-center">
               <div className="mb-10 text-gray-400 text-sm italic">ختم الشركة / المستلم</div>
               <div className="w-40 h-1 bg-cyan-900"></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PurchaseInvoicePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center">جاري تحميل المحرك السحابي...</div>}>
      <InvoiceContent />
    </Suspense>
  )
}
