import { readFileSync, writeFileSync } from 'fs'

const file = 'd:/Work/freezone-erp/app/dashboard/treasury/page.tsx'
let content = readFileSync(file, 'utf8')
const lines = content.split('\n')

// Find line 585 (0-indexed: 584) which is the old amount grid
// Replace lines 585-596 (0-indexed 584-595) with the forex-aware version
const newBlock = `
                 <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                     <div>
                       <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', marginBottom: '0.5rem', display: 'block' }}>
                         {forexAutoCalc !== null ? 'المبلغ (ج.م) — محسوب ومقفل 🔒' : 'المبلغ (ج.م) *'}
                       </label>
                       <input
                         type="number"
                         style={{
                           ...inputStyle,
                           fontSize: '1.25rem', fontWeight: 900, direction: 'ltr',
                           ...(forexAutoCalc !== null ? {
                             background: 'rgba(251,146,60,0.06)',
                             border: '1px solid rgba(251,146,60,0.4)',
                             color: '#FB923C',
                             cursor: 'not-allowed'
                           } : {})
                         }}
                         value={form.amount}
                         onChange={e => { if (forexAutoCalc === null) setForm({...form, amount: e.target.value}) }}
                         readOnly={forexAutoCalc !== null}
                         placeholder="0.00"
                       />
                     </div>
                     <div><label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', marginBottom: '0.5rem', display: 'block' }}>القناة المالية *</label>
                       <select style={inputStyle} value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>
                         <option value="Cash">كاش (نقدي)</option>
                         <option value="Visa">فيزا</option>
                         <option value="Valu">ValU</option>
                         <option value="InstaPay">إنستاباي</option>
                         <option value="Vodafone Cash">فودافون كاش</option>
                       </select>
                     </div>
                  </div>`

// Also arabize the Forex panel labels (lines 558, 561, 568, 573, 578)
// Replace English labels
const replacements = [
  ["{'🌐 Forex Payment'}", "{'🌐 دفع بعملة أجنبية (Forex Payment)'}"],
  ["{'Related Shipment (Optional)'}", "{'الرسالة المرتبطة بالدفعة (اختياري)'}"],
  ["{'Foreign Amount Paid'}", "{'المبلغ الأجنبي المدفوع'}"],
  ["{'Actual Exchange Rate (Payment Day)'}", "{'سعر الصرف الفعلي يوم السداد'}"],
  ["{'Auto-Calculated EGP Amount 🔒'}", "{'المبلغ المحسوب تلقائياً بالجنيه 🔒'}"],
  ["{'— Select Shipment —'}", "{'— اختر الرسالة —'}"],
]

for (const [from, to] of replacements) {
  if (content.includes(from)) {
    content = content.replace(from, to)
    console.log('Replaced:', from.substring(0, 40))
  } else {
    console.log('NOT FOUND:', from.substring(0, 40))
  }
}

// Now replace the amount grid block (lines 585-596, 0-indexed 584-595)
const linesArr = content.split('\n')
// Find the line with the grid
const gridIdx = linesArr.findIndex((l, i) => i >= 583 && l.includes("gridTemplateColumns: '1.2fr 1fr'"))
console.log('Grid found at line:', gridIdx + 1)

if (gridIdx >= 0) {
  // Find closing </div> of this grid (line 596 = idx 595)
  let closeIdx = gridIdx
  let depth = 0
  for (let i = gridIdx; i < linesArr.length; i++) {
    const l = linesArr[i]
    const opens = (l.match(/<div/g) || []).length
    const closes = (l.match(/<\/div>/g) || []).length
    depth += opens - closes
    if (i > gridIdx && depth <= 0) { closeIdx = i; break }
  }
  console.log('Grid closes at line:', closeIdx + 1)
  
  // Splice replacement
  const before = linesArr.slice(0, gridIdx)
  const after = linesArr.slice(closeIdx + 1)
  const newLines = [...before, ...newBlock.split('\n'), ...after]
  content = newLines.join('\n')
  console.log('Grid replaced successfully')
}

writeFileSync(file, content, 'utf8')
console.log('Done')
