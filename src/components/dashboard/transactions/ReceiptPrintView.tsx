import { toast } from 'sonner';
import type { GroupedTransaction } from '@/hooks/useGroupedTransactions';
import type { ReceiptConfig } from '@/hooks/useReceiptConfig';
import { DEFAULT_RECEIPT_CONFIG } from '@/hooks/useReceiptConfig';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface ReceiptBusinessInfo {
  logoUrl?: string | null;
  address?: string;
  phone?: string | null;
}

export function printReceipt(
  transaction: GroupedTransaction,
  formatCurrency: (n: number) => string,
  orgName = 'Salon',
  receiptConfig?: ReceiptConfig,
  businessInfo?: ReceiptBusinessInfo,
) {
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) {
    toast.error('Popup blocked — please allow popups for this site to print receipts.');
    return;
  }

  const cfg = receiptConfig ?? DEFAULT_RECEIPT_CONFIG;
  const accentColor = cfg.accent_color || '#e5e5e5';

  const dateStr = new Date(transaction.transactionDate + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const logoHtml = cfg.show_logo && businessInfo?.logoUrl
    ? `<img src="${escapeHtml(businessInfo.logoUrl)}" alt="${escapeHtml(orgName)}" style="height:40px;object-fit:contain;margin:${cfg.logo_position === 'center' ? '0 auto 8px' : '0 0 8px'}" />`
    : `<h1 style="font-size:18px;font-weight:500;margin:0 0 4px;letter-spacing:0.05em;text-transform:uppercase;">${escapeHtml(orgName)}</h1>`;

  const addressHtml = cfg.show_address && businessInfo?.address
    ? `<p style="font-size:11px;color:#888;margin:2px 0;">${escapeHtml(businessInfo.address)}</p>`
    : '';

  const phoneHtml = cfg.show_phone && businessInfo?.phone
    ? `<p style="font-size:11px;color:#888;margin:2px 0;">${escapeHtml(businessInfo.phone)}</p>`
    : '';

  const itemsHtml = transaction.items
    .map(
      (item) => `
      <tr>
        <td style="padding:4px 0;font-size:13px;">${escapeHtml(item.itemName)}</td>
        <td style="padding:4px 0;font-size:13px;text-align:center;">${item.quantity}</td>
        <td style="padding:4px 0;font-size:13px;text-align:right;">${formatCurrency(item.totalAmount)}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Receipt - ${transaction.transactionId}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 24px; max-width: 360px; margin: 0 auto; color: #1a1a1a; }
    .header { text-align: ${cfg.logo_position === 'center' ? 'center' : 'left'}; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid ${accentColor}; }
    .header p { font-size: 12px; color: #888; margin: 2px 0; }
    .meta { font-size: 12px; color: #666; margin-bottom: 16px; }
    .meta div { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; }
    thead th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; padding-bottom: 6px; border-bottom: 1px solid ${accentColor}; text-align: left; }
    thead th:last-child { text-align: right; }
    thead th:nth-child(2) { text-align: center; }
    tbody { border-bottom: 1px solid ${accentColor}; }
    .totals { margin-top: 12px; }
    .totals div { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
    .totals .grand { font-weight: 500; font-size: 16px; padding-top: 8px; border-top: 1px solid ${accentColor}; margin-top: 6px; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #aaa; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    ${addressHtml}
    ${phoneHtml}
    <p>${dateStr}</p>
  </div>
  <div class="meta">
    <div><strong>Client:</strong> ${escapeHtml(transaction.clientName || 'Walk-in')}</div>
    ${cfg.show_stylist && transaction.stylistName ? `<div><strong>Stylist:</strong> ${escapeHtml(transaction.stylistName)}</div>` : ''}
    ${cfg.show_payment_method && transaction.paymentMethod ? `<div><strong>Payment:</strong> ${escapeHtml(transaction.paymentMethod)}</div>` : ''}
    <div><strong>Transaction:</strong> ${escapeHtml(transaction.transactionId.slice(0, 12))}…</div>
  </div>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal</span><span>${formatCurrency(transaction.subtotal)}</span></div>
    ${transaction.discountAmount > 0 ? `<div><span>Discount</span><span>-${formatCurrency(transaction.discountAmount)}</span></div>` : ''}
    <div><span>Tax</span><span>${formatCurrency(transaction.taxAmount)}</span></div>
    ${transaction.tipAmount > 0 ? `<div><span>Tip</span><span>${formatCurrency(transaction.tipAmount)}</span></div>` : ''}
    <div class="grand"><span>Total</span><span>${formatCurrency(transaction.totalAmount + transaction.tipAmount)}</span></div>
  </div>
  <div class="footer">
    ${cfg.custom_message ? `<p>${escapeHtml(cfg.custom_message)}</p>` : ''}
    ${cfg.footer_text ? `<p>${escapeHtml(cfg.footer_text)}</p>` : ''}
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}
