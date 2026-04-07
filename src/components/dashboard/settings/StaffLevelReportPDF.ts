/**
 * Staff Level Report PDF — shows each team member's current level,
 * readiness status, composite score, recommended next level, and key gaps.
 * Matches the aesthetic of LevelRequirementsPDF (same header/footer style).
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { registerPdfFonts, setTermina, setAeonik } from '@/lib/pdf-fonts';
import type { TeamMemberProgress, GraduationStatus } from '@/hooks/useTeamLevelProgress';
import type { LevelSummary, ServiceLevelMargin } from '@/hooks/useLevelEconomicsAnalyzer';

export interface LevelEconomicsPDFData {
  levelSummaries: LevelSummary[];
  serviceMatrix: ServiceLevelMargin[];
  dateRange: { start: string; end: string } | null;
  totalAppointments: number;
}

export interface StaffLevelReportOptions {
  orgName: string;
  teamProgress: TeamMemberProgress[];
  counts: {
    ready: number;
    inProgress: number;
    needsAttention: number;
    atTopLevel: number;
    atRisk: number;
    belowStandard: number;
    total: number;
  };
  levelEconomics?: LevelEconomicsPDFData;
  targetMarginPct?: number;
}

const MARGIN = 18;
const PAGE_BOTTOM_MARGIN = 22;

const STATUS_LABELS: Record<GraduationStatus, string> = {
  ready: 'Ready to Promote',
  in_progress: 'In Progress',
  needs_attention: 'Needs Attention',
  at_top_level: 'At Top Level',
  no_criteria: 'No Criteria',
  at_risk: 'At Risk',
  below_standard: 'Below Standard',
};

const STATUS_COLORS: Record<GraduationStatus, [number, number, number]> = {
  ready: [16, 185, 129],       // emerald
  in_progress: [59, 130, 246], // blue
  needs_attention: [245, 158, 11], // amber
  at_top_level: [107, 114, 128],   // gray
  no_criteria: [156, 163, 175],    // gray-400
  at_risk: [249, 115, 22],    // orange
  below_standard: [239, 68, 68],   // red
};

const MARGIN_STATUS_COLORS: Record<string, [number, number, number]> = {
  healthy: [16, 185, 129],
  tight: [245, 158, 11],
  negative: [239, 68, 68],
};

const MARGIN_STATUS_LABELS: Record<string, string> = {
  healthy: 'Healthy',
  tight: 'Tight',
  negative: 'Underpriced',
};

function formatDays(days: number): string {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    return months > 0 ? `${years}y ${months}m` : `${years}y`;
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months}m`;
  }
  return `${days}d`;
}

function getKeyGap(member: TeamMemberProgress): string {
  const gaps = member.criteriaProgress
    .filter(c => c.enabled && c.gap > 0)
    .sort((a, b) => {
      const aPct = a.target > 0 ? a.gap / a.target : 0;
      const bPct = b.target > 0 ? b.gap / b.target : 0;
      return bPct - aPct;
    });
  if (gaps.length === 0) {
    if (member.retentionFailures.length > 0) {
      const f = member.retentionFailures[0];
      return `${f.label}: ${f.current}${f.unit} (min ${f.minimum}${f.unit})`;
    }
    return '—';
  }
  const g = gaps[0];
  const unit = g.unit === '/mo' ? '/mo' : g.unit === '$' ? '' : g.unit === '$/hr' ? '/hr' : g.unit;
  const prefix = g.unit === '$' || g.unit === '$/hr' || g.key === 'revenue' || g.key === 'avg_ticket' ? '$' : '';
  return `${g.label}: ${prefix}${Math.round(g.current)}${unit} → ${prefix}${Math.round(g.target)}${unit}`;
}

function fmtCurrency(v: number): string {
  return '$' + Math.round(v).toLocaleString();
}

function fmtPct(v: number): string {
  return (v * 100).toFixed(1) + '%';
}

function ensureSpace(doc: jsPDF, y: number, needed: number, F_BODY: string, orgName: string): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - PAGE_BOTTOM_MARGIN) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function generateStaffLevelReportPDF(options: StaffLevelReportOptions): jsPDF {
  const { orgName, teamProgress, counts, levelEconomics, targetMarginPct = 0.15 } = options;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const hasFonts = registerPdfFonts(doc);
  const F_DISPLAY = hasFonts ? 'Termina' : 'helvetica';
  const F_BODY = hasFonts ? 'AeonikPro' : 'helvetica';
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();

  // ─── Centered Header (matching roadmap PDF) ───
  let y = 18;

  doc.setTextColor(30, 30, 30);
  doc.setFont(F_DISPLAY, 'normal');
  doc.setFontSize(20);
  doc.text(orgName.toUpperCase(), pageWidth / 2, y, { align: 'center', charSpace: 1.0 });

  y += 7;
  doc.setTextColor(160, 160, 160);
  doc.setFont(F_BODY, 'normal');
  doc.setFontSize(8);
  doc.text('STAFF LEVEL REPORT', pageWidth / 2, y, { align: 'center', charSpace: 1.2 });

  y += 5;
  doc.setCharSpace(0);
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(7);
  doc.text(`Generated ${format(now, 'MMMM d, yyyy')}`, pageWidth / 2, y, { align: 'center' });

  y += 8;

  // Thin separator
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 40, y, pageWidth - MARGIN - 40, y);

  y += 8;

  // ─── Summary Strip ───
  const summaryItems = [
    { label: 'Total Staff', value: `${counts.total}`, color: [30, 30, 30] as [number, number, number] },
    { label: 'Ready to Promote', value: `${counts.ready}`, color: STATUS_COLORS.ready },
    { label: 'In Progress', value: `${counts.inProgress}`, color: STATUS_COLORS.in_progress },
    { label: 'At Risk', value: `${counts.atRisk}`, color: STATUS_COLORS.at_risk },
    { label: 'Below Standard', value: `${counts.belowStandard}`, color: STATUS_COLORS.below_standard },
    { label: 'At Top Level', value: `${counts.atTopLevel}`, color: STATUS_COLORS.at_top_level },
  ];

  const contentWidth = pageWidth - MARGIN * 2;
  const stripH = 26;
  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, contentWidth, stripH, 3, 3, 'FD');

  const colW = contentWidth / summaryItems.length;
  summaryItems.forEach((item, i) => {
    const cx = MARGIN + colW * i + colW / 2;
    doc.setTextColor(130, 130, 130);
    doc.setFont(F_BODY, 'normal');
    doc.setFontSize(6.5);
    doc.text(item.label, cx, y + 9, { align: 'center' });
    doc.setTextColor(...item.color);
    doc.setFont(F_DISPLAY, 'normal');
    doc.setFontSize(16);
    doc.text(item.value, cx, y + 20, { align: 'center' });

    if (i < summaryItems.length - 1) {
      const divX = MARGIN + colW * (i + 1);
      doc.setDrawColor(220, 220, 225);
      doc.setLineWidth(0.3);
      doc.line(divX, y + 5, divX, y + stripH - 5);
    }
  });

  y += stripH + 8;

  // ─── Staff Table ───
  const levelGroups = new Map<string, TeamMemberProgress[]>();
  teamProgress.forEach(member => {
    const levelName = member.currentLevel?.label || 'Unassigned';
    if (!levelGroups.has(levelName)) levelGroups.set(levelName, []);
    levelGroups.get(levelName)!.push(member);
  });

  const tableHead = ['Name', 'Current Level', 'Status', 'Score', 'Next Level', 'Time at Level', 'Key Gap'];

  const tableBody: (string | { content: string; styles?: Record<string, any> })[][] = [];

  for (const [levelName, members] of levelGroups) {
    tableBody.push([
      { content: levelName, styles: { fontStyle: 'bold', fillColor: [240, 240, 242], cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: [60, 60, 60] } },
      { content: '', styles: { fillColor: [240, 240, 242] } },
      { content: `${members.length} stylist${members.length !== 1 ? 's' : ''}`, styles: { fillColor: [240, 240, 242], textColor: [120, 120, 120], fontStyle: 'italic' } },
      { content: '', styles: { fillColor: [240, 240, 242] } },
      { content: '', styles: { fillColor: [240, 240, 242] } },
      { content: '', styles: { fillColor: [240, 240, 242] } },
      { content: '', styles: { fillColor: [240, 240, 242] } },
    ]);

    members.forEach(member => {
      const statusLabel = STATUS_LABELS[member.status];
      const statusColor = STATUS_COLORS[member.status];
      const nextLevelName = member.nextLevel?.label || '—';
      const score = member.status === 'at_top_level' ? '—' : `${member.compositeScore}%`;
      const timeAtLevel = formatDays(member.timeAtLevelDays);
      const keyGap = getKeyGap(member);

      tableBody.push([
        member.fullName,
        member.currentLevel?.label || '—',
        { content: statusLabel, styles: { textColor: statusColor } },
        score,
        nextLevelName,
        timeAtLevel,
        keyGap,
      ]);
    });
  }

  if (tableBody.length === 0) {
    tableBody.push(['No team members with assigned levels', '', '', '', '', '', '']);
  }

  doc.setCharSpace(0);

  autoTable(doc, {
    startY: y,
    head: [tableHead],
    body: tableBody,
    margin: { left: MARGIN, right: MARGIN },
    theme: 'grid',
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [50, 50, 50],
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253],
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 30 },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 'auto', fontSize: 7 },
    },
    styles: {
      lineColor: [230, 230, 230],
      lineWidth: 0.3,
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2 && data.cell.text[0] && data.cell.text[0] !== '') {
        const statusText = data.cell.text[0];
        for (const [, label] of Object.entries(STATUS_LABELS)) {
          if (label === statusText) {
            data.cell.text[0] = `● ${statusText}`;
            break;
          }
        }
      }
    },
  });

  // ─── Level Economics Section ───
  if (levelEconomics) {
    const { levelSummaries, serviceMatrix, dateRange, totalAppointments } = levelEconomics;
    const validSummaries = levelSummaries.filter(s => s.hasEnoughData);

    if (validSummaries.length > 0) {
      // Get current Y after the staff table
      y = (doc as any).lastAutoTable?.finalY ?? y + 10;
      y += 10;

      y = ensureSpace(doc, y, 50, F_BODY, orgName);

      // Section header
      doc.setFont(F_DISPLAY, 'normal');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.setCharSpace(0.8);
      doc.text('LEVEL ECONOMICS SUMMARY', MARGIN, y);
      doc.setCharSpace(0);

      y += 3;

      // Date range subtitle
      if (dateRange) {
        doc.setFont(F_BODY, 'normal');
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Based on ${totalAppointments.toLocaleString()} appointments · ${format(new Date(dateRange.start), 'MMM d')} – ${format(new Date(dateRange.end), 'MMM d, yyyy')}`,
          MARGIN, y
        );
        y += 5;
      }

      // Level margin table
      const econHead = ['Level', 'Wtd Margin', 'Avg Rev/Stylist', 'Commission', 'Product Cost', 'Overhead', 'Status'];
      const econBody = validSummaries.map(s => {
        const statusColor = MARGIN_STATUS_COLORS[s.status];
        const statusLabel = MARGIN_STATUS_LABELS[s.status];
        return [
          s.levelLabel,
          fmtPct(s.weightedMarginPct),
          fmtCurrency(s.avgRevenuePerStylist) + '/mo',
          fmtCurrency(s.commissionCostTotal),
          fmtCurrency(s.productCostTotal),
          fmtCurrency(s.overheadCostTotal),
          { content: `● ${statusLabel}`, styles: { textColor: statusColor } },
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [econHead],
        body: econBody,
        margin: { left: MARGIN, right: MARGIN },
        theme: 'grid',
        headStyles: {
          fillColor: [40, 40, 40],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          cellPadding: 2.5,
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 2,
          textColor: [50, 50, 50],
        },
        alternateRowStyles: { fillColor: [252, 252, 253] },
        styles: { lineColor: [230, 230, 230], lineWidth: 0.3 },
      });

      y = (doc as any).lastAutoTable?.finalY ?? y + 30;
      y += 8;

      // ─── Flagged Services Below Target Margin ───
      const flagged = serviceMatrix
        .filter(m => m.marginPct < targetMarginPct && m.appointmentCount >= 10)
        .sort((a, b) => a.marginPct - b.marginPct)
        .slice(0, 15);

      y = ensureSpace(doc, y, 30, F_BODY, orgName);

      doc.setFont(F_DISPLAY, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.setCharSpace(0.6);
      doc.text('SERVICES BELOW TARGET MARGIN', MARGIN, y);
      doc.setCharSpace(0);
      y += 4;

      if (flagged.length === 0) {
        doc.setFont(F_BODY, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(16, 185, 129);
        doc.text('All service-level combinations are at or above target margin.', MARGIN, y, { maxWidth: contentWidth });
        y += 6;
      } else {
        // Find level label from summaries
        const levelLabelMap = new Map(levelSummaries.map(s => [s.levelId, s.levelLabel]));
        const flagHead = ['Service', 'Level', 'Price', 'Margin %', 'Gap to Target'];
        const flagBody = flagged.map(m => {
          const gap = targetMarginPct - m.marginPct;
          return [
            m.serviceName,
            levelLabelMap.get(m.levelId) || '—',
            fmtCurrency(m.price),
            { content: fmtPct(m.marginPct), styles: { textColor: MARGIN_STATUS_COLORS[m.status] } },
            { content: '-' + fmtPct(gap), styles: { textColor: [239, 68, 68] as [number, number, number] } },
          ];
        });

        autoTable(doc, {
          startY: y,
          head: [flagHead],
          body: flagBody,
          margin: { left: MARGIN, right: MARGIN },
          theme: 'grid',
          headStyles: {
            fillColor: [60, 60, 60],
            textColor: [255, 255, 255],
            fontSize: 7,
            fontStyle: 'bold',
            cellPadding: 2,
          },
          bodyStyles: {
            fontSize: 7,
            cellPadding: 2,
            textColor: [50, 50, 50],
          },
          alternateRowStyles: { fillColor: [252, 252, 253] },
          styles: { lineColor: [230, 230, 230], lineWidth: 0.3 },
        });

        y = (doc as any).lastAutoTable?.finalY ?? y + 30;
        y += 6;
      }

      // ─── Silent Margin Erosion Callout ───
      // Services using fallback (base) price but with higher commission rates
      const baseLevelId = levelSummaries.length > 0 ? levelSummaries[0].levelId : null;
      const baseCommissionMap = new Map<string, number>();
      if (baseLevelId) {
        for (const m of serviceMatrix) {
          if (m.levelId === baseLevelId) {
            baseCommissionMap.set(m.serviceId, m.commissionCost / (m.price || 1));
          }
        }
      }

      const erosionAlerts = serviceMatrix.filter(m => {
        if (!m.isFallbackPrice || m.levelId === baseLevelId) return false;
        const baseRate = baseCommissionMap.get(m.serviceId) ?? 0;
        const thisRate = m.price > 0 ? m.commissionCost / m.price : 0;
        return thisRate > baseRate + 0.01; // meaningful difference
      });

      if (erosionAlerts.length > 0) {
        y = ensureSpace(doc, y, 15 + erosionAlerts.length * 4, F_BODY, orgName);

        doc.setFont(F_DISPLAY, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(249, 115, 22); // orange
        doc.setCharSpace(0.5);
        doc.text('SILENT MARGIN EROSION', MARGIN, y);
        doc.setCharSpace(0);
        y += 4;

        doc.setFont(F_BODY, 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 100, 100);

        const levelLabelMap = new Map(levelSummaries.map(s => [s.levelId, s.levelLabel]));
        for (const alert of erosionAlerts.slice(0, 10)) {
          const levelLabel = levelLabelMap.get(alert.levelId) || '—';
          doc.text(
            `⚠ ${alert.serviceName} at ${levelLabel}: using base price (${fmtCurrency(alert.price)}) with higher commission rate — margin eroding silently`,
            MARGIN + 2, y, { maxWidth: contentWidth - 4 }
          );
          y += 4;
        }
        y += 2;
      }
    }
  }

  // ─── Footer on every page ───
  const totalPages = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, pageH - 14, pageWidth - MARGIN, pageH - 14);

    doc.setFontSize(6.5);
    doc.setTextColor(180, 180, 180);
    doc.setFont(F_BODY, 'normal');
    doc.setCharSpace(0);
    doc.text(`Confidential — For internal use only  ·  ${orgName}`, pageWidth / 2, pageH - 9, { align: 'center' });
    doc.text(`Page ${p} of ${totalPages}`, pageWidth / 2, pageH - 5, { align: 'center' });
  }

  return doc;
}
