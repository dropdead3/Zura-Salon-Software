/**
 * PDF Export for Stylist Level Graduation Requirements.
 * Portrait A4, card-based layout matching the digital LevelRoadmapView.
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { registerPdfFonts, setTermina, setAeonik } from '@/lib/pdf-fonts';
import type { LevelPromotionCriteria } from '@/hooks/useLevelPromotionCriteria';
import type { LevelRetentionCriteria } from '@/hooks/useLevelRetentionCriteria';

interface LevelInfo {
  label: string;
  slug: string;
  dbId?: string;
  index: number;
  isConfigured?: boolean;
}

interface LevelCommission {
  dbId?: string;
  serviceCommissionRate: number;
  retailCommissionRate: number;
  hourlyWageEnabled?: boolean;
  hourlyWage?: number | null;
}

export interface LevelRequirementsPDFOptions {
  orgName: string;
  levels: LevelInfo[];
  criteria: LevelPromotionCriteria[];
  retentionCriteria?: LevelRetentionCriteria[];
  logoDataUrl?: string;
  commissions?: LevelCommission[];
}

// Color stops matching level-colors.ts (stone → amber → gold)
const BG_HEX_STOPS = ['#f5f5f4', '#e7e5e4', '#fef3c7', '#fde68a', '#fcd34d', '#f59e0b'];

function getLevelHex(index: number, total: number): string {
  if (total <= 1) return BG_HEX_STOPS[BG_HEX_STOPS.length - 1];
  const ratio = index / (total - 1);
  const idx = Math.round(ratio * (BG_HEX_STOPS.length - 1));
  return BG_HEX_STOPS[Math.min(idx, BG_HEX_STOPS.length - 1)];
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const MARGIN = 18;
const PAGE_BOTTOM_MARGIN = 22;

/** jsPDF.getTextWidth() ignores charSpace — this returns the true rendered width */
function textWidthWithCharSpace(doc: jsPDF, text: string, charSpace: number): number {
  return doc.getTextWidth(text) + charSpace * Math.max(0, text.length - 1);
}

function fmtCurrency(v: number): string {
  return v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - PAGE_BOTTOM_MARGIN) {
    doc.addPage();
    return 22;
  }
  return y;
}

function drawRoundedRect(
  doc: jsPDF,
  x: number, y: number, w: number, h: number, r: number,
  opts: { fill?: [number, number, number]; stroke?: [number, number, number]; lineWidth?: number }
) {
  if (opts.lineWidth) doc.setLineWidth(opts.lineWidth);
  if (opts.stroke) doc.setDrawColor(...opts.stroke);
  if (opts.fill) doc.setFillColor(...opts.fill);

  const mode = opts.fill && opts.stroke ? 'FD' : opts.fill ? 'F' : 'D';
  doc.roundedRect(x, y, w, h, r, r, mode);
}

