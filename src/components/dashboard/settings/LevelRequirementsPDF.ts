/**
 * PDF Export for Stylist Level Graduation Requirements.
 * Generates a branded document listing all levels + promotion criteria + retention criteria.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
}

export interface LevelRequirementsPDFOptions {
  orgName: string;
  levels: LevelInfo[];
  criteria: LevelPromotionCriteria[];
  retentionCriteria?: LevelRetentionCriteria[];
  logoDataUrl?: string;
  commissions?: LevelCommission[];
}

function formatCriteriaRow(
  level: LevelInfo,
  criteria: LevelPromotionCriteria | undefined,
  commission: LevelCommission | undefined
): string[] {
  const commStr = commission
    ? `Svc: ${commission.serviceCommissionRate}%\nRetail: ${commission.retailCommissionRate}%`
    : '—';

  if (level.index === 0) {
    return [
      `Level ${level.index + 1}`,
      level.label,
      commStr,
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
      commStr,
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
  if (criteria.retention_rate_enabled && criteria.retention_rate_threshold > 0) {
    reqs.push(`${criteria.retention_rate_threshold}% retention`);
    weights.push(`Retention: ${criteria.retention_rate_weight}%`);
  }
  if (criteria.new_clients_enabled && criteria.new_clients_threshold > 0) {
    reqs.push(`${criteria.new_clients_threshold} new clients`);
    weights.push(`New Clients: ${criteria.new_clients_weight}%`);
  }
  if (criteria.utilization_enabled && criteria.utilization_threshold > 0) {
    reqs.push(`${criteria.utilization_threshold}% utilization`);
    weights.push(`Utilization: ${criteria.utilization_weight}%`);
  }
  if (criteria.rev_per_hour_enabled && criteria.rev_per_hour_threshold > 0) {
    reqs.push(`$${criteria.rev_per_hour_threshold}/hr`);
    weights.push(`Rev/Hr: ${criteria.rev_per_hour_weight}%`);
  }
  if (criteria.tenure_enabled && criteria.tenure_days > 0) {
    reqs.push(`${criteria.tenure_days}d tenure`);
  }

  return [
    `Level ${level.index + 1}`,
    level.label,
    commStr,
    reqs.join('\n') || 'None set',
    weights.join('\n') || '—',
    `${criteria.evaluation_window_days}d`,
    criteria.requires_manual_approval ? 'Yes' : 'No',
  ];
}

function formatRetentionRow(level: LevelInfo, retention: LevelRetentionCriteria | undefined): string[] {
  if (!retention || !retention.is_active || !retention.retention_enabled) {
    return [
      `Level ${level.index + 1}`,
      level.label,
      'Not Configured',
      '—',
      '—',
      '—',
    ];
  }

  const mins: string[] = [];
  if (retention.revenue_enabled && retention.revenue_minimum > 0) {
    mins.push(`$${retention.revenue_minimum.toLocaleString()} rev/mo`);
  }
  if (retention.retail_enabled && retention.retail_pct_minimum > 0) {
    mins.push(`${retention.retail_pct_minimum}% retail`);
  }
  if (retention.rebooking_enabled && retention.rebooking_pct_minimum > 0) {
    mins.push(`${retention.rebooking_pct_minimum}% rebook`);
  }
  if (retention.avg_ticket_enabled && retention.avg_ticket_minimum > 0) {
    mins.push(`$${retention.avg_ticket_minimum} avg ticket`);
  }
  if (retention.retention_rate_enabled && retention.retention_rate_minimum > 0) {
    mins.push(`${retention.retention_rate_minimum}% retention`);
  }
  if (retention.new_clients_enabled && retention.new_clients_minimum > 0) {
    mins.push(`${retention.new_clients_minimum} new clients`);
  }
  if (retention.utilization_enabled && retention.utilization_minimum > 0) {
    mins.push(`${retention.utilization_minimum}% utilization`);
  }
  if (retention.rev_per_hour_enabled && retention.rev_per_hour_minimum > 0) {
    mins.push(`$${retention.rev_per_hour_minimum}/hr`);
  }

  const actionLabel = retention.action_type === 'demotion_eligible' ? 'Demotion Eligible' : 'Coaching Flag';

  return [
    `Level ${level.index + 1}`,
    level.label,
    mins.join('\n') || 'None set',
    `${retention.evaluation_window_days}d`,
    `${retention.grace_period_days}d`,
    actionLabel,
  ];
}

export function generateLevelRequirementsPDF(options: LevelRequirementsPDFOptions): jsPDF {
  const { orgName, levels, criteria, retentionCriteria = [], logoDataUrl, commissions = [] } = options;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();

  // --- Header ---
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pageWidth, 24, 'F');

  let titleX = 14;

  // Logo
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 14, 3, 0, 10);
      // Estimate logo width (aspect ratio ~3:1 typical) and offset title
      titleX = 14 + 34;
    } catch {
      // Logo failed, proceed without
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Stylist Level Graduation Roadmap', titleX, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(orgName, titleX, 18);
  doc.text(`Generated: ${format(now, 'MMM d, yyyy h:mm a')}`, pageWidth - 14, 11, { align: 'right' });
  doc.text(`${levels.length} Levels Configured`, pageWidth - 14, 18, { align: 'right' });

  // --- Level Progression Visual ---
  let y = 30;
  if (levels.length > 1) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('CAREER PROGRESSION', 14, y);
    y += 4;

    doc.setFillColor(248, 248, 250);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(14, y, pageWidth - 28, 10, 2, 2, 'FD');

    const flowY = y + 6;
    const usableWidth = pageWidth - 28 - 8; // margins + padding
    const totalItems = levels.length;
    const segmentWidth = usableWidth / totalItems;

    levels.forEach((level, i) => {
      const cx = 18 + segmentWidth * i + segmentWidth / 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 30, 30);
      doc.text(level.label, cx, flowY, { align: 'center' });

      // Draw arrow to next
      if (i < totalItems - 1) {
        const arrowX = cx + segmentWidth / 2;
        doc.setDrawColor(160, 160, 160);
        doc.setLineWidth(0.3);
        doc.line(arrowX - 4, flowY - 1.5, arrowX + 2, flowY - 1.5);
        // Arrowhead
        doc.line(arrowX + 2, flowY - 1.5, arrowX, flowY - 2.5);
        doc.line(arrowX + 2, flowY - 1.5, arrowX, flowY - 0.5);
      }
    });

    y += 14;
  }

  // --- Summary Stats ---
  const configuredCount = levels.filter((l, i) => i > 0 && criteria.some(c => c.stylist_level_id === l.dbId && c.is_active)).length;
  const unconfiguredCount = levels.filter((_l, i) => i > 0).length - configuredCount;
  const retentionCount = levels.filter(l => retentionCriteria.some(r => r.stylist_level_id === l.dbId && r.is_active && r.retention_enabled)).length;

  doc.setFillColor(248, 248, 250);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(14, y, pageWidth - 28, 16, 3, 3, 'FD');

  const stats = [
    { label: 'Total Levels', value: `${levels.length}` },
    { label: 'Graduation Paths', value: `${configuredCount}` },
    { label: 'Retention Rules', value: `${retentionCount}` },
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

  y += 22;

  // --- Promotion Requirements Table ---
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Required to Graduate — Promotion Criteria by Level', 14, y);
  y += 4;

  const tableHead = ['Tier', 'Level Name', 'Commission', 'Requirements', 'Weights', 'Eval Window', 'Approval'];
  const tableBody = levels.map(level => {
    const c = criteria.find(cr => cr.stylist_level_id === level.dbId);
    const comm = commissions.find(cm => cm.dbId === level.dbId);
    return formatCriteriaRow(level, c, comm);
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
      0: { cellWidth: 16 },
      1: { cellWidth: 30 },
      2: { cellWidth: 28 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 42 },
      5: { cellWidth: 20 },
      6: { cellWidth: 18 },
    },
  });

  // --- Retention Requirements Table ---
  if (retentionCriteria.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || y + 40;
    let retY = finalY + 10;

    // Check if we need a new page
    if (retY > pageHeight - 50) {
      doc.addPage();
      retY = 20;
    }

    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Required to Stay — Retention Criteria by Level', 14, retY);
    retY += 4;

    const retHead = ['Tier', 'Level Name', 'Minimums', 'Eval Window', 'Grace Period', 'Action'];
    const retBody = levels.map(level => {
      const r = retentionCriteria.find(rc => rc.stylist_level_id === level.dbId);
      return formatRetentionRow(level, r);
    });

    autoTable(doc, {
      startY: retY,
      head: [retHead],
      body: retBody,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      headStyles: {
        fillColor: [120, 40, 40],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2.5,
      },
      alternateRowStyles: {
        fillColor: [255, 248, 248],
      },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 30 },
      },
    });
  }

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
