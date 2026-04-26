/**
 * invoiceUtils
 * Shared utilities for handling invoices, including native printing and WhatsApp.
 */

import type { InvoiceData } from './InvoiceTemplate'
import type { ConsignmentData } from './ConsignmentTemplate'

/**
 * triggerNativePrint
 * Triggers the browser's native print dialog.
 * Temporarily changes the document title to set the PDF filename.
 */
export function triggerNativePrint(invoiceNumber: string): void {
  if (typeof window !== 'undefined') {
    const originalTitle = document.title
    document.title = `Invoice-${invoiceNumber}`
    window.print()
    document.title = originalTitle
  }
}

/**
 * buildWhatsAppMessage
 * Constructs a professional RTL WhatsApp message summarising the sale.
 */
export function buildWhatsAppMessage(data: InvoiceData): string {
  const itemsList = data.items
    .map(i => `• ${i.productName}${i.serialNumber ? ` (SN: ${i.serialNumber})` : ''} — ${i.actualUnitPrice.toLocaleString('ar-EG')} ج.م`)
    .join('\n')

  return encodeURIComponent(
    `🖤 *أوركا — Apple Premium Reseller*\n` +
    `─────────────────────\n` +
    `📄 *فاتورة رقم:* ${data.invoiceNumber}\n` +
    `📅 *التاريخ:* ${data.date} — ${data.time}\n` +
    `👤 *العميل:* ${data.customer}\n` +
    `─────────────────────\n` +
    `🛒 *المنتجات:*\n${itemsList}\n` +
    `─────────────────────\n` +
    (data.discount > 0 ? `🏷️ *الخصم:* ${data.discount.toLocaleString('ar-EG')} ج.م\n` : '') +
    `💰 *الإجمالي:* ${data.totalSalePrice.toLocaleString('ar-EG')} ج.م\n` +
    `💳 *الدفع:* ${data.paymentMethod}\n` +
    `─────────────────────\n` +
    `✅ شكراً لثقتكم في أوركا 🙏\n` +
    `للاستفسار أو الضمان يرجى الاحتفاظ بهذه الرسالة.`
  )
}

/**
 * openWhatsApp
 * Opens wa.me with a pre-formatted message.
 * Sanitises the phone number (removes leading 0 / spaces / dashes).
 */
export function openWhatsApp(phone: string, data: InvoiceData): void {
  // Normalise Egypt numbers
  let sanitised = phone.replace(/[\s\-\(\)]/g, '')
  if (sanitised.startsWith('0')) sanitised = '2' + sanitised   // 01xxxxxxx → 201xxxxxxx
  if (!sanitised.startsWith('+')) sanitised = '+' + sanitised

  const msg = buildWhatsAppMessage(data)
  window.open(`https://wa.me/${sanitised.replace(/\+/g, '')}?text=${msg}`, '_blank')
}

/**
 * buildTransferWhatsAppMessage
 * Constructs a professional RTL WhatsApp message for consignment transfers.
 */
export function buildTransferWhatsAppMessage(data: ConsignmentData): string {
  const itemsList = data.items
    .map(i => `• ${i.productName} (SN: ${i.serialNumber})`)
    .join('\n')

  const text = 
    `📄 *إذن صرف عُهدة — أوركا*\n` +
    `─────────────────────\n` +
    `🔢 *رقم الإذن:* ${data.orderNumber}\n` +
    `👤 *المستلم:* ${data.targetName}\n` +
    `🏢 *نوع الكيان:* ${data.targetType}\n` +
    `📅 *التاريخ:* ${data.date} — ${data.time}\n` +
    `─────────────────────\n` +
    `📦 *إجمالي الوحدات:* ${data.items.length}\n` +
    `💰 *إجمالي قيمة العُهدة:* ${data.totalValue.toLocaleString('ar-EG')} ج.م\n` +
    `🛒 *المنتجات:*\n${itemsList}\n` +
    `─────────────────────\n` +
    (data.notes ? `📝 *ملاحظات:* ${data.notes}\n` : '') +
    `⚠️ *إشعار قانوني:*\n` +
    `تعتبر هذه الرسالة إشعاراً رسمياً باستلام العُهدة وقيد قيمتها على حسابكم. يرجى المراجعة.`

  return encodeURIComponent(text)
}

/**
 * openTransferWhatsApp
 * Opens WhatsApp with a consignment transfer summary.
 */
export function openTransferWhatsApp(phone: string, data: ConsignmentData): void {
  let sanitised = phone.replace(/[\s\-\(\)]/g, '')
  if (sanitised.startsWith('0')) sanitised = '2' + sanitised
  if (!sanitised.startsWith('+')) sanitised = '+' + sanitised

  const msg = buildTransferWhatsAppMessage(data)
  window.open(`https://wa.me/${sanitised.replace(/\+/g, '')}?text=${msg}`, '_blank')
}
