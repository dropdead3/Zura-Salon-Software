import type { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export interface ReportLocationInfo {
  name: string;
  address?: string;
  storeNumber?: string | null;
}

export interface LogoDataResult {
  dataUrl: string;
  /** Natural width in pixels */
  width: number;
  /** Natural height in pixels */
  height: number;
}

export interface ReportHeaderOptions {
  orgName: string;
  /** Data URL (e.g. from fetchLogoAsDataUrl) to embed logo in PDF */
  logoDataUrl?: string | null;
  /** Pre-computed logo dimensions from fetchLogoAsDataUrl */
  logoDimensions?: { width: number; height: number } | null;
  reportTitle: string;
  dateFrom: string;
  dateTo: string;
  /** Optional; defaults to now */
  generatedAt?: Date;
  /** Optional location details rendered below org name */
  locationInfo?: ReportLocationInfo;
}

const HEADER_TOP = 10;
const LOGO_MAX_WIDTH_MM = 28;
const LOGO_MAX_HEIGHT_MM = 10;
const ACCENT_COLOR: [number, number, number] = [41, 41, 41]; // charcoal
const FOOTER_FONT_SIZE = 7;
const FOOTER_BOTTOM = 8;

/** Body content should start below this Y to avoid overlapping the header on any page. */
export const REPORT_BODY_START_Y = 48;

function getImageFormatFromDataUrl(dataUrl: string): 'PNG' | 'JPEG' {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  return 'PNG';
}

/**
 * Convert a Blob to a data URL via FileReader.
 */
function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Rasterize an SVG data URL to a PNG data URL via canvas.
 * jsPDF cannot embed SVGs, so this converts them to raster format.
 */
function rasterizeSvgToPng(svgDataUrl: string, maxW: number, maxH: number): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const natW = img.naturalWidth || maxW;
      const natH = img.naturalHeight || maxH;
      const scale = Math.min(maxW / natW, maxH / natH, 1);
      const w = Math.round(natW * scale);
      const h = Math.round(natH * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: w, height: h });
    };
    img.onerror = () => resolve(null);
    img.src = svgDataUrl;
  });
}

/**
 * Load an image data URL and return its natural pixel dimensions.
 */
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Fetches an image URL and returns a raster data URL for embedding in jsPDF.
 * SVGs are automatically rasterized to PNG via canvas.
 * Returns null on CORS or network errors so reports still generate without logo.
 */
export async function fetchLogoAsDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const rawDataUrl = await blobToDataUrl(blob);
    if (!rawDataUrl) return null;

    // SVGs must be rasterized — jsPDF cannot embed SVG directly
    if (blob.type === 'image/svg+xml' || rawDataUrl.startsWith('data:image/svg')) {
      return await rasterizeSvgToPng(rawDataUrl, 400, 140);
    }
    return rawDataUrl;
  } catch {
    return null;
  }
}

/**
 * Adds a branded header to each page:
 *   Logo (left) | Org name + Report title (beside logo) | Date range (right-aligned)
 *   Charcoal accent divider line
 *
 * Returns the Y position after the header (use as startY for body content).
 */
export function addReportHeader(
  doc: jsPDF,
  opts: ReportHeaderOptions,
): number {
  const generatedAt = opts.generatedAt ?? new Date();
  const pageWidth = (doc as unknown as { internal: { pageSize: { getWidth: () => number } } }).internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  let textStartX = marginLeft;

  // Reset styles
  doc.setTextColor(0, 0, 0);

  // ── Logo ──
  if (opts.logoDataUrl) {
    const imageFormat = getImageFormatFromDataUrl(opts.logoDataUrl);
    try {
      doc.addImage(
        opts.logoDataUrl,
        imageFormat,
        marginLeft,
        HEADER_TOP,
        LOGO_MAX_WIDTH,
        LOGO_MAX_HEIGHT,
        undefined,
        'FAST',
      );
      textStartX = marginLeft + LOGO_MAX_WIDTH + 4;
    } catch {
      // Skip logo on error
    }
  }

  // ── Org name (small, muted, above title) ──
  let y = HEADER_TOP + 4;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text(opts.orgName, textStartX, y);

  // ── Location info (compact, muted, below org name) ──
  if (opts.locationInfo) {
    y += 4;
    const parts: string[] = [opts.locationInfo.name];
    if (opts.locationInfo.storeNumber) parts.push(`#${opts.locationInfo.storeNumber}`);
    if (opts.locationInfo.address) parts.push(opts.locationInfo.address);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(parts.join(' · '), textStartX, y);
  }

  // ── Report title (large, bold) ──
  y += 7;
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.reportTitle, textStartX, y);

  // ── Date range + generated timestamp (right-aligned) ──
  const dateRange = `${format(new Date(opts.dateFrom), 'MMM d, yyyy')} – ${format(new Date(opts.dateTo), 'MMM d, yyyy')}`;
  const generatedText = `Generated ${format(generatedAt, 'MMM d, yyyy · h:mm a')}`;

  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.setFont('helvetica', 'normal');
  doc.text(dateRange, pageWidth - marginRight, HEADER_TOP + 4, { align: 'right' });
  doc.text(generatedText, pageWidth - marginRight, HEADER_TOP + 9, { align: 'right' });

  // ── Accent divider ──
  const bodyStartY = opts.locationInfo ? REPORT_BODY_START_Y + 4 : REPORT_BODY_START_Y;
  const dividerY = bodyStartY - 6;
  doc.setDrawColor(...ACCENT_COLOR);
  doc.setLineWidth(0.6);
  doc.line(marginLeft, dividerY, pageWidth - marginRight, dividerY);
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);

  // Reset text color
  doc.setTextColor(0, 0, 0);
  return bodyStartY;
}

/**
 * Common jsPDF-AutoTable settings for branded reports:
 * - Reserves header space on each page
 * - Redraws header on each page
 */
export function getReportAutoTableBranding(doc: jsPDF, opts: ReportHeaderOptions): {
  margin: { top: number };
  didDrawPage: () => void;
} {
  const topMargin = opts.locationInfo ? REPORT_BODY_START_Y + 4 : REPORT_BODY_START_Y;
  return {
    margin: { top: topMargin },
    didDrawPage: () => addReportHeader(doc, opts),
  };
}

/**
 * Adds footer to every page:
 *   Left: org name (muted)
 *   Center: "Page n of N"
 * Call after all body content is added (so page count is final).
 */
export function addReportFooter(doc: jsPDF, orgName?: string): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = (doc as unknown as { internal: { pageSize: { getWidth: () => number } } }).internal.pageSize.getWidth();
  const pageHeight = (doc as unknown as { internal: { pageSize: { getHeight: () => number } } }).internal.pageSize.getHeight();
  doc.setFontSize(FOOTER_FONT_SIZE);
  doc.setFont('helvetica', 'normal');

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Org name on the left
    if (orgName) {
      doc.setTextColor(170, 170, 170);
      doc.text(orgName, 14, pageHeight - FOOTER_BOTTOM);
    }

    // Page number centered
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - FOOTER_BOTTOM,
      { align: 'center' },
    );
  }
  doc.setTextColor(0, 0, 0);
}
