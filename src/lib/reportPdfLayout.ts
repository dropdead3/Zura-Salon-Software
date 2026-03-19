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
  /** Logo result from fetchLogoAsDataUrl, or raw data URL string for backward compat */
  logoDataUrl?: LogoDataResult | string | null;
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
const ACCENT_COLOR: [number, number, number] = [41, 41, 41];
const FOOTER_FONT_SIZE = 7;
const FOOTER_BOTTOM = 8;

/** Body content should start below this Y to avoid overlapping the header on any page. */
export const REPORT_BODY_START_Y = 48;

function getImageFormatFromDataUrl(dataUrl: string): 'PNG' | 'JPEG' {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  return 'PNG';
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

function rasterizeSvgToPng(svgDataUrl: string, maxW: number, maxH: number): Promise<LogoDataResult | null> {
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

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Fetches an image URL and returns a raster data URL + dimensions for embedding in jsPDF.
 * SVGs are automatically rasterized to PNG via canvas.
 * Returns null on CORS or network errors so reports still generate without logo.
 */
export async function fetchLogoAsDataUrl(url: string | null | undefined): Promise<LogoDataResult | null> {
  if (!url || typeof url !== 'string') return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const rawDataUrl = await blobToDataUrl(blob);
    if (!rawDataUrl) return null;

    if (blob.type === 'image/svg+xml' || rawDataUrl.startsWith('data:image/svg')) {
      return await rasterizeSvgToPng(rawDataUrl, 400, 140);
    }

    const dims = await getImageDimensions(rawDataUrl);
    if (!dims) return { dataUrl: rawDataUrl, width: 200, height: 70 };
    return { dataUrl: rawDataUrl, width: dims.width, height: dims.height };
  } catch {
    return null;
  }
}

/** Extract the data URL string and pixel dimensions from the logoDataUrl option */
function resolveLogoData(logo: ReportHeaderOptions['logoDataUrl']): { dataUrl: string; pxW: number; pxH: number } | null {
  if (!logo) return null;
  if (typeof logo === 'string') return { dataUrl: logo, pxW: 200, pxH: 70 };
  return { dataUrl: logo.dataUrl, pxW: logo.width, pxH: logo.height };
}

/**
 * Adds a branded header to each page:
 *   [small logo, aspect-ratio preserved]
 *   Org name
 *   Location (if provided)
 *   Report title
 *   Date range + generated timestamp (right-aligned)
 *   Charcoal accent divider
 *
 * Returns the Y position after the header.
 */
export function addReportHeader(
  doc: jsPDF,
  opts: ReportHeaderOptions,
): number {
  const generatedAt = opts.generatedAt ?? new Date();
  const pageWidth = (doc as unknown as { internal: { pageSize: { getWidth: () => number } } }).internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;

  doc.setTextColor(0, 0, 0);

  let y = HEADER_TOP;

  // ── Logo (top-left, small, aspect-ratio preserved) ──
  const logoData = resolveLogoData(opts.logoDataUrl);
  if (logoData) {
    const imageFormat = getImageFormatFromDataUrl(logoData.dataUrl);
    try {
      const scale = Math.min(LOGO_MAX_WIDTH_MM / logoData.pxW, LOGO_MAX_HEIGHT_MM / logoData.pxH, 1);
      const logoW = logoData.pxW * scale;
      const logoH = logoData.pxH * scale;
      doc.addImage(
        logoData.dataUrl,
        imageFormat,
        marginLeft,
        y,
        logoW,
        logoH,
        undefined,
        'FAST',
      );
      y += logoH + 2;
    } catch {
      // Skip logo on error
    }
  }

  // ── Org name (small, muted) ──
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text(opts.orgName, marginLeft, y + 3);
  y += 7;

  // ── Location info (compact, muted, below org name) ──
  if (opts.locationInfo) {
    const parts: string[] = [opts.locationInfo.name];
    if (opts.locationInfo.storeNumber) parts.push(`#${opts.locationInfo.storeNumber}`);
    if (opts.locationInfo.address) parts.push(opts.locationInfo.address);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(parts.join(' · '), marginLeft, y);
    y += 5;
  }

  // ── Report title (large, bold) ──
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.reportTitle, marginLeft, y + 2);

  // ── Date range + generated timestamp (right-aligned, top area) ──
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

  doc.setTextColor(0, 0, 0);
  return bodyStartY;
}

/**
 * Common jsPDF-AutoTable settings for branded reports.
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
 * Adds footer to every page.
 */
export function addReportFooter(doc: jsPDF, orgName?: string): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = (doc as unknown as { internal: { pageSize: { getWidth: () => number } } }).internal.pageSize.getWidth();
  const pageHeight = (doc as unknown as { internal: { pageSize: { getHeight: () => number } } }).internal.pageSize.getHeight();
  doc.setFontSize(FOOTER_FONT_SIZE);
  doc.setFont('helvetica', 'normal');

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    if (orgName) {
      doc.setTextColor(170, 170, 170);
      doc.text(orgName, 14, pageHeight - FOOTER_BOTTOM);
    }
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
