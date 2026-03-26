/**
 * exportTransfersPdf — Generate a PDF report of stock transfer history.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { StockTransfer } from '@/hooks/useStockTransfers';

interface ExportOptions {
  transfers: StockTransfer[];
  locationMap: Record<string, string>;
  productMap: Record<string, { name: string; sku?: string }>;
  orgName?: string;
  linesMap?: Record<string, { product_id: string; quantity: number }[]>;
}

export function exportTransfersPdf({
  transfers,
  locationMap,
  productMap,
  orgName = 'Organization',
  linesMap = {},
}: ExportOptions) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const now = new Date();

  // Header
  doc.setFontSize(16);
  doc.text(`${orgName} — Transfer History`, 14, 18);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 14, 24);
  doc.setTextColor(0);

  // Build rows
  const rows = transfers.map(t => {
    const lines = linesMap[t.id];
    let productCol: string;
    let qtyCol: string;

    if (lines && lines.length > 0) {
      productCol = lines.map(l => productMap[l.product_id]?.name || 'Unknown').join(', ');
      qtyCol = lines.map(l => String(l.quantity)).join(', ');
    } else {
      productCol = productMap[t.product_id]?.name || 'Unknown';
      qtyCol = String(t.quantity);
    }

    return [
      new Date(t.created_at).toLocaleDateString(),
      locationMap[t.from_location_id] || 'Unknown',
      locationMap[t.to_location_id] || 'Unknown',
      productCol,
      qtyCol,
      t.status.charAt(0).toUpperCase() + t.status.slice(1),
      t.notes || '',
    ];
  });

  autoTable(doc, {
    startY: 30,
    head: [['Date', 'From', 'To', 'Product(s)', 'Qty', 'Status', 'Notes']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [40, 40, 40] },
    columnStyles: {
      4: { halign: 'right' },
    },
  });

  doc.save(`transfer-history-${now.toISOString().slice(0, 10)}.pdf`);
}
