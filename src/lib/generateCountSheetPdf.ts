/**
 * Generates a printable physical count sheet PDF.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import {
  addReportHeader,
  addReportFooter,
  getReportAutoTableBranding,
  buildReportFileName,
  type ReportHeaderOptions,
  type LogoDataResult,
} from '@/lib/reportPdfLayout';

export interface CountSheetProduct {
  name: string;
  brand: string | null;
  sku: string | null;
  category: string | null;
  quantity_on_hand: number;
}

export interface CountSheetFilters {
  brands?: string[];
  categories?: string[];
}

export interface GenerateCountSheetOptions {
  products: CountSheetProduct[];
  orgName: string;
  locationName?: string;
  logoDataUrl?: string | LogoDataResult | null;
  filters?: CountSheetFilters;
  /** Full URL to include as scannable QR code on the sheet */
  countEntryUrl?: string;
  /** When true, return PDF bytes instead of triggering download */
  returnBytes?: boolean;
}

/**
 * Generate a real scannable QR code as a data URL using the `qrcode` library.
 */
async function generateQRDataUrl(text: string, size: number = 200): Promise<string | null> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: { dark: '#282828', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch {
    return null;
  }
}

export async function generateCountSheetPdf({
  products,
  orgName,
  locationName,
  logoDataUrl,
  filters,
  countEntryUrl,
  returnBytes,
}: GenerateCountSheetOptions): Promise<ArrayBuffer | void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const today = format(new Date(), 'yyyy-MM-dd');

  // Apply filters
  let filtered = [...products];
  if (filters?.brands && filters.brands.length > 0) {
    const brandSet = new Set(filters.brands.map(b => b.toLowerCase()));
    filtered = filtered.filter(p => p.brand && brandSet.has(p.brand.toLowerCase()));
  }
  if (filters?.categories && filters.categories.length > 0) {
    const catSet = new Set(filters.categories.map(c => c.toLowerCase()));
    filtered = filtered.filter(p => p.category && catSet.has(p.category.toLowerCase()));
  }

  // Build subtitle showing active filters
  const filterParts: string[] = [];
  if (filters?.brands?.length) filterParts.push(`Brands: ${filters.brands.join(', ')}`);
  if (filters?.categories?.length) filterParts.push(`Categories: ${filters.categories.join(', ')}`);

  const headerOpts: ReportHeaderOptions = {
    orgName,
    logoDataUrl,
    reportTitle: 'Physical Count Sheet',
    dateFrom: today,
    dateTo: today,
    generatedAt: new Date(),
  };

  const startY = addReportHeader(doc, headerOpts);

  let bodyStartY = startY;

  // Location line
  if (locationName) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Location: ${locationName}`, 14, bodyStartY);
    bodyStartY += 5;
  }

  // Filter description line
  if (filterParts.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.text(`Filtered by: ${filterParts.join(' | ')}`, 14, bodyStartY);
    bodyStartY += 5;
  }

  // Scannable QR code with link to digital entry
  if (countEntryUrl) {
    const pageWidth = (doc as any).internal.pageSize.getWidth();
    const qrSize = 22;
    const qrX = pageWidth - 14 - qrSize;
    const qrY = startY - 10;

    // Generate real scannable QR code
    const qrDataUrl = await generateQRDataUrl(countEntryUrl, 300);

    if (qrDataUrl) {
      // Draw background container
      doc.setDrawColor(200);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 12, 2, 2, 'FD');

      // Embed the real QR code image
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // Label below QR
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('Scan to enter', qrX + qrSize / 2, qrY + qrSize + 4, { align: 'center' });
      doc.text('counts digitally', qrX + qrSize / 2, qrY + qrSize + 7, { align: 'center' });

      // Clickable link annotation over the QR area
      doc.link(qrX - 2, qrY - 2, qrSize + 4, qrSize + 12, { url: countEntryUrl });
    }
  }

  // Product count summary
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`${filtered.length} product${filtered.length !== 1 ? 's' : ''} to count`, 14, bodyStartY);
  bodyStartY += 4;

  // Sort products by brand then name
  const sorted = filtered.sort((a, b) => {
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

  if (returnBytes) {
    return doc.output('arraybuffer');
  }
  doc.save(buildReportFileName({ orgName, locationName, reportSlug: 'count-sheet', dateFrom: today }));
}
