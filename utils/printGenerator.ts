export interface ConsignmentItem {
  productName: string
  serialNumber: string
}

export interface ConsignmentData {
  orderNumber: string
  date: string
  time: string
  targetName: string
  targetType: string
  items: ConsignmentItem[]
  totalValue: number
  mode: 'Out' | 'In'
  notes?: string
}

const TYPE_LABELS: Record<string, string> = {
  Internal:       'فرع داخلي',
  Branch:         'فرع بيع',
  Warehouse:      'مستودع',
  Distributor:    'موزع معتمد',
  Representative: 'مندوب مبيعات',
}

const corporateCSS = `
  body { 
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
    margin: 0; 
    padding: 0; 
    background: #fff;
    color: #333;
    line-height: 1.5;
  }
  .page {
    width: 210mm;
    min-height: 290mm;
    margin: 0 auto;
    padding: 15mm;
    box-sizing: border-box;
    position: relative;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #000;
    padding-bottom: 15px;
    margin-bottom: 25px;
  }
  .header-info { text-align: left; direction: ltr; }
  .title-badge { 
    font-size: 11px; 
    font-weight: 900; 
    margin-bottom: 3px;
    color: #000;
  }
  .order-num { font-size: 24px; font-weight: 900; color: #000; }
  
  .entity-box {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    padding: 15px;
    border-radius: 10px;
    margin-bottom: 25px;
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 20px;
  }
  .field-group { border-right: 2px solid #ddd; padding-right: 15px; }
  .field-label { font-size: 9px; color: #6c757d; font-weight: 800; margin-bottom: 3px; text-transform: uppercase; }
  .field-value { font-size: 16px; font-weight: 900; color: #212529; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th { 
    background: #f8f9fa; 
    text-align: right; 
    padding: 10px; 
    font-size: 10px; 
    font-weight: 900; 
    border: 1px solid #dee2e6;
    color: #495057;
  }
  td { 
    padding: 8px; 
    font-size: 11px; 
    border: 1px solid #dee2e6;
    color: #212529;
    vertical-align: top;
  }
  .ltr-cell { text-align: left; direction: ltr; font-family: monospace; }
  
  .summary-section {
    border-top: 1px solid #dee2e6;
    padding-top: 15px;
    margin-bottom: 40px;
  }
  .grand-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #212529;
    color: #fff;
    padding: 15px 25px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  .total-label { font-size: 13px; font-weight: 800; color: #adb5bd; }
  .total-value { font-size: 26px; font-weight: 900; color: #fff; }

  .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    margin-top: 40px;
  }
  .sig-line { border-top: 1px solid #000; padding-top: 8px; text-align: center; font-size: 11px; font-weight: 900; }

  .item-list { margin: 0; padding: 0; list-style: none; font-size: 10px; color: #555; }
  .item-list li { margin-bottom: 2px; border-bottom: 1px dashed #eee; padding-bottom: 2px; }

  @media print {
    @page { size: A4; margin: 0; }
    .page { margin: 0; padding: 10mm; }
    .grand-total { border: 2px solid #000; background: #f8f9fa !important; color: #000 !important; }
    .total-value { color: #000 !important; }
    .total-label { color: #666 !important; }
  }
`

