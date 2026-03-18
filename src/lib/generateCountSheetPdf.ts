/**
 * Generates a printable physical count sheet PDF.
 * Products grouped by brand, sorted alphabetically, with blank columns for actual counts.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  addReportHeader,
  addReportFooter,
  getReportAutoTableBranding,
  fetchLogoAsDataUrl,
  type ReportHeaderOptions,
} from '@/lib/reportPdfLayout';

export interface CountSheetProduct {
  name: string;
  brand: string | null;
  sku: string | null;
  quantity_on_hand: number;
}

export interface GenerateCountSheetOptions {
  products: CountSheetProduct[];
  orgName: string;
  locationName?: string;
  logoDataUrl?: string | null;
}

export function generateCountSheetPdf({
  products,
  orgName,
  locationName,
  logoDataUrl,
}: GenerateCountSheetOptions): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const today = format(new Date(), 'yyyy-MM-dd');

  const headerOpts: ReportHeaderOptions = {
    orgName,
    logoDataUrl,
    reportTitle: 'Physical Count Sheet',
    dateFrom: today,
    dateTo: today,
    generatedAt: new Date(),
  };

  const startY = addReportHeader(doc, headerOpts);

  // Add location line if available
  let bodyStartY = startY;
  if (locationName) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Location: ${locationName}`, 14, bodyStartY);
    bodyStartY += 6;
  }

  // Sort products by brand then name
  const sorted = [...products].sort((a, b) => {
    const brandA = (a.brand || 'zzz').toLowerCase();
    const brandB = (b.brand || 'zzz').toLowerCase();
    if (brandA !== brandB) return brandA.localeCompare(brandB);
    return a.name.localeCompare(b.name);
  });

  // Build table rows with brand group headers
  const tableBody: (string | number)[][] = [];
  let currentBrand = '';

  for (const product of sorted) {
    const brand = product.brand || 'Other';
    if (brand !== currentBrand) {
      // Brand group header row
      tableBody.push([{ content: brand, colSpan: 6, styles: { fontStyle: 'bold', fillColor: [245, 245, 245], textColor: [60, 60, 60] } } as any]);
      currentBrand = brand;
    }
    tableBody.push([
      product.name,
      product.sku || '—',
      String(product.quantity_on_hand),
      '', // Actual Qty (blank)
      '', // Variance (blank)
      '', // Notes (blank)
    ]);
  }

  const branding = getReportAutoTableBranding(doc, headerOpts);

  autoTable(doc, {
    startY: bodyStartY,
    head: [['Product Name', 'SKU', 'Expected Qty', 'Actual Qty', 'Variance', 'Notes']],
    body: tableBody,
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
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 25 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 'auto' },
    },
  });

  addReportFooter(doc);

  const fileName = `Count_Sheet_${locationName ? locationName.replace(/\s+/g, '_') + '_' : ''}${today}.pdf`;
  doc.save(fileName);
}
