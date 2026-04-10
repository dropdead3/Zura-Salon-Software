import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';
import type { GroupedTransaction } from '@/hooks/useGroupedTransactions';

interface ReceiptPrintViewProps {
  transaction: GroupedTransaction;
  orgName?: string;
}

export function printReceipt(transaction: GroupedTransaction, formatCurrency: (n: number) => string, orgName = 'Salon') {
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return;

  const date = new Date(transaction.transactionDate);
  const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const itemsHtml = transaction.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 4px 0; font-size: 13px;">${item.itemName}</td>
        <td style="padding: 4px 0; font-size: 13px; text-align: center;">${item.quantity}</td>
        <td style="padding: 4px 0; font-size: 13px; text-align: right;">${formatCurrency(item.totalAmount)}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Receipt - ${transaction.transactionId}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 24px; max-width: 360px; margin: 0 auto; color: #1a1a1a; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e5e5; }
    .header h1 { font-size: 18px; font-weight: 500; margin: 0 0 4px; letter-spacing: 0.05em; text-transform: uppercase; }
    .header p { font-size: 12px; color: #888; margin: 2px 0; }
    .meta { font-size: 12px; color: #666; margin-bottom: 16px; }
    .meta div { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; }
    thead th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; padding-bottom: 6px; border-bottom: 1px solid #e5e5e5; text-align: left; }
    thead th:last-child { text-align: right; }
    thead th:nth-child(2) { text-align: center; }
    tbody { border-bottom: 1px solid #e5e5e5; }
    .totals { margin-top: 12px; }
    .totals div { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
    .totals .grand { font-weight: 500; font-size: 16px; padding-top: 8px; border-top: 1px solid #e5e5e5; margin-top: 6px; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #aaa; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${orgName}</h1>
    <p>${dateStr} at ${timeStr}</p>
  </div>
  <div class="meta">
    <div><strong>Client:</strong> ${transaction.clientName || 'Walk-in'}</div>
    ${transaction.stylistName ? `<div><strong>Stylist:</strong> ${transaction.stylistName}</div>` : ''}
    ${transaction.paymentMethod ? `<div><strong>Payment:</strong> ${transaction.paymentMethod}</div>` : ''}
    <div><strong>Transaction:</strong> ${transaction.transactionId.slice(0, 12)}…</div>
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
  <div class="footer">Thank you for your visit!</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}
