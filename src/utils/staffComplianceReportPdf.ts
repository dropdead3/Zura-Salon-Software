/**
 * Generates a Staff Compliance Report PDF for 1:1 coaching sessions.
 * Uses jsPDF + jspdf-autotable.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { StaffComplianceBreakdown, ComplianceLogItem } from '@/hooks/backroom/useBackroomComplianceTracker';

export interface StaffComplianceReportOptions {
  orgName: string;
  staffName: string;
  staffBreakdown: StaffComplianceBreakdown;
  items: ComplianceLogItem[];
  dateFrom: string;
  dateTo: string;
}

function getComplianceLabel(rate: number): string {
  if (rate >= 90) return 'STRONG';
  if (rate >= 70) return 'WATCH';
  return 'NEEDS ATTENTION';
}

function getComplianceColor(rate: number): [number, number, number] {
  if (rate >= 90) return [34, 139, 34];
  if (rate >= 70) return [200, 150, 0];
  return [200, 50, 50];
}

export function generateStaffComplianceReportPdf(options: StaffComplianceReportOptions): jsPDF {
  const { orgName, staffName, staffBreakdown: staff, items, dateFrom, dateTo } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();

  // --- Header ---
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Staff Compliance Report', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(orgName, 14, 19);
  doc.text(`Generated: ${format(now, 'MMM d, yyyy h:mm a')}`, 14, 24);

  doc.text(`Period: ${dateFrom} — ${dateTo}`, pageWidth - 14, 19, { align: 'right' });

  // --- Staff Name + Badge ---
  let y = 38;
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(staffName, 14, y);

  const badgeLabel = getComplianceLabel(staff.complianceRate);
  const badgeColor = getComplianceColor(staff.complianceRate);
  const badgeX = 14 + doc.getTextWidth(staffName) + 6;
  doc.setFillColor(...badgeColor);
  const badgeW = doc.getTextWidth(badgeLabel) + 8;
  doc.roundedRect(badgeX, y - 5, badgeW, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(badgeLabel, badgeX + badgeW / 2, y - 0.5, { align: 'center' });

  // --- Summary Card ---
  y = 50;
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 248, 250);
  doc.roundedRect(14, y, pageWidth - 28, 32, 3, 3, 'FD');

  const reweighRate = staff.total > 0 && staff.total - staff.missing > 0
    ? Math.round(((staff as any).reweighed ?? 0) / (staff.total - staff.missing) * 100)
    : 0;

  const summaryItems = [
    { label: 'Compliance Rate', value: `${staff.complianceRate}%` },
    { label: 'Total Appointments', value: `${staff.total}` },
    { label: 'Missing Sessions', value: `${staff.missing}` },
    { label: 'Reweigh Rate', value: `${reweighRate}%` },
    { label: 'Waste Rate', value: `${staff.wastePct}%` },
    { label: 'Est. Waste Cost', value: `$${staff.wasteCost.toFixed(2)}` },
  ];

  const colW = (pageWidth - 28) / summaryItems.length;
  summaryItems.forEach((item, i) => {
    const cx = 14 + colW * i + colW / 2;
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(item.label, cx, y + 10, { align: 'center' });
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(item.value, cx, y + 22, { align: 'center' });
  });

  // --- Appointment Detail Table ---
  y = 90;
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Appointment Details', 14, y);
  y += 4;

  const tableHead = ['Date', 'Service', 'Status', 'Reweigh', 'Waste %'];
  const tableBody = items.map((item) => [
    item.appointmentDate,
    item.serviceName ?? 'Color Service',
    item.complianceStatus === 'compliant' ? 'Tracked' : item.complianceStatus === 'partial' ? 'Partial' : 'Missing',
    item.hasReweigh ? 'Yes' : 'No',
    '—', // waste per-item isn't available at item level
  ]);

  if (tableBody.length === 0) {
    tableBody.push(['No appointments found for this period', '', '', '', '']);
  }

  autoTable(doc, {
    startY: y,
    head: [tableHead],
    body: tableBody,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 250],
    },
  });

  // --- Coaching Notes Section ---
  const tableEndY = (doc as any).lastAutoTable?.finalY ?? y + 30;
  let notesY = tableEndY + 12;

  // Check if we need a new page
  const pageHeight = doc.internal.pageSize.getHeight();
  if (notesY + 60 > pageHeight - 20) {
    doc.addPage();
    notesY = 20;
  }

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Coaching Notes', 14, notesY);
  notesY += 4;

  doc.setDrawColor(200, 200, 210);
  doc.setLineWidth(0.3);
  const lineSpacing = 8;
  const lineCount = 8;
  for (let i = 0; i < lineCount; i++) {
    const ly = notesY + i * lineSpacing;
    doc.line(14, ly, pageWidth - 14, ly);
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
