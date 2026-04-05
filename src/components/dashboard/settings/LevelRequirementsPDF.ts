/**
 * PDF Export for Stylist Level Graduation Requirements.
 * Generates a branded document listing all levels + promotion criteria.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { LevelPromotionCriteria } from '@/hooks/useLevelPromotionCriteria';

interface LevelInfo {
  label: string;
  slug: string;
  dbId?: string;
  index: number;
}

export interface LevelRequirementsPDFOptions {
  orgName: string;
  levels: LevelInfo[];
  criteria: LevelPromotionCriteria[];
}

function formatCriteriaRow(level: LevelInfo, criteria: LevelPromotionCriteria | undefined): string[] {
  if (level.index === 0) {
    return [
      `Level ${level.index + 1}`,
      level.label,
      'Entry Level',
      '—',
      '—',
      '—',
    ];
  }

  if (!criteria || !criteria.is_active) {
    return [
      `Level ${level.index + 1}`,
      level.label,
      'Not Configured',
      '—',
      '—',
      '—',
    ];
  }

  const reqs: string[] = [];
  const weights: string[] = [];

  if (criteria.revenue_enabled && criteria.revenue_threshold > 0) {
    reqs.push(`$${criteria.revenue_threshold.toLocaleString()} rev/mo`);
    weights.push(`Revenue: ${criteria.revenue_weight}%`);
  }
  if (criteria.retail_enabled && criteria.retail_pct_threshold > 0) {
    reqs.push(`${criteria.retail_pct_threshold}% retail`);
    weights.push(`Retail: ${criteria.retail_weight}%`);
  }
  if (criteria.rebooking_enabled && criteria.rebooking_pct_threshold > 0) {
    reqs.push(`${criteria.rebooking_pct_threshold}% rebook`);
    weights.push(`Rebook: ${criteria.rebooking_weight}%`);
  }
  if (criteria.avg_ticket_enabled && criteria.avg_ticket_threshold > 0) {
    reqs.push(`$${criteria.avg_ticket_threshold} avg ticket`);
    weights.push(`Avg Ticket: ${criteria.avg_ticket_weight}%`);
  }
  if (criteria.tenure_enabled && criteria.tenure_days > 0) {
    reqs.push(`${criteria.tenure_days}d tenure`);
  }

  return [
    `Level ${level.index + 1}`,
    level.label,
    reqs.join('\n') || 'None set',
    weights.join('\n') || '—',
    `${criteria.evaluation_window_days}d`,
    criteria.requires_manual_approval ? 'Yes' : 'No',
  ];
}

export function generateLevelRequirementsPDF(options: LevelRequirementsPDFOptions): jsPDF {
  const { orgName, levels, criteria } = options;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();

  // --- Header ---
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Stylist Level Graduation Roadmap', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(orgName, 14, 18);
  doc.text(`Generated: ${format(now, 'MMM d, yyyy h:mm a')}`, pageWidth - 14, 11, { align: 'right' });
  doc.text(`${levels.length} Levels Configured`, pageWidth - 14, 18, { align: 'right' });

  // --- Summary Stats ---
  let y = 32;
  const configuredCount = levels.filter((l, i) => i > 0 && criteria.some(c => c.stylist_level_id === l.dbId && c.is_active)).length;
  const unconfiguredCount = levels.filter((l, i) => i > 0).length - configuredCount;

  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(14, y, pageWidth - 28, 16, 3, 3, 'FD');

  const stats = [
    { label: 'Total Levels', value: `${levels.length}` },
    { label: 'Graduation Paths', value: `${configuredCount}` },
    { label: 'Unconfigured', value: `${unconfiguredCount}` },
  ];

  const statColW = (pageWidth - 28) / stats.length;
  stats.forEach((stat, i) => {
    const cx = 14 + statColW * i + statColW / 2;
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(stat.label, cx, y + 5, { align: 'center' });
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(stat.value, cx, y + 12, { align: 'center' });
  });

  // --- Requirements Table ---
  y = 56;
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Graduation Requirements by Level', 14, y);
  y += 4;

  const tableHead = ['Tier', 'Level Name', 'Requirements', 'Weights', 'Eval Window', 'Approval'];
  const tableBody = levels.map(level => {
    const c = criteria.find(cr => cr.stylist_level_id === level.dbId);
    return formatCriteriaRow(level, c);
  });

  autoTable(doc, {
    startY: y,
    head: [tableHead],
    body: tableBody,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 250],
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 35 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 45 },
      4: { cellWidth: 22 },
      5: { cellWidth: 20 },
    },
  });

  // --- Footer ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(orgName, 14, pageHeight - 8);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    doc.text('Confidential — For internal use only', pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  return doc;
}
