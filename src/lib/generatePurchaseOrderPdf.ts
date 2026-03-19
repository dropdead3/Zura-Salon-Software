/**
 * Generates a Purchase Order PDF and returns it as a base64 string
 * for email attachment, or saves it directly.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  addReportHeader,
  addReportFooter,
  getReportAutoTableBranding,
  type ReportHeaderOptions,
  type LogoDataResult,
} from '@/lib/reportPdfLayout';

export interface POLineItem {
  productName: string;
  sku?: string | null;
  quantity: number;
  unitCost?: number | null;
  totalCost?: number | null;
}

export interface GeneratePOPdfOptions {
  orgName: string;
  supplierName: string;
  supplierEmail?: string;
  poNumber?: string;
  lines: POLineItem[];
  notes?: string;
  logoDataUrl?: string | LogoDataResult | null;
}

export interface POPdfResult {
  base64: string;
  fileName: string;
}

export function generatePurchaseOrderPdf(options: GeneratePOPdfOptions): POPdfResult {
  const { orgName, supplierName, supplierEmail, poNumber, lines, notes, logoDataUrl } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const today = format(new Date(), 'yyyy-MM-dd');

  const headerOpts: ReportHeaderOptions = {
    orgName,
    logoDataUrl,
    reportTitle: 'Purchase Order',
    dateFrom: today,
    dateTo: today,
    generatedAt: new Date(),
  };

  let startY = addReportHeader(doc, headerOpts);

  // Supplier info block
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`To: ${supplierName}`, 14, startY);
  startY += 5;
  if (supplierEmail) {
    doc.text(`Email: ${supplierEmail}`, 14, startY);
    startY += 5;
  }
  if (poNumber) {
    doc.text(`PO #: ${poNumber}`, 14, startY);
    startY += 5;
  }
  doc.text(`Date: ${format(new Date(), 'MMMM d, yyyy')}`, 14, startY);
  startY += 8;

  // Table
  const hasUnitCost = lines.some(l => l.unitCost != null);
  const head = ['#', 'Product', 'SKU', 'Qty'];
  if (hasUnitCost) head.push('Unit Cost', 'Line Total');

  const body = lines.map((line, i) => {
    const row: (string | number)[] = [
      i + 1,
      line.productName,
      line.sku || '—',
      line.quantity,
    ];
    if (hasUnitCost) {
      row.push(
        line.unitCost != null ? `$${line.unitCost.toFixed(2)}` : '—',
        line.totalCost != null ? `$${line.totalCost.toFixed(2)}` : '—'
      );
    }
    return row;
  });

  // Grand total row
  if (hasUnitCost) {
    const grandTotal = lines.reduce((s, l) => s + (l.totalCost ?? 0), 0);
    const totalRow: any[] = [
      { content: 'Total', colSpan: head.length - 1, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: `$${grandTotal.toFixed(2)}`, styles: { fontStyle: 'bold' } },
    ];
    body.push(totalRow as any);
  }

  const branding = getReportAutoTableBranding(doc, headerOpts);

  autoTable(doc, {
    startY,
    head: [head],
    body,
    margin: branding.margin,
    didDrawPage: branding.didDrawPage,
    theme: 'grid',
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
    },
  });

  // Notes
  if (notes) {
    const finalY = (doc as any).lastAutoTable?.finalY || startY + 40;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Notes: ${notes}`, 14, finalY + 8);
  }

  // Closing
  const closingY = (doc as any).lastAutoTable?.finalY || startY + 50;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text('Please confirm receipt and provide estimated delivery date.', 14, closingY + 16);
  doc.text(`Thank you, ${orgName}`, 14, closingY + 24);

  addReportFooter(doc);

  const fileName = buildReportFileName({ orgName, reportSlug: `PO-${supplierName.replace(/\s+/g, '-')}`, dateFrom: today });
  const base64 = doc.output('datauristring').split(',')[1];

  return { base64, fileName };
}

/** Save PO PDF directly (for local download) */
export function downloadPurchaseOrderPdf(options: GeneratePOPdfOptions): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const today = format(new Date(), 'yyyy-MM-dd');

  const headerOpts: ReportHeaderOptions = {
    orgName: options.orgName,
    logoDataUrl: options.logoDataUrl,
    reportTitle: 'Purchase Order',
    dateFrom: today,
    dateTo: today,
    generatedAt: new Date(),
  };

  // Re-use same layout logic
  const result = generatePurchaseOrderPdf(options);
  // For download, just regenerate and save
  const fileName = `PO_${options.supplierName.replace(/\s+/g, '_')}_${today}.pdf`;
  
  // Convert base64 back to blob and save
  const byteCharacters = atob(result.base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