export function generateLevelRequirementsPDF(options: LevelRequirementsPDFOptions): jsPDF {
  const { orgName, levels, criteria, retentionCriteria = [], commissions = [] } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const hasFonts = registerPdfFonts(doc);
  const F_DISPLAY = hasFonts ? 'Termina' : 'helvetica';
  const F_BODY = hasFonts ? 'AeonikPro' : 'helvetica';
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const now = new Date();

  const getPromo = (dbId?: string) => criteria.find(c => c.stylist_level_id === dbId && c.is_active);
  const getRetention = (dbId?: string) => retentionCriteria.find(r => r.stylist_level_id === dbId && r.is_active);

  // ─── Centered Header (matching digital preview) ───
  let y = 22;

  doc.setTextColor(30, 30, 30);
  doc.setFont(F_DISPLAY, 'normal');
  doc.setFontSize(18);
  const orgNameUpper = orgName.toUpperCase();
  doc.text(orgNameUpper, pageWidth / 2, y, { align: 'center', charSpace: 1.8 });

  y += 8;
  doc.setTextColor(160, 160, 160);
  doc.setFont(F_DISPLAY, 'normal');
  doc.setFontSize(7);
  doc.text('LEVEL GRADUATION ROADMAP', pageWidth / 2, y, { align: 'center', charSpace: 2.5 });

  y += 6;
  doc.setTextColor(180, 180, 180);
  doc.setFont(F_BODY, 'normal');
  doc.setFontSize(7);
  doc.text(`Generated ${format(now, 'MMMM d, yyyy')}`, pageWidth / 2, y, { align: 'center' });

  y += 10;

  // Thin separator line
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 40, y, pageWidth - MARGIN - 40, y);

  y += 10;

  // ─── Timeline ───
  if (levels.length > 1) {
    const timelineH = 36;
    y = ensureSpace(doc, y, timelineH);

    const isCompact = levels.length > 10;
    const nodeR = isCompact ? 5 : 7;
    const totalNodes = levels.length;
    const usableW = contentWidth - nodeR * 2;
    const spacing = Math.min(usableW / (totalNodes - 1), 42);
    const totalTimelineW = spacing * (totalNodes - 1);
    const startX = MARGIN + (contentWidth - totalTimelineW) / 2;
    const nodeY = y + 12;

    // Connector line — thicker
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.8);
    doc.line(startX, nodeY, startX + totalTimelineW, nodeY);

    levels.forEach((level, i) => {
      const cx = startX + spacing * i;
      const bgHex = getLevelHex(i, totalNodes);
      const rgb = hexToRgb(bgHex);
      const isConfigured = level.isConfigured ?? (criteria.some(c => c.stylist_level_id === level.dbId && c.is_active) || i === 0);

      // Outer ring for configured levels
      if (isConfigured) {
        doc.setDrawColor(52, 211, 153); // emerald-400
        doc.setLineWidth(0.6);
        doc.circle(cx, nodeY, nodeR + 1.5, 'D');
      } else {
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.5);
        doc.circle(cx, nodeY, nodeR + 1.5, 'D');
      }

      // Inner filled circle
      doc.setFillColor(...rgb);
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.8);
      doc.circle(cx, nodeY, nodeR, 'FD');

      // Level number
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isCompact ? 7 : 9);
      doc.text(`${i + 1}`, cx, nodeY + (isCompact ? 0.8 : 1), { align: 'center' });

      // Status dot
      const dotR = 2;
      const dotX = cx + nodeR * 0.65;
      const dotY = nodeY + nodeR * 0.65;
      if (isConfigured) {
        doc.setFillColor(16, 185, 129);
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.circle(dotX, dotY, dotR, 'FD');
        // checkmark
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.line(dotX - 0.8, dotY, dotX - 0.2, dotY + 0.6);
        doc.line(dotX - 0.2, dotY + 0.6, dotX + 0.8, dotY - 0.5);
      } else {
        doc.setFillColor(251, 191, 36);
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.circle(dotX, dotY, dotR, 'FD');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.text('!', dotX, dotY + 0.6, { align: 'center' });
      }

      // Chevron between nodes
      if (i < levels.length - 1) {
        const nextCx = cx + spacing;
        const midX = (cx + nextCx) / 2;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.4);
        doc.line(midX - 1, nodeY - 1.2, midX + 0.5, nodeY);
        doc.line(midX + 0.5, nodeY, midX - 1, nodeY + 1.2);
      }

      // Level name below
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(isCompact ? 5 : 6);
      const maxLabelW = spacing * 0.9;
      const maxChars = isCompact ? 8 : 14;
      const labelText = level.label.length > maxChars ? level.label.slice(0, maxChars - 1) + '…' : level.label;
      doc.text(labelText.toUpperCase(), cx, nodeY + nodeR + 6, { align: 'center', maxWidth: maxLabelW, charSpace: 0.3 });

      // Status text
      doc.setFontSize(4.5);
      doc.setTextColor(isConfigured ? 16 : 200, isConfigured ? 185 : 150, isConfigured ? 129 : 0);
      doc.text(isConfigured ? 'Configured' : 'Setup Incomplete', cx, nodeY + nodeR + 10, { align: 'center' });
    });

    y = nodeY + nodeR + 16;
  }

  // ─── Summary Stats (matching digital's centered card style) ───
  y = ensureSpace(doc, y, 26);
  const configuredCount = levels.filter(l => l.isConfigured ?? (criteria.some(c => c.stylist_level_id === l.dbId && c.is_active) || l.index === 0)).length;
  const retentionCount = retentionCriteria.filter(r => r.is_active).length;

  const statsData = [
    { label: 'Total Levels', value: `${levels.length}` },
    { label: 'Configured', value: `${Math.min(configuredCount, levels.length)}/${levels.length}` },
    { label: 'Retention Rules', value: `${retentionCount}` },
  ];

  const statGap = 5;
  const statBoxW = (contentWidth - statGap * 2) / 3;
  const statBoxH = 22;
  statsData.forEach((stat, i) => {
    const bx = MARGIN + i * (statBoxW + statGap);
    drawRoundedRect(doc, bx, y, statBoxW, statBoxH, 2.5, { fill: [250, 250, 252], stroke: [225, 225, 225], lineWidth: 0.3 });
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(stat.value, bx + statBoxW / 2, y + 12, { align: 'center', charSpace: 0.5 });
    doc.setTextColor(140, 140, 140);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(stat.label, bx + statBoxW / 2, y + 18, { align: 'center' });
  });

  y += statBoxH + 10;

  // ─── Per-level detail cards ───
  levels.forEach((level, i) => {
    const promo = getPromo(level.dbId);
    const retention = getRetention(level.dbId);
    const commission = commissions.find(cm => cm.dbId === level.dbId);
    const isBase = i === 0;
    const isTop = i === levels.length - 1;
    const isConfigured = level.isConfigured ?? (level.index === 0 || !!promo);
    const bgHex = getLevelHex(i, levels.length);
    const accentRgb = hexToRgb(bgHex);

    // Gather KPIs
    const kpis: { label: string; value: string }[] = [];
    if (isBase && retention) {
      if (retention.revenue_enabled && retention.revenue_minimum > 0) kpis.push({ label: 'Revenue', value: fmtCurrency(retention.revenue_minimum) });
      if (retention.retail_enabled && retention.retail_pct_minimum > 0) kpis.push({ label: 'Retail %', value: `${retention.retail_pct_minimum}%` });
      if (retention.rebooking_enabled && retention.rebooking_pct_minimum > 0) kpis.push({ label: 'Rebooking %', value: `${retention.rebooking_pct_minimum}%` });
      if (retention.avg_ticket_enabled && retention.avg_ticket_minimum > 0) kpis.push({ label: 'Avg Ticket', value: `$${retention.avg_ticket_minimum}` });
      if (retention.retention_rate_enabled && Number(retention.retention_rate_minimum) > 0) kpis.push({ label: 'Client Retention', value: `${retention.retention_rate_minimum}%` });
      if (retention.new_clients_enabled && Number(retention.new_clients_minimum) > 0) kpis.push({ label: 'New Clients', value: `${retention.new_clients_minimum}/mo` });
      if (retention.utilization_enabled && Number(retention.utilization_minimum) > 0) kpis.push({ label: 'Utilization', value: `${retention.utilization_minimum}%` });
      if (retention.rev_per_hour_enabled && Number(retention.rev_per_hour_minimum) > 0) kpis.push({ label: 'Rev/Hr', value: `$${retention.rev_per_hour_minimum}` });
    } else if (promo) {
      if (promo.revenue_enabled && promo.revenue_threshold > 0) kpis.push({ label: 'Revenue', value: fmtCurrency(promo.revenue_threshold) });
      if (promo.retail_enabled && promo.retail_pct_threshold > 0) kpis.push({ label: 'Retail %', value: `${promo.retail_pct_threshold}%` });
      if (promo.rebooking_enabled && promo.rebooking_pct_threshold > 0) kpis.push({ label: 'Rebooking %', value: `${promo.rebooking_pct_threshold}%` });
      if (promo.avg_ticket_enabled && promo.avg_ticket_threshold > 0) kpis.push({ label: 'Avg Ticket', value: `$${promo.avg_ticket_threshold}` });
      if (promo.retention_rate_enabled && Number(promo.retention_rate_threshold) > 0) kpis.push({ label: 'Client Retention', value: `${promo.retention_rate_threshold}%` });
      if (promo.new_clients_enabled && Number(promo.new_clients_threshold) > 0) kpis.push({ label: 'New Clients', value: `${promo.new_clients_threshold}/mo` });
      if (promo.utilization_enabled && Number(promo.utilization_threshold) > 0) kpis.push({ label: 'Utilization', value: `${promo.utilization_threshold}%` });
      if (promo.rev_per_hour_enabled && Number(promo.rev_per_hour_threshold) > 0) kpis.push({ label: 'Rev/Hr', value: `$${promo.rev_per_hour_threshold}` });
    }

    // Estimate card height
    const innerPadX = 8;
    let cardH = 16; // accent bar + title row + top padding
    if (isBase) cardH += 5; // subtitle
    if (!isConfigured) cardH += 14; // incomplete warning box
    cardH += 16; // compensation section
    if (kpis.length > 0) {
      const kpiRows = Math.ceil(kpis.length / 4);
      cardH += 8 + kpiRows * (14 + 3) + 2; // cellH + gap per row + trailing space
    } else if (!isBase) {
      cardH += 10; // "No KPI requirements" message — matches actual draw
    } else {
      cardH += 4;
    }
    if (!isBase && promo) cardH += 12; // eval details
    if (retention?.retention_enabled) cardH += 16; // retention section
    cardH += 4; // bottom padding

    y = ensureSpace(doc, y, cardH);

    // Card background & border
    const borderColor: [number, number, number] = isConfigured ? [225, 225, 225] : [253, 224, 71];
    drawRoundedRect(doc, MARGIN, y, contentWidth, cardH, 3, { fill: [255, 255, 255], stroke: borderColor, lineWidth: 0.4 });
    if (!isConfigured) {
      // Amber tint background
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(MARGIN + 0.2, y + 0.2, contentWidth - 0.4, cardH - 0.4, 2.8, 2.8, 'F');
    }

    // Accent bar at top — thicker with rounded top
    const accentH = 2.5;
    doc.setFillColor(...accentRgb);
    // Draw accent bar clipped to card top corners
    doc.roundedRect(MARGIN + 0.2, y + 0.2, contentWidth - 0.4, accentH, 2.8, 2.8, 'F');
    // Fill below the rounded part to make it a proper bar
    doc.rect(MARGIN + 0.2, y + 1.5, contentWidth - 0.4, accentH - 1, 'F');

    let cy = y + accentH + 6;

    // Card title row
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const titleCharSpace = 0.3;
    const titleText = `LEVEL ${i + 1} — ${level.label.toUpperCase()}`;
    const maxTitleW = contentWidth - innerPadX * 2 - 45; // leave room for badge
    const titleRenderedW = textWidthWithCharSpace(doc, titleText, titleCharSpace);
    // Truncate if too wide
    let displayTitle = titleText;
    if (titleRenderedW > maxTitleW) {
      let truncated = titleText;
      while (truncated.length > 5 && textWidthWithCharSpace(doc, truncated + '…', titleCharSpace) > maxTitleW) {
        truncated = truncated.slice(0, -1);
      }
      displayTitle = truncated + '…';
    }
    doc.text(displayTitle, MARGIN + innerPadX, cy, { charSpace: titleCharSpace });

    // Status badge
    const actualTitleW = textWidthWithCharSpace(doc, displayTitle, titleCharSpace);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    const badgeText = isConfigured ? 'Configured' : 'Setup Incomplete';
    const badgeW = doc.getTextWidth(badgeText) + 7;
    const badgeX = MARGIN + innerPadX + actualTitleW + 5;
    const badgeY = cy - 3.5;

    if (isConfigured) {
      doc.setFillColor(209, 250, 229);
      doc.roundedRect(badgeX, badgeY, badgeW, 5, 1.5, 1.5, 'F');
      doc.setTextColor(21, 128, 61);
    } else {
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(badgeX, badgeY, badgeW, 5, 1.5, 1.5, 'F');
      doc.setTextColor(180, 83, 9);
    }
    doc.text(badgeText, badgeX + 3.5, cy - 0.8);

    if (isBase) {
      cy += 5;
      doc.setTextColor(140, 140, 140);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Entry Level — Retention Minimums', MARGIN + innerPadX, cy);
    }

    cy += 8;

    // ── Incomplete warning box (matching digital's amber callout) ──
    if (!isConfigured) {
      const warningH = 10;
      // Amber background
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(253, 230, 138);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN + innerPadX, cy, contentWidth - innerPadX * 2, warningH, 1.5, 1.5, 'FD');
      doc.setTextColor(180, 83, 9);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('This level has not been marked as configured. The data shown may be incomplete.', MARGIN + innerPadX + 3, cy + 6);
      cy += warningH + 4;
    }

    // ── Compensation Section ──
    doc.setTextColor(170, 170, 170);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('COMPENSATION', MARGIN + innerPadX, cy, { charSpace: 0.8 });
    cy += 5;

    const compParts: { label: string; value: string }[] = [];
    if (commission) {
      if (commission.serviceCommissionRate > 0) compParts.push({ label: 'SERVICE', value: `${commission.serviceCommissionRate}%` });
      if (commission.retailCommissionRate > 0) compParts.push({ label: 'RETAIL', value: `${commission.retailCommissionRate}%` });
      if (commission.hourlyWageEnabled && commission.hourlyWage) compParts.push({ label: 'HOURLY', value: `$${commission.hourlyWage}/hr` });
    }

    if (compParts.length > 0) {
      let compX = MARGIN + innerPadX;
      compParts.forEach((part, pi) => {
        // Label — no charSpace at small size
        doc.setTextColor(170, 170, 170);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text(part.label, compX, cy);
        const labelW = doc.getTextWidth(part.label) + 3; // 3mm gap
        // Value
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(part.value, compX + labelW, cy);
        const valueW = doc.getTextWidth(part.value);
        compX += labelW + valueW;

        // Dot separator
        if (pi < compParts.length - 1) {
          compX += 4;
          doc.setTextColor(200, 200, 200);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.text('·', compX, cy);
          compX += 5;
        }
      });
    } else {
      doc.setTextColor(180, 180, 180);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('No compensation configured', MARGIN + innerPadX, cy);
    }

    cy += 8;

    // ── KPI Requirements ──
    if (kpis.length > 0) {
      doc.setTextColor(170, 170, 170);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(isBase ? 'RETENTION MINIMUMS' : 'GRADUATION REQUIREMENTS', MARGIN + innerPadX, cy, { charSpace: 0.8 });
      cy += 5;

      const cols = 4;
      const cellGap = 3;
      const cellW = (contentWidth - innerPadX * 2 - cellGap * (cols - 1)) / cols;
      const cellH = 14;

      kpis.forEach((kpi, ki) => {
        const col = ki % cols;
        const row = Math.floor(ki / cols);
        const cellX = MARGIN + innerPadX + col * (cellW + cellGap);
        const ky = cy + row * (cellH + 3);

        drawRoundedRect(doc, cellX, ky, cellW, cellH, 2, { fill: [250, 250, 252], stroke: [238, 238, 240], lineWidth: 0.2 });

        // KPI label
        doc.setTextColor(160, 160, 160);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.text(kpi.label, cellX + 3.5, ky + 5);

        // KPI value
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(kpi.value, cellX + 3.5, ky + 11);
      });

      const kpiRows = Math.ceil(kpis.length / cols);
      cy += kpiRows * (cellH + 3) + 2;
    } else if (!isBase) {
      // Styled empty state box matching digital's bg-neutral-50 border-neutral-100 look
      const emptyBoxH = 10;
      drawRoundedRect(doc, MARGIN + innerPadX, cy, contentWidth - innerPadX * 2, emptyBoxH, 2, { fill: [250, 250, 252], stroke: [238, 238, 240], lineWidth: 0.2 });
      doc.setTextColor(170, 170, 170);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text('No KPI requirements configured for this level.', MARGIN + innerPadX + 4, cy + 6);
      cy += emptyBoxH + 2;
    } else {
      cy += 4;
    }

    // ── Evaluation details (dot-separated) ──
    if (!isBase && promo) {
      const evalParts: string[] = [];
      evalParts.push(`${promo.evaluation_window_days}d eval window`);
      if (promo.tenure_enabled && promo.tenure_days > 0 && !isTop) evalParts.push(`${promo.tenure_days}d tenure required`);
      evalParts.push(promo.requires_manual_approval ? 'Manual approval' : 'Auto-promote');

      doc.setTextColor(110, 110, 110);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      let evalX = MARGIN + innerPadX;
      evalParts.forEach((part, pi) => {
        // Small icon dot
        doc.setFillColor(180, 180, 180);
        doc.circle(evalX + 1.5, cy - 1, 0.8, 'F');
        doc.setTextColor(110, 110, 110);
        doc.text(part, evalX + 4, cy);
        evalX += doc.getTextWidth(part) + 10;
      });
      cy += 8;
    }

    // ── Retention policy ──
    if (retention?.retention_enabled) {
      doc.setTextColor(170, 170, 170);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('RETENTION POLICY', MARGIN + innerPadX, cy, { charSpace: 0.8 });
      cy += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const retParts = [
        `${retention.evaluation_window_days}d evaluation window`,
        `${retention.grace_period_days}d grace period`,
      ];
      const actionLabel = retention.action_type === 'demotion_eligible' ? 'Demotion eligible' : 'Coaching flag';
      const actionColor: [number, number, number] = retention.action_type === 'demotion_eligible' ? [220, 38, 38] : [217, 119, 6];

      // Neutral parts
      doc.setTextColor(110, 110, 110);
      const neutralText = retParts.join('   ·   ') + '   ·   ';
      doc.text(neutralText, MARGIN + innerPadX, cy);
      // Action type in color
      const neutralW = doc.getTextWidth(neutralText);
      doc.setTextColor(...actionColor);
      doc.setFont('helvetica', 'bold');
      doc.text(actionLabel, MARGIN + innerPadX + neutralW, cy);
    }

    y += cardH + 7;
  });

  // ─── Footer on every page (centered, lighter) ───
  const totalPages = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Separator line
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, pageH - 14, pageWidth - MARGIN, pageH - 14);

    doc.setFontSize(6);
    doc.setTextColor(180, 180, 180);
    doc.setFont('helvetica', 'normal');
    doc.text(`Confidential — For internal use only  ·  ${orgName}`, pageWidth / 2, pageH - 9, { align: 'center' });
    doc.text(`Page ${p} of ${totalPages}`, pageWidth / 2, pageH - 5, { align: 'center' });
  }

  return doc;
}
