import type { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export interface ReportLocationInfo {
  name: string;
  address?: string;
  storeNumber?: string | null;
}

export interface ReportHeaderOptions {
  orgName: string;
  /** Data URL (e.g. from fetchLogoAsDataUrl) to embed logo in PDF */
  logoDataUrl?: string | null;
  reportTitle: string;
  dateFrom: string;
  dateTo: string;
  /** Optional; defaults to now */
  generatedAt?: Date;
  /** Optional location details rendered below org name */
  locationInfo?: ReportLocationInfo;
}

const HEADER_TOP = 12;
const LOGO_MAX_WIDTH = 40;
const LOGO_MAX_HEIGHT = 14;
const ACCENT_COLOR: [number, number, number] = [41, 41, 41]; // charcoal
const FOOTER_FONT_SIZE = 7;
const FOOTER_BOTTOM = 8;

/** Body content should start below this Y to avoid overlapping the header on any page. */
export const REPORT_BODY_START_Y = 48;

function getImageFormatFromDataUrl(dataUrl: string): 'PNG' | 'JPEG' | undefined {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  return undefined;
}

/**
 * Get the natural dimensions of an image from its data URL so we can
 * scale proportionally within max bounds.
 */
function getScaledLogoDimensions(
  dataUrl: string,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  // We can't use Image() in a non-browser context (SSR / edge), so
  // fall back to max bounds. In the browser, jsPDF will render fine.
  // For proportional scaling we parse the image header if possible.
  // Since jsPDF handles aspect ratio poorly, we just cap to max dims.
  return { w: maxW, h: maxH };
}

/**
 * Fetches an image URL and returns a data URL for embedding in jsPDF.
 * Returns null on CORS or network errors so reports still generate without logo.
 */
export async function fetchLogoAsDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
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
    const imageFormat = getImageFormatFromDataUrl(opts.logoDataUrl) ?? 'PNG';
    const { w, h } = getScaledLogoDimensions(opts.logoDataUrl, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
    try {
      doc.addImage(
        opts.logoDataUrl,
        imageFormat,
        marginLeft,
        HEADER_TOP,
        w,
        h,
        undefined,
        'FAST',
      );
      textStartX = marginLeft + w + 4;
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
  return {
    margin: { top: REPORT_BODY_START_Y },
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