export function generateTransferReceiptHTML(data: ConsignmentData): string {
  const isReturn = data.mode === 'In'
  const titleArabic = isReturn ? 'إذن استلام مرتجع عُهدة' : 'إذن صرف عُهدة'
  const titleEnglish = isReturn ? 'RETURN RECEIPT' : 'TRANSFER ORDER'
  const itemsRows = data.items.map(item => `
    <tr>
      <td style="font-weight: 800;">${item.productName}</td>
      <td class="ltr-cell">${item.serialNumber || 'N/A'}</td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${titleEnglish} - ${data.orderNumber}</title>
      <style>${corporateCSS}</style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="font-size: 22px; font-weight: 950; color: #000;">FREE ZONE</div>
            <div style="font-size: 9px; font-weight: 800; color: #6c757d; letter-spacing: 0.1em; border-right: 2px solid #dee2e6; padding-right: 12px;">
              DISTRIBUTION HUB<br>إدارة التوزيع المركزية
            </div>
          </div>
          <div class="header-info">
            <div class="title-badge">${titleEnglish} | ${titleArabic}</div>
            <div class="order-num">#${data.orderNumber}</div>
            <div style="font-size: 11px; color: #6c757d;">${data.date} — ${data.time}</div>
          </div>
        </div>

        <div class="entity-box">
          <div class="field-group">
            <div class="field-label">${isReturn ? 'استلم من (جهة المرتجع)' : 'صرف إلى (جهة الاستلام)'}</div>
            <div class="field-value">${data.targetName}</div>
          </div>
          <div style="text-align: left;">
            <div class="field-label">نوع الكيان | ENTITY TYPE</div>
            <div class="field-value">${TYPE_LABELS[data.targetType] || data.targetType}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 60%;">المنتج / الوصف | Description</th>
              <th style="text-align: left;">S/N | الرقم التسلسلي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="summary-section">
          <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 12px; margin-bottom: 12px; color: #495057;">
            <span>إجمالي الكمية (Total Count):</span>
            <span>${data.items.length} Units</span>
          </div>
          <div class="grand-total">
            <span class="total-label">${isReturn ? 'إجمالي قيمة المرتجع' : 'إجمالي قيمة العُهدة (DEBT)'}</span>
            <span class="total-value">${(data.totalValue || 0).toLocaleString()} EGP</span>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-line">توقيع المستودع / Warehouse Auth</div>
          <div class="sig-line">توقيع المستلم / Receiver Signature</div>
        </div>
      </div>
    </body>
    </html>
  `
}

export function generateLedgerHTML(branch: any, orders: any[], totalDebt: number): string {
  const tableRows = orders.map(order => {
    const isOut = order.fromLocationType === 'MainWarehouse'
    const itemsDescription = (order.items || []).map((unit: any) => 
      `<li>${unit.productId?.name || 'Unknown Product'} (SN: ${unit.serialNumber || 'N/A'})</li>`
    ).join('')

    return `
      <tr>
        <td style="font-size: 10px; color: #666;">${new Date(order.date).toLocaleDateString('ar-EG')}</td>
        <td style="font-weight: 800; font-size: 10px;">${order.orderNumber}</td>
        <td style="font-weight: 800; font-size: 10px; color: ${isOut ? '#2b8a3e' : '#e67700'};">
          ${isOut ? 'صرف (Out)' : 'مرتجع (In)'}
        </td>
        <td style="width: 45%;">
          <ul class="item-list">
            ${itemsDescription || '<li>لا توجد بيانات للأجهزة</li>'}
          </ul>
        </td>
        <td class="ltr-cell" style="text-align: right; font-weight: 900; font-size: 11px;">
          ${(order.totalValue || 0).toLocaleString()} EGP
        </td>
      </tr>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>Detailed Custody Statement - ${branch.name}</title>
      <style>${corporateCSS}</style>
    </head>
    <body>
      <div class="page">
        <div class="header" style="border-bottom: 4px solid #000;">
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="font-size: 26px; font-weight: 950;">FREE ZONE</div>
            <div style="font-size: 9px; font-weight: 900; color: #666; border-right: 2px solid #000; padding-right: 15px;">
              DISTRIBUTION HUB<br>إدارة التوزيع المركزية
            </div>
          </div>
          <div class="header-info" style="text-align: left;">
            <div class="title-badge" style="font-size: 14px; background: #000; color: #fff; padding: 4px 12px; margin-bottom: 8px;">
               كشف حركة عُهد تفصيلي | Detailed Custody Statement
            </div>
            <div style="font-size: 11px; color: #6c757d;">تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}</div>
          </div>
        </div>

        <div class="entity-box" style="margin-bottom: 30px; border: 2px solid #000;">
          <div class="field-group">
            <div class="field-label">اسم الكيان / المندوب</div>
            <div class="field-value">${branch.name}</div>
          </div>
          <div style="text-align: left;">
            <div class="field-label">رقم المرجع الضريبي / الكود</div>
            <div class="field-value">${branch._id.toString().slice(-8).toUpperCase()}</div>
          </div>
        </div>

        <h3 style="font-size: 13px; font-weight: 900; margin-bottom: 12px; border-right: 4px solid #000; padding-right: 10px;">سجل الحركات السلعية والمالية التفصيلي</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 10%;">التاريخ</th>
              <th style="width: 15%;">رقم الإذن</th>
              <th style="width: 10%;">النوع</th>
              <th style="width: 45%;">البيان / التفاصيل (Description)</th>
              <th style="width: 20%; text-align: right;">القيمة (Value)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="summary-section">
           <div class="grand-total" style="background: #f1f3f5; color: #000; border: 2px solid #000;">
              <span class="total-label" style="color: #495057; font-size: 16px;">إجمالي قيمة العُهد الحالية (Balance)</span>
              <span class="total-value" style="color: #000; font-size: 32px;">${(totalDebt || 0).toLocaleString()} EGP</span>
           </div>
           <p style="font-size: 10px; color: #6c757d; margin-top: 15px; text-align: center; font-style: italic;">
             * هذا البيان يمثل تفاصيل العهد السلعية المستلمة والمنصرفة، ولا يشمل التحصيلات النقدية.
           </p>
        </div>

        <div class="signatures" style="margin-top: 50px;">
          <div class="sig-line">إدارة الحسابات / Accounting Div</div>
          <div class="sig-line">توقيع المستلم للعهدة / Representative</div>
        </div>
      </div>
    </body>
    </html>
  `
}

export function generateTransactionReceiptHTML(tx: any): string {
  const isIN = tx.type === 'IN'
  const titleArabic = isIN ? 'إيصال استلام نقدية' : 'إيصال صرف نقدية'
  const titleEnglish = isIN ? 'RECEIPT VOUCHER' : 'PAYMENT VOUCHER'
  
  return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${titleEnglish} - ${tx._id.toString().slice(-6).toUpperCase()}</title>
      <style>${corporateCSS}</style>
    </head>
    <body style="padding: 20px;">
      <div class="page" style="min-height: 140mm; padding: 10mm; border: 4px double #000; height: auto;">
        <div class="header">
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="font-size: 22px; font-weight: 950;">FREE ZONE</div>
            <div style="font-size: 8px; font-weight: 900; color: #666; border-right: 2px solid #000; padding-right: 12px; text-align: right;">
              FINANCIAL SERVICES<br>الإدارة المالية
            </div>
          </div>
          <div class="header-info" style="text-align: left;">
            <div class="title-badge" style="font-size: 11px; background: #000; color: #fff; padding: 2px 6px;">
               ${titleArabic} | ${titleEnglish}
            </div>
            <div style="font-size: 16px; font-weight: 900; margin-top: 5px;">Ref: #${tx._id.toString().slice(-8).toUpperCase()}</div>
            <div style="font-size: 10px; color: #666;">التاريخ: ${new Date(tx.date).toLocaleDateString('ar-EG')}</div>
          </div>
        </div>

        <div style="margin: 30px 0; font-size: 14px; line-height: 2.5;">
          <div style="display: flex; border-bottom: 1px dashed #ccc; margin-bottom: 15px;">
            <span style="font-weight: 900; min-width: 150px;">${isIN ? 'استلمنا من اﻟسيد/اﻟجهة:' : 'تم صرفه إلى اﻟسيد/اﻟجهة:'}</span>
            <span style="font-size: 18px; font-weight: 950; border-bottom: 2px solid #000; flex-grow: 1;">${tx.entityName || 'مصاريف عامة'}</span>
          </div>

          <div style="display: flex; border-bottom: 1px dashed #ccc; margin-bottom: 15px;">
            <span style="font-weight: 900; min-width: 150px;">مبلغ وقدره:</span>
            <span style="font-size: 20px; font-weight: 950; flex-grow: 1;">${Number(tx.amount).toLocaleString('ar-EG')} جنيه مصري لا غير (EGP)</span>
          </div>

          <div style="display: flex; border-bottom: 1px dashed #ccc; margin-bottom: 15px;">
            <span style="font-weight: 900; min-width: 150px;">وذلك عن (اﻟبيان):</span>
            <span style="font-style: italic; border-bottom: 1px solid #eee; flex-grow: 1;">${tx.description || '—'}</span>
          </div>

          <div style="display: flex;">
            <span style="font-weight: 900; min-width: 150px;">طريقة اﻟدفع:</span>
            <span style="font-weight: 800; border-bottom: 1px solid #eee; flex-grow: 1;">${tx.paymentMethod}</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 60px;">
          <div class="sig-line" style="font-size: 11px;">توقيع أمين الصندوق / Cashier</div>
          <div class="sig-line" style="font-size: 11px;">توقيع الجهة المستلمة / Signature</div>
        </div>

        <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px; font-size: 9px; color: #999; text-align: center;">
          * يعتبر هذا الإيصال لاغياً في حال وجود أي كشط أو تعديل يدوي. تم استخراجه آلياً من نظام FREE ZONE.
        </div>
      </div>
    </body>
    </html>
  `
}

export function generateMasterLedgerHTML(branchName: string, statement: any[]): string {
  const totalDebit = statement.reduce((sum, item) => sum + item.debit, 0)
  const totalCredit = statement.reduce((sum, item) => sum + item.credit, 0)
  const finalBalance = statement.length > 0 ? statement[statement.length - 1].balance : 0

  return `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>كشف حساب مجمع - ${branchName}</title>
      <style>
        ${corporateCSS}
        .statement-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
        .statement-table th { background: #f8f9fa; color: #000; border: 1px solid #000; padding: 8px; font-weight: 900; }
        .statement-table td { border: 1px solid #ddd; padding: 6px; text-align: center; }
        .description-cell { text-align: right !important; font-size: 10px; max-width: 250px; white-space: normal; line-height: 1.4; }
        .debit { color: #d63031; font-weight: 700; }
        .credit { color: #27ae60; font-weight: 700; }
        .balance-cell { background: #f1f2f6; font-weight: 900; }
      </style>
    </head>
    <body style="padding: 20px;">
      <div class="page" style="width: 210mm; margin: 0 auto; padding: 10mm; background: #fff;">
        <div class="header">
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="font-size: 24px; font-weight: 950;">FREE ZONE</div>
            <div style="font-size: 10px; color: #666; border-right: 2px solid #000; padding-right: 15px;">
              SYSTEMS & DISTRIBUTION<br>كشف حساب مجمع (بضاعة + نقدية)
            </div>
          </div>
          <div style="text-align: left;">
            <div style="font-size: 14px; font-weight: 900;">${branchName}</div>
            <div style="font-size: 10px; color: #888;">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</div>
          </div>
        </div>

        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border: 1px solid #000; display: flex; justify-content: space-between;">
           <div style="text-align: center;">
              <small style="display: block; opacity: 0.6;">إجمالي المسحوبات (Debit)</small>
              <strong style="font-size: 18px;">${totalDebit.toLocaleString()} EGP</strong>
           </div>
           <div style="text-align: center;">
              <small style="display: block; opacity: 0.6;">إجمالي التحصيلات (Credit)</small>
              <strong style="font-size: 18px; color: #27ae60;">${totalCredit.toLocaleString()} EGP</strong>
           </div>
           <div style="text-align: center;">
              <small style="display: block; opacity: 0.6;">الرصيد النهائي المستحق</small>
              <strong style="font-size: 22px; color: #d63031;">${finalBalance.toLocaleString()} EGP</strong>
           </div>
        </div>

        <table class="statement-table">
          <thead>
            <tr>
              <th style="width: 80px;">التاريخ</th>
              <th style="width: 60px;">النوع</th>
              <th style="width: 80px;">المرجع</th>
              <th>التفاصيل / البيان</th>
              <th style="width: 70px;">مدين (+)</th>
              <th style="width: 70px;">دائن (-)</th>
              <th style="width: 90px;">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            ${statement.map(item => `
              <tr>
                <td>${new Date(item.date).toLocaleDateString('ar-EG')}</td>
                <td><small>${item.typeAr}</small></td>
                <td><small>${item.ref}</small></td>
                <td class="description-cell">${item.description}</td>
                <td class="debit">${item.debit > 0 ? item.debit.toLocaleString() : '—'}</td>
                <td class="credit">${item.credit > 0 ? item.credit.toLocaleString() : '—'}</td>
                <td class="balance-cell">${item.balance.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
           <div class="sig-line" style="font-size: 11px;">اعتماد المركز المالي الرئيسي</div>
           <div class="sig-line" style="font-size: 11px;">توقيع مندوب التوزيع / المستلم</div>
        </div>
      </div>
    </body>
    </html>
  `
}

