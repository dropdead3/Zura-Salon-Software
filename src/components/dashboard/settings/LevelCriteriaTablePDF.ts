/**
 * Spreadsheet-style PDF export for the Level Criteria Comparison table.
 * Landscape A4, using jsPDF + jspdf-autotable.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { registerPdfFonts, setTermina, setAeonik } from '@/lib/pdf-fonts';
import type { LevelPromotionCriteria } from '@/hooks/useLevelPromotionCriteria';
import type { LevelRetentionCriteria } from '@/hooks/useLevelRetentionCriteria';

interface LevelInfo {
  label: string;
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

export interface LevelCriteriaTablePDFOptions {
  orgName: string;
  levels: LevelInfo[];
  criteria: LevelPromotionCriteria[];
  retentionCriteria?: LevelRetentionCriteria[];
  commissions?: LevelCommission[];
  currencySymbol?: string;
}

function findPromo(criteria: LevelPromotionCriteria[], dbId?: string) {
  return criteria.find(c => c.stylist_level_id === dbId) ?? null;
}

function findRetention(criteria: LevelRetentionCriteria[] | undefined, dbId?: string) {
  if (!criteria) return null;
  return criteria.find(c => c.stylist_level_id === dbId) ?? null;
}

function findCommission(commissions: LevelCommission[] | undefined, dbId?: string) {
  if (!commissions) return null;
  return commissions.find(c => c.dbId === dbId) ?? null;
}

function val(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

export function generateLevelCriteriaTablePDF(options: LevelCriteriaTablePDFOptions): jsPDF {
  const { orgName, levels, criteria, retentionCriteria, commissions, currencySymbol = '$' } = options;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerPdfFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();

  // ── Header ──
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pageWidth, 22, 'F');

  setTermina(doc);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('LEVEL CRITERIA COMPARISON', 14, 10);

  setAeonik(doc);
  doc.setFontSize(8);
  doc.text(orgName, 14, 17);
  doc.text(`Generated ${format(now, 'MMM d, yyyy')}`, pageWidth - 14, 17, { align: 'right' });

  // ── Build table data ──
  const levelHeaders = levels.map((l, i) => `Level ${i + 1}: ${l.label}`);
  const head = [['Metric', ...levelHeaders]];

  type RowStyle = 'section' | 'normal';
  const body: { cells: string[]; style: RowStyle }[] = [];

  // Section: COMPENSATION
  body.push({ cells: ['COMPENSATION', ...levels.map(() => '')], style: 'section' });

  body.push({
    cells: ['Service Commission', ...levels.map(l => {
      const c = findCommission(commissions, l.dbId);
      return c ? `${c.serviceCommissionRate}%` : '—';
    })],
    style: 'normal',
  });

  body.push({
    cells: ['Retail Commission', ...levels.map(l => {
      const c = findCommission(commissions, l.dbId);
      return c ? `${c.retailCommissionRate}%` : '—';
    })],
    style: 'normal',
  });

  body.push({
    cells: ['Hourly Wage', ...levels.map(l => {
      const c = findCommission(commissions, l.dbId);
      if (!c?.hourlyWageEnabled || !c.hourlyWage) return '—';
      return `${currencySymbol}${c.hourlyWage}`;
    })],
    style: 'normal',
  });

  // Section: PROMOTION
  body.push({ cells: ['PROMOTION CRITERIA', ...levels.map(() => '')], style: 'section' });

  const promoRows: { label: string; fn: (p: LevelPromotionCriteria | null) => string }[] = [
    { label: 'Revenue', fn: p => p?.revenue_enabled ? `${currencySymbol}${p.revenue_threshold.toLocaleString()}` : '—' },
    { label: 'Retail %', fn: p => p?.retail_enabled ? `${p.retail_pct_threshold}%` : '—' },
    { label: 'Rebooking %', fn: p => p?.rebooking_enabled ? `${p.rebooking_pct_threshold}%` : '—' },
    { label: 'Avg Ticket', fn: p => p?.avg_ticket_enabled ? `${currencySymbol}${p.avg_ticket_threshold}` : '—' },
    { label: 'Client Retention', fn: p => p?.retention_rate_enabled ? `${p.retention_rate_threshold}%` : '—' },
    { label: 'New Clients', fn: p => p?.new_clients_enabled ? `${p.new_clients_threshold}/mo` : '—' },
    { label: 'Utilization', fn: p => p?.utilization_enabled ? `${p.utilization_threshold}%` : '—' },
    { label: 'Rev/Hr', fn: p => p?.rev_per_hour_enabled ? `${currencySymbol}${p.rev_per_hour_threshold}` : '—' },
    { label: 'Level Tenure', fn: p => p?.tenure_enabled ? `${p.tenure_days}d` : '—' },
    { label: 'Eval Window', fn: p => p ? `${p.evaluation_window_days}d` : '—' },
    { label: 'Approval', fn: p => p ? (p.requires_manual_approval ? 'Manual' : 'Auto') : '—' },
  ];

  promoRows.forEach(row => {
    body.push({
      cells: [row.label, ...levels.map(l => row.fn(findPromo(criteria, l.dbId)))],
      style: 'normal',
    });
  });

  // Section: RETENTION
  body.push({ cells: ['RETENTION POLICY', ...levels.map(() => '')], style: 'section' });

  const retRows: { label: string; fn: (r: LevelRetentionCriteria | null) => string }[] = [
    { label: 'Eval Window', fn: r => r?.retention_enabled ? `${r.evaluation_window_days}d` : '—' },
    { label: 'Grace Period', fn: r => r?.retention_enabled ? `${r.grace_period_days}d` : '—' },
    { label: 'Action', fn: r => r?.retention_enabled ? (r.action_type === 'demotion_eligible' ? 'Demotion' : 'Coaching') : '—' },
  ];

  retRows.forEach(row => {
    body.push({
      cells: [row.label, ...levels.map(l => row.fn(findRetention(retentionCriteria, l.dbId)))],
      style: 'normal',
    });
  });

  // ── Render table ──
  const sectionRowIndices = new Set(body.map((r, i) => r.style === 'section' ? i : -1).filter(i => i >= 0));

  autoTable(doc, {
    startY: 28,
    head,
    body: body.map(r => r.cells),
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [40, 40, 40],
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', cellWidth: 36 },
    },
    alternateRowStyles: {
      fillColor: [248, 248, 250],
    },
    didParseCell: (data) => {
      // Center all level columns
      if (data.section === 'body' && data.column.index > 0) {
        data.cell.styles.halign = 'center';
      }
      // Style section header rows
      if (data.section === 'body' && sectionRowIndices.has(data.row.index)) {
        data.cell.styles.fillColor = [60, 60, 60];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 7;
        if (data.column.index > 0) {
          data.cell.text = [''];
        }
      }
    },
  });

  // ── Footer ──
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    setAeonik(doc);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(orgName, 14, pageHeight - 8);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    doc.text('Confidential — For internal use only', pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  return doc;
}
