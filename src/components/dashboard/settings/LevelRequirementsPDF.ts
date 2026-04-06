/**
 * PDF Export for Stylist Level Graduation Requirements.
 * Portrait A4, card-based layout matching the digital LevelRoadmapView.
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { LevelPromotionCriteria } from '@/hooks/useLevelPromotionCriteria';
import type { LevelRetentionCriteria } from '@/hooks/useLevelRetentionCriteria';

interface LevelInfo {
  label: string;
  slug: string;
  dbId?: string;
  index: number;
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

const MARGIN = 14;
const PAGE_BOTTOM_MARGIN = 20;

function fmtCurrency(v: number): string {
  return v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - PAGE_BOTTOM_MARGIN) {
    doc.addPage();
    return 20;
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
  const { orgName, levels, criteria, retentionCriteria = [], logoDataUrl, commissions = [] } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const now = new Date();

  const getPromo = (dbId?: string) => criteria.find(c => c.stylist_level_id === dbId && c.is_active);
  const getRetention = (dbId?: string) => retentionCriteria.find(r => r.stylist_level_id === dbId && r.is_active);

  // ─── Header bar ───
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pageWidth, 26, 'F');

  let titleX = MARGIN;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN, 3, 0, 10);
      titleX = MARGIN + 34;
    } catch { /* skip */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Level Graduation Roadmap', titleX, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(orgName, titleX, 18);
  doc.text(`Generated: ${format(now, 'MMM d, yyyy')}`, titleX, 23);
  doc.text(`${levels.length} Levels`, pageWidth - MARGIN, 18, { align: 'right' });

  let y = 34;

  // ─── Timeline ───
  if (levels.length > 1) {
    const timelineH = 32;
    y = ensureSpace(doc, y, timelineH);

    const nodeR = levels.length > 10 ? 5 : 7;
    const totalNodes = levels.length;
    const usableW = contentWidth - nodeR * 2;
    const spacing = Math.min(usableW / (totalNodes - 1), 40);
    const totalTimelineW = spacing * (totalNodes - 1);
    const startX = MARGIN + (contentWidth - totalTimelineW) / 2;
    const nodeY = y + 10;

    // Connector line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(startX, nodeY, startX + totalTimelineW, nodeY);

    levels.forEach((level, i) => {
      const cx = startX + spacing * i;
      const bgHex = getLevelHex(i, totalNodes);
      const rgb = hexToRgb(bgHex);
      const isConfigured = criteria.some(c => c.stylist_level_id === level.dbId && c.is_active) || i === 0;

      // Node circle
      doc.setFillColor(...rgb);
      if (isConfigured) {
        doc.setDrawColor(52, 211, 153); // emerald-400
        doc.setLineWidth(0.8);
      } else {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
      }
      doc.circle(cx, nodeY, nodeR, 'FD');

      // Level number
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(nodeR > 5 ? 8 : 7);
      doc.text(`${i + 1}`, cx, nodeY + (nodeR > 5 ? 1 : 0.8), { align: 'center' });

      // Status dot
      const dotR = 2;
      const dotX = cx + nodeR * 0.6;
      const dotY = nodeY + nodeR * 0.6;
      if (isConfigured) {
        doc.setFillColor(16, 185, 129); // emerald-500
        doc.circle(dotX, dotY, dotR, 'F');
        // checkmark
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.line(dotX - 0.8, dotY, dotX - 0.2, dotY + 0.6);
        doc.line(dotX - 0.2, dotY + 0.6, dotX + 0.8, dotY - 0.5);
      } else {
        doc.setFillColor(251, 191, 36); // amber-400
        doc.circle(dotX, dotY, dotR, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.text('!', dotX, dotY + 0.6, { align: 'center' });
      }

      // Level name below
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(levels.length > 10 ? 5 : 6);
      const maxLabelW = spacing * 0.9;
      const labelText = level.label.length > 12 ? level.label.slice(0, 11) + '…' : level.label;
      doc.text(labelText, cx, nodeY + nodeR + 5, { align: 'center', maxWidth: maxLabelW });

      // Status label
      doc.setFontSize(4.5);
      doc.setTextColor(isConfigured ? 16 : 200, isConfigured ? 185 : 150, isConfigured ? 129 : 0);
      doc.text(isConfigured ? 'Ready' : 'Incomplete', cx, nodeY + nodeR + 9, { align: 'center' });
    });

    y = nodeY + nodeR + 14;
  }

  // ─── Summary Stats ───
  y = ensureSpace(doc, y, 22);
  const configuredCount = levels.filter(l => criteria.some(c => c.stylist_level_id === l.dbId && c.is_active)).length + (levels.length > 0 ? 1 : 0); // +1 for base level
  const retentionCount = retentionCriteria.filter(r => r.is_active).length;

  const statsData = [
    { label: 'Total Levels', value: `${levels.length}` },
    { label: 'Configured', value: `${Math.min(configuredCount, levels.length)}/${levels.length}` },
    { label: 'Retention Rules', value: `${retentionCount}` },
  ];

  const statBoxW = (contentWidth - 8) / 3;
  statsData.forEach((stat, i) => {
    const bx = MARGIN + i * (statBoxW + 4);
    drawRoundedRect(doc, bx, y, statBoxW, 18, 2, { fill: [248, 248, 250], stroke: [220, 220, 220], lineWidth: 0.3 });
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(stat.value, bx + statBoxW / 2, y + 10, { align: 'center' });
    doc.setTextColor(130, 130, 130);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(stat.label, bx + statBoxW / 2, y + 15.5, { align: 'center' });
  });

  y += 26;

  // ─── Per-level detail cards ───
  levels.forEach((level, i) => {
    const promo = getPromo(level.dbId);
    const retention = getRetention(level.dbId);
    const commission = commissions.find(cm => cm.dbId === level.dbId);
    const isBase = i === 0;
    const isTop = i === levels.length - 1;
    const isConfigured = level.index === 0 || !!promo;
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
    let cardH = 14; // header + accent bar + padding
    cardH += 14; // compensation section
    if (kpis.length > 0) {
      const kpiRows = Math.ceil(kpis.length / 4);
      cardH += 6 + kpiRows * 14;
    } else {
      cardH += 14; // "no KPI" placeholder
    }
    if (!isBase && promo) cardH += 10; // eval details
    if (retention?.retention_enabled) cardH += 14; // retention section
    cardH += 6; // bottom padding

    y = ensureSpace(doc, y, cardH);

    // Card border
    const borderColor: [number, number, number] = isConfigured ? [220, 220, 220] : [253, 224, 71];
    drawRoundedRect(doc, MARGIN, y, contentWidth, cardH, 3, { stroke: borderColor, lineWidth: 0.4 });
    if (!isConfigured) {
      doc.setFillColor(255, 251, 235); // amber-50/20
      doc.roundedRect(MARGIN, y, contentWidth, cardH, 3, 3, 'F');
    }

    // Accent bar at top
    doc.setFillColor(...accentRgb);
    doc.rect(MARGIN + 0.5, y + 0.5, contentWidth - 1, 2, 'F');

    let cy = y + 7;

    // Card title
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Level ${i + 1} — ${level.label}`, MARGIN + 6, cy);

    // Status badge
    if (isConfigured) {
      const badgeText = 'Configured';
      const bw = doc.getTextWidth(badgeText) + 6;
      const bx = MARGIN + 6 + doc.getTextWidth(`Level ${i + 1} — ${level.label}`) + 4;
      doc.setFillColor(209, 250, 229); // emerald-100
      doc.roundedRect(bx, cy - 3.5, bw, 5, 1.5, 1.5, 'F');
      doc.setTextColor(21, 128, 61); // emerald-700
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text(badgeText, bx + 3, cy - 0.3);
    } else {
      const badgeText = 'Incomplete';
      const bw = doc.getTextWidth(badgeText) + 6;
      doc.setFontSize(5.5);
      const bx = MARGIN + 6 + doc.getTextWidth(`Level ${i + 1} — ${level.label}`) + 4;
      doc.setFillColor(254, 243, 199); // amber-100
      doc.roundedRect(bx, cy - 3.5, bw, 5, 1.5, 1.5, 'F');
      doc.setTextColor(180, 83, 9); // amber-700
      doc.setFont('helvetica', 'normal');
      doc.text(badgeText, bx + 3, cy - 0.3);
    }

    if (isBase) {
      cy += 4;
      doc.setTextColor(130, 130, 130);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('Entry Level — Retention Minimums', MARGIN + 6, cy);
    }

    cy += 6;

    // ── Compensation ──
    doc.setTextColor(160, 160, 160);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('COMPENSATION', MARGIN + 6, cy);
    cy += 4;

    const compParts: string[] = [];
    if (commission) {
      if (commission.serviceCommissionRate > 0) compParts.push(`Service: ${commission.serviceCommissionRate}%`);
      if (commission.retailCommissionRate > 0) compParts.push(`Retail: ${commission.retailCommissionRate}%`);
      if (commission.hourlyWageEnabled && commission.hourlyWage) compParts.push(`Hourly: $${commission.hourlyWage}/hr`);
    }

    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(compParts.length > 0 ? compParts.join('   ·   ') : 'Not configured', MARGIN + 6, cy);
    cy += 6;

    // ── KPI Requirements ──
    if (kpis.length > 0) {
      doc.setTextColor(160, 160, 160);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.text(isBase ? 'RETENTION MINIMUMS' : 'GRADUATION REQUIREMENTS', MARGIN + 6, cy);
      cy += 4;

      const cols = 4;
      const cellW = (contentWidth - 12) / cols;
      const cellH = 12;

      kpis.forEach((kpi, ki) => {
        const col = ki % cols;
        const row = Math.floor(ki / cols);
        const cx = MARGIN + 6 + col * cellW;
        const ky = cy + row * (cellH + 2);

        drawRoundedRect(doc, cx, ky, cellW - 2, cellH, 1.5, { fill: [248, 248, 250], stroke: [235, 235, 235], lineWidth: 0.2 });

        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.text(kpi.label, cx + 3, ky + 4);

        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(kpi.value, cx + 3, ky + 9.5);
      });

      const kpiRows = Math.ceil(kpis.length / cols);
      cy += kpiRows * (cellH + 2) + 2;
    } else if (!isBase) {
      doc.setTextColor(160, 160, 160);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('No KPI requirements configured for this level.', MARGIN + 6, cy + 2);
      cy += 10;
    } else {
      cy += 4;
    }

    // ── Evaluation details ──
    if (!isBase && promo) {
      const evalParts: string[] = [];
      evalParts.push(`${promo.evaluation_window_days}d eval window`);
      if (promo.tenure_enabled && promo.tenure_days > 0 && !isTop) evalParts.push(`${promo.tenure_days}d tenure`);
      evalParts.push(promo.requires_manual_approval ? 'Manual approval' : 'Auto-promote');

      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(evalParts.join('   ·   '), MARGIN + 6, cy);
      cy += 6;
    }

    // ── Retention policy ──
    if (retention?.retention_enabled) {
      doc.setTextColor(160, 160, 160);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.text('RETENTION POLICY', MARGIN + 6, cy);
      cy += 4;

      const retParts = [
        `${retention.evaluation_window_days}d eval window`,
        `${retention.grace_period_days}d grace period`,
        retention.action_type === 'demotion_eligible' ? 'Demotion eligible' : 'Coaching flag',
      ];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      const actionColor: [number, number, number] = retention.action_type === 'demotion_eligible' ? [220, 38, 38] : [217, 119, 6];
      // First two parts in neutral
      doc.setTextColor(100, 100, 100);
      const neutralText = retParts.slice(0, 2).join('   ·   ') + '   ·   ';
      doc.text(neutralText, MARGIN + 6, cy);
      // Action type in color
      const neutralW = doc.getTextWidth(neutralText);
      doc.setTextColor(...actionColor);
      doc.text(retParts[2], MARGIN + 6 + neutralW, cy);
    }

    y += cardH + 5;
  });

  // ─── Footer on every page ───
  const totalPages = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(6);
    doc.setTextColor(170, 170, 170);
    doc.setFont('helvetica', 'normal');
    doc.text(orgName, MARGIN, pageH - 8);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - MARGIN, pageH - 8, { align: 'right' });
    doc.text('Confidential — For internal use only', pageWidth / 2, pageH - 8, { align: 'center' });
  }

  return doc;
}
