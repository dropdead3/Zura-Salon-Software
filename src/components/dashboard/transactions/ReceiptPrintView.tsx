import { toast } from 'sonner';
import type { ReceiptConfig } from '@/hooks/useReceiptConfig';
import { DEFAULT_RECEIPT_CONFIG } from '@/hooks/useReceiptConfig';
import type { ReceiptData } from './receiptData';
import type { GroupedTransaction } from '@/hooks/useGroupedTransactions';
import { groupedTransactionToReceiptData } from './receiptData';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ReceiptBusinessInfo {
  logoUrl?: string | null;
  iconUrl?: string | null;
  address?: string;
  phone?: string | null;
  website?: string | null;
  socials?: { instagram?: string; facebook?: string; tiktok?: string };
  reviewUrls?: { google?: string; yelp?: string; facebook?: string };
}

function getLogoStyle(size?: string): string {
  if (size === 'sm') return 'max-height:32px;max-width:50%';
  if (size === 'lg') return 'max-height:64px;max-width:90%';
  return 'max-height:48px;max-width:70%';
}

function getIconHeight(size?: string): string {
  if (size === 'lg') return '32px';
  if (size === 'md') return '24px';
  return '16px';
}

/**
 * Build the full receipt HTML string from ReceiptData + branding config.
 * Used by both printReceipt (browser popup) and email receipt (edge function).
 */
