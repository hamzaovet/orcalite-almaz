'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2 } from 'lucide-react'

export default function InventoryPrintPage() {
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const branchId = params.get('branchId')

    async function fetchInventory() {
      try {
        const res = await fetch('/api/inventory?status=Available')
        const data = await res.json()
        let items = data.units || []
        
        if (branchId && branchId !== 'all') {
           items = items.filter((u: any) => 
               u.locationId?._id === branchId || u.locationId === branchId || String(u.locationId?.name).includes(branchId)
           )
        }
        setUnits(items)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
        setTimeout(() => window.print(), 800)
      }
    }
    fetchInventory()
  }, [])

  // PHASE 107: FORCED AGGREGATION OVERRIDE
  const aggregated = useMemo(() => {
    const reduced = units.reduce((acc: any, item: any) => {
      const prodId = String(item.productId?._id || item.productId || 'unknown');
      const locName = item.locationId?.name || (item.locationType === 'MainWarehouse' ? 'المخزن الرئيسي' : item.locationId || 'Unknown');
      const key = `${prodId}-${locName}`;
      
      if (!acc[key]) {
        const unitCost = item.landedCostEGP || item.productId?.costPrice || 0;
        acc[key] = { 
          ...item, 
          aggregatedQty: item.quantity || 1,
          totalCost: unitCost * (item.quantity || 1),
          displayLocation: locName
        };
      } else {
        const unitCost = item.landedCostEGP || item.productId?.costPrice || 0;
        const q = item.quantity || 1;
        acc[key].aggregatedQty += q;
        acc[key].totalCost += (unitCost * q);
      }
      return acc;
    }, {});

    return Object.values(reduced).map((item: any) => ({
      ...item,
      avgCost: item.aggregatedQty > 0 ? item.totalCost / item.aggregatedQty : 0
    }));
  }, [units])

  const totals = useMemo(() => {
    return aggregated.reduce((acc: any, curr: any) => {
      acc.qty += curr.aggregatedQty
      acc.value += (curr.avgCost * curr.aggregatedQty)
      return acc
    }, { qty: 0, value: 0 })
  }, [aggregated])

  if (loading) return (
    <div style={{ padding: '5rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto', color: '#666' }} />
      <p style={{ marginTop: '1rem', color: '#666' }}>جاري تجهيز تقرير الجرد للطباعة...</p>
    </div>
  )

  const thStyle = { borderBottom: '2px solid #000', padding: '12px 8px', textAlign: 'right' as const, fontWeight: 'bold' }
  const tdStyle = { borderBottom: '1px solid #ccc', padding: '10px 8px', textAlign: 'right' as const }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', direction: 'rtl', background: '#fff', color: '#000', minHeight: '100vh' }}>
      <div style={{ marginBottom: '2rem', borderBottom: '2px solid #000', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
         <div>
          <h1 style={{ margin: 0, fontSize: '24px' }}>تقرير الجرد الفعلي (CPA Audit Engine)</h1>
          <p style={{ margin: '5px 0 0 0', color: '#444', fontSize: '13px' }}>
            تاريخ الجرد: {new Date().toLocaleDateString('ar-EG')} | الحالة: متوفر في المخازن
          </p>
         </div>
         <div style={{ textAlign: 'left', fontSize: '13px' }}>
            <strong>إجمالي الكمية:</strong> {totals.qty} وحدة<br/>
            <strong>القيمة الإجمالية:</strong> {totals.value.toLocaleString('ar-EG')} ج.م
         </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={thStyle}>التصنيف</th>
            <th style={thStyle}>اسم المنتج</th>
            <th style={thStyle}>الكمية</th>
            <th style={thStyle}>اللون</th>
            <th style={thStyle}>متوسط التكلفة (CPA)</th>
            <th style={thStyle}>سعر البيع</th>
            <th style={thStyle}>الحالة</th>
            <th style={thStyle}>المورد</th>
            <th style={thStyle}>الفرع/المخزن</th>
          </tr>
        </thead>
        <tbody>
          {aggregated.map((u: any, i: number) => {
             const price = u.productId?.sellingPrice || 0
             
             return (
               <tr key={u._id || `agg-${i}`}>
                 <td style={tdStyle}>{u.productId?.categoryId?.name || u.productId?.category || '---'}</td>
                 <td style={tdStyle}>
                    <strong>{u.productId?.name || 'منتج غير معروف'}</strong>
                 </td>
                 <td style={{ ...tdStyle, fontWeight: 'bold' }}>{u.aggregatedQty}</td>
                 <td style={tdStyle}>{u.attributes?.color || u.color || '---'}</td>
                 <td style={tdStyle}>{u.avgCost.toLocaleString('ar-EG')} ج</td>
                 <td style={tdStyle}>{price.toLocaleString('ar-EG')} ج</td>
                 <td style={tdStyle}>{u.condition === 'Used' ? 'مستعمل' : 'جديد'} {u.attributes?.batteryHealth ? `(${u.attributes.batteryHealth}%)` : ''}</td>
                 <td style={tdStyle}>---</td>
                 <td style={tdStyle}>{u.displayLocation}</td>
               </tr>
             )
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f8f8f8' }}>
            <td colSpan={2} style={{ ...tdStyle, fontWeight: 'bold', borderTop: '2px solid #000' }}>الإجمالي النهائي</td>
            <td style={{ ...tdStyle, fontWeight: 'bold', borderTop: '2px solid #000' }}>{totals.qty}</td>
            <td colSpan={2} style={{ ...tdStyle, fontWeight: 'bold', borderTop: '2px solid #000' }}>{totals.value.toLocaleString('ar-EG')} ج.م</td>
            <td colSpan={4} style={{ ...tdStyle, borderTop: '2px solid #000' }}></td>
          </tr>
        </tfoot>
      </table>
      
      <div style={{ marginTop: '3rem', fontSize: '11px', color: '#888', textAlign: 'center' }}>
        تم استخراج هذا التقرير آلياً عبر محرك الجرد CPA Audit Engine - ORCA ERP
      </div>

      <style>{`
        @media print {
           @page { size: A4 landscape; margin: 10mm; }
           body { margin: 0; background: #fff !important; }
           * { color: #000 !important; text-shadow: none !important; }
        }
      `}</style>
    </div>
  )
}
