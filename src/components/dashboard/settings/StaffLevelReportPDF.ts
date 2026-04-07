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
  // Find the criterion with the largest gap (shortfall)
  const gaps = member.criteriaProgress
    .filter(c => c.enabled && c.gap > 0)
    .sort((a, b) => {
      // Normalize gap as % of target to compare across metrics
      const aPct = a.target > 0 ? a.gap / a.target : 0;
      const bPct = b.target > 0 ? b.gap / b.target : 0;
      return bPct - aPct;
    });
  if (gaps.length === 0) {
    // Check retention failures
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

export function generateStaffLevelReportPDF(options: StaffLevelReportOptions): jsPDF {
  const { orgName, teamProgress, counts } = options;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();

  // ─── Centered Header (matching roadmap PDF) ───
  let y = 18;

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(orgName.toUpperCase(), pageWidth / 2, y, { align: 'center', charSpace: 1.0 });

  y += 7;
  doc.setTextColor(160, 160, 160);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('STAFF LEVEL REPORT', pageWidth / 2, y, { align: 'center', charSpace: 1.2 });

  y += 5;
  doc.setCharSpace(0); // Reset charSpace so it doesn't leak into body text / autoTable
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
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(item.label, cx, y + 9, { align: 'center' });
    doc.setTextColor(...item.color);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(item.value, cx, y + 20, { align: 'center' });

    // Vertical divider between items
    if (i < summaryItems.length - 1) {
      const divX = MARGIN + colW * (i + 1);
      doc.setDrawColor(220, 220, 225);
      doc.setLineWidth(0.3);
      doc.line(divX, y + 5, divX, y + stripH - 5);
    }
  });

  y += stripH + 8;

  // ─── Staff Table ───
  // Group by current level
  const levelGroups = new Map<string, TeamMemberProgress[]>();
  teamProgress.forEach(member => {
    const levelName = member.currentLevel?.label || 'Unassigned';
    if (!levelGroups.has(levelName)) levelGroups.set(levelName, []);
    levelGroups.get(levelName)!.push(member);
  });

  const tableHead = ['Name', 'Current Level', 'Status', 'Score', 'Next Level', 'Time at Level', 'Key Gap'];

  const tableBody: (string | { content: string; styles?: Record<string, any> })[][] = [];

  for (const [levelName, members] of levelGroups) {
    // Group header row
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

  doc.setCharSpace(0); // Ensure charSpace is reset before table

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
      0: { cellWidth: 45 },  // Name
      1: { cellWidth: 30 },  // Current Level
      2: { cellWidth: 30 },  // Status
      3: { cellWidth: 16, halign: 'center' },  // Score
      4: { cellWidth: 30 },  // Next Level
      5: { cellWidth: 22, halign: 'center' },  // Time at Level
      6: { cellWidth: 'auto', fontSize: 7 },  // Key Gap — smaller to fit long text
    },
    styles: {
      lineColor: [230, 230, 230],
      lineWidth: 0.3,
    },
    didParseCell: (data) => {
      // Add colored dot before status text
      if (data.section === 'body' && data.column.index === 2 && data.cell.text[0] && data.cell.text[0] !== '') {
        const statusText = data.cell.text[0];
        // Find matching status color
        for (const [, label] of Object.entries(STATUS_LABELS)) {
          if (label === statusText) {
            data.cell.text[0] = `● ${statusText}`;
            break;
          }
        }
      }
    },
  });

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
    doc.setFont('helvetica', 'normal');
    doc.setCharSpace(0);
    doc.text(`Confidential — For internal use only  ·  ${orgName}`, pageWidth / 2, pageH - 9, { align: 'center' });
    doc.text(`Page ${p} of ${totalPages}`, pageWidth / 2, pageH - 5, { align: 'center' });
  }

  return doc;
}