export function buildReceiptHtml(
  data: ReceiptData,
  formatCurrency: (n: number) => string,
  orgName: string,
  receiptConfig?: ReceiptConfig,
  businessInfo?: ReceiptBusinessInfo,
  redoPolicyFallback?: string,
): string {
  const cfg = receiptConfig ?? DEFAULT_RECEIPT_CONFIG;
  const borderColor = '#e5e5e5';

  const dateStr = new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const logoStyle = getLogoStyle(cfg.logo_size as string);
  const logoHtml = cfg.show_logo && businessInfo?.logoUrl
    ? `<img src="${escapeHtml(businessInfo.logoUrl)}" alt="${escapeHtml(orgName)}" style="${logoStyle};width:auto;height:auto;object-fit:contain;margin:${cfg.logo_position === 'center' ? '0 auto 8px' : '0 0 8px'}" />`
    : `<h1 style="font-size:18px;font-weight:500;margin:0 0 4px;letter-spacing:0.05em;text-transform:uppercase;">${escapeHtml(orgName)}</h1>`;

  const addressHtml = cfg.show_address && businessInfo?.address
    ? `<p style="font-size:11px;color:#888;margin:2px 0;">${escapeHtml(businessInfo.address)}</p>`
    : '';

  const phoneHtml = cfg.show_phone && businessInfo?.phone
    ? `<p style="font-size:11px;color:#888;margin:2px 0;">${escapeHtml(businessInfo.phone)}</p>`
    : '';

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:4px 0;font-size:13px;">${escapeHtml(item.name)}</td>
        <td style="padding:4px 0;font-size:13px;text-align:center;">${item.quantity}</td>
        <td style="padding:4px 0;font-size:13px;text-align:right;">${formatCurrency(item.amount)}</td>
      </tr>`
    )
    .join('');

  const usageCharges = data.usageCharges || [];
  const usageChargesHtml = usageCharges.length > 0
    ? `<div style="margin-top:12px;padding-top:8px;border-top:1px solid ${borderColor};">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#888;margin:0 0 6px;">Color Room Charges</p>
        <table style="width:100%;border-collapse:collapse;">
          <tbody>
            ${usageCharges.map(c => `<tr>
              <td style="padding:3px 0;font-size:12px;">${escapeHtml(c.name)}</td>
              <td style="padding:3px 0;font-size:12px;text-align:center;">${c.quantity}</td>
              <td style="padding:3px 0;font-size:12px;text-align:right;">${formatCurrency(c.amount)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`
    : '';

  const iconHeight = getIconHeight(cfg.footer_icon_size as string);

  return `<!DOCTYPE html>
<html>
<head>
  <title>Receipt - ${data.receiptNumber}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 24px; max-width: 360px; margin: 0 auto; color: #1a1a1a; }
    .header { text-align: ${cfg.logo_position === 'center' ? 'center' : 'left'}; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid ${borderColor}; }
    .header p { font-size: 12px; color: #888; margin: 2px 0; }
    .meta { font-size: 12px; color: #666; margin-bottom: 16px; }
    .meta div { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; }
    thead th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; padding-bottom: 6px; border-bottom: 1px solid ${borderColor}; text-align: left; }
    thead th:last-child { text-align: right; }
    thead th:nth-child(2) { text-align: center; }
    tbody { border-bottom: 1px solid ${borderColor}; }
    .totals { margin-top: 12px; }
    .totals div { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
    .totals .grand { font-weight: 500; font-size: 16px; padding-top: 8px; border-top: 1px solid ${borderColor}; margin-top: 6px; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #aaa; }
    a { color: #666; text-decoration: none; }
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
    <div><strong>Client:</strong> ${escapeHtml(data.clientName)}</div>
    ${cfg.show_stylist && data.stylistName ? `<div><strong>Stylist:</strong> ${escapeHtml(data.stylistName)}</div>` : ''}
    ${cfg.show_payment_method && data.paymentMethod ? `<div><strong>Payment:</strong> ${escapeHtml(data.paymentMethod)}</div>` : ''}
    <div><strong>Transaction:</strong> ${escapeHtml(data.receiptNumber.slice(0, 12))}…</div>
  </div>
   <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  ${usageChargesHtml}
  <div class="totals">
    <div><span>Subtotal</span><span>${formatCurrency(data.subtotal)}</span></div>
    ${data.discount > 0 ? `<div><span>${data.discountLabel ? escapeHtml(data.discountLabel) : 'Discount'}</span><span>-${formatCurrency(data.discount)}</span></div>` : ''}
    <div><span>Tax</span><span>${formatCurrency(data.taxAmount)}</span></div>
    ${data.tipAmount > 0 ? `<div><span>Tip</span><span>${formatCurrency(data.tipAmount)}</span></div>` : ''}
    ${data.usageChargeTotal > 0 ? `<div><span>Color Room</span><span>${formatCurrency(data.usageChargeTotal)}</span></div>` : ''}
    <div class="grand"><span>Total</span><span>${formatCurrency(data.grandTotal)}</span></div>
  </div>
  <div class="footer">
    ${cfg.custom_message ? `<p>${escapeHtml(cfg.custom_message)}</p>` : ''}
    ${cfg.footer_text ? `<p>${escapeHtml(cfg.footer_text)}</p>` : ''}
  </div>
  ${cfg.show_satisfaction_note && cfg.satisfaction_text ? `<p style="text-align:center;font-size:10px;color:#aaa;margin-top:12px;">${escapeHtml(cfg.satisfaction_text)}</p>` : ''}
  ${(() => {
    const redoText = cfg.show_redo_policy ? (cfg.redo_policy_text || redoPolicyFallback || '') : '';
    const refundText = cfg.show_refund_policy ? cfg.refund_policy_text : '';
    if (!redoText && !refundText) return '';
    return `<div style="margin-top:12px;padding-top:8px;border-top:1px solid ${borderColor};font-size:10px;color:#aaa;text-align:center;">
      ${redoText ? `<p style="margin:2px 0;">${escapeHtml(redoText)}</p>` : ''}
      ${refundText ? `<p style="margin:2px 0;">${escapeHtml(refundText)}</p>` : ''}
    </div>`;
  })()}
  ${cfg.show_review_prompt && cfg.review_prompt_text ? (() => {
    const platforms = [
      businessInfo?.reviewUrls?.google ? `<a href="${escapeHtml(businessInfo.reviewUrls.google)}">Google</a>` : '',
      businessInfo?.reviewUrls?.yelp ? `<a href="${escapeHtml(businessInfo.reviewUrls.yelp)}">Yelp</a>` : '',
      businessInfo?.reviewUrls?.facebook ? `<a href="${escapeHtml(businessInfo.reviewUrls.facebook)}">Facebook</a>` : '',
    ].filter(Boolean).join(' &middot; ');
    return `<div style="margin-top:12px;padding-top:8px;border-top:1px solid ${borderColor};text-align:center;">
      <p style="font-size:10px;color:#666;font-weight:500;margin:0 0 2px;">${escapeHtml(cfg.review_prompt_text)}</p>
      ${platforms ? `<p style="font-size:10px;margin:0;">${platforms}</p>` : ''}
    </div>`;
  })() : ''}
  ${(() => {
    const socialParts: string[] = [];
    if (cfg.show_socials && businessInfo?.socials) {
      if (businessInfo.socials.instagram) socialParts.push('@' + escapeHtml(businessInfo.socials.instagram.replace(/^@/, '')));
      if (businessInfo.socials.facebook) socialParts.push('fb/' + escapeHtml(businessInfo.socials.facebook));
      if (businessInfo.socials.tiktok) socialParts.push('@' + escapeHtml(businessInfo.socials.tiktok.replace(/^@/, '')));
    }
    const websiteLine = cfg.show_website && businessInfo?.website ? escapeHtml(businessInfo.website) : '';
    if (!socialParts.length && !websiteLine) return '';
    return `<div style="margin-top:12px;padding-top:8px;border-top:1px solid ${borderColor};text-align:center;font-size:10px;color:#aaa;">
      ${socialParts.length ? `<p style="margin:2px 0;">${socialParts.join(' &middot; ')}</p>` : ''}
      ${websiteLine ? `<p style="margin:2px 0;">${websiteLine}</p>` : ''}
    </div>`;
  })()}
  ${cfg.show_footer_icon && businessInfo?.iconUrl ? `<div style="text-align:center;margin-top:12px;"><img src="${escapeHtml(businessInfo.iconUrl)}" alt="" style="height:${iconHeight};object-fit:contain;opacity:0.4;" /></div>` : ''}
</body>
</html>`;
}

/**
 * Print a receipt in a new browser window.
 * Accepts ReceiptData directly.
 */
export function printReceiptFromData(
  data: ReceiptData,
  formatCurrency: (n: number) => string,
  orgName = 'Salon',
  receiptConfig?: ReceiptConfig,
  businessInfo?: ReceiptBusinessInfo,
  redoPolicyFallback?: string,
) {
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) {
    toast.error('Popup blocked — please allow popups for this site to print receipts.');
    return;
  }

  const html = buildReceiptHtml(data, formatCurrency, orgName, receiptConfig, businessInfo, redoPolicyFallback);
  const printHtml = html.replace('</body>', '<script>window.onload = function() { window.print(); }</script>\n</body>');

  win.document.write(printHtml);
  win.document.close();
}

/**
 * Legacy API: print receipt from GroupedTransaction.
 * Adapts to the new ReceiptData interface internally.
 */
export function printReceipt(
  transaction: GroupedTransaction,
  formatCurrency: (n: number) => string,
  orgName = 'Salon',
  receiptConfig?: ReceiptConfig,
  businessInfo?: ReceiptBusinessInfo,
  redoPolicyFallback?: string,
  afterpaySurchargeAmount?: number | null,
) {
  const data = groupedTransactionToReceiptData(transaction, afterpaySurchargeAmount);
  printReceiptFromData(data, formatCurrency, orgName, receiptConfig, businessInfo, redoPolicyFallback);
}
