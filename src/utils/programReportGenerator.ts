import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface EnrollmentData {
  current_day: number;
  streak_count: number;
  status: string;
  start_date: string;
  restart_count: number;
  completed_at: string | null;
}

interface CompletionData {
  day_number: number;
  completion_date: string;
  is_complete: boolean;
}

interface BellEntry {
  ticket_value: number;
  service_booked: string;
  created_at: string;
}

interface ReportData {
  userName: string;
  enrollment: EnrollmentData;
  completions: CompletionData[];
  bellEntries: BellEntry[];
  weeklyAssignmentsCompleted: number;
  totalWeeklyAssignments: number;
}

export function generateProgressReport(data: ReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT ENGINE', pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('CLIENT ENGINE PROGRESS REPORT', pageWidth / 2, 35, { align: 'center' });
  
  // Participant info
  doc.setFontSize(12);
  doc.text(`Participant: ${data.userName}`, 20, 50);
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, 20, 58);
  doc.text(`Start Date: ${format(new Date(data.enrollment.start_date), 'MMMM d, yyyy')}`, 20, 66);
  
  // Status badge
  const statusColors: Record<string, number[]> = {
    active: [34, 197, 94],
    completed: [59, 130, 246],
    paused: [234, 179, 8],
  };
  const statusColor = statusColors[data.enrollment.status] || [156, 163, 175];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - 60, 48, 40, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(data.enrollment.status.toUpperCase(), pageWidth - 40, 55, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  
  // Progress section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PROGRESS OVERVIEW', 20, 85);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  
  const progressPercent = Math.round((data.enrollment.current_day / 75) * 100);
  
  // Progress bar
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(20, 92, 170, 8, 2, 2, 'F');
  doc.setFillColor(0, 0, 0);
  doc.roundedRect(20, 92, (170 * progressPercent) / 100, 8, 2, 2, 'F');
  
  doc.text(`${progressPercent}% Complete`, pageWidth - 20, 98, { align: 'right' });
  
  // Stats grid
  const stats = [
    ['Current Day', `Day ${data.enrollment.current_day} of 75`],
    ['Current Streak', `${data.enrollment.streak_count} days`],
    ['Days Completed', `${data.completions.length}`],
    ['Restarts', `${data.enrollment.restart_count}`],
    ['Weekly Assignments', `${data.weeklyAssignmentsCompleted} / ${data.totalWeeklyAssignments}`],
  ];
  
  autoTable(doc, {
    startY: 110,
    head: [],
    body: stats,
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { cellWidth: 90 },
    },
    margin: { left: 20 },
  });
  
  // Bell entries section
  if (data.bellEntries.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 140;
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RING THE BELL ENTRIES', 20, finalY + 15);
    
    const totalRevenue = data.bellEntries.reduce((sum, e) => sum + e.ticket_value, 0);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Revenue: $${totalRevenue.toLocaleString()}`, 20, finalY + 25);
    doc.text(`Total Bells: ${data.bellEntries.length}`, 100, finalY + 25);
    
    const bellData = data.bellEntries.slice(0, 10).map(entry => [
      format(new Date(entry.created_at), 'MMM d, yyyy'),
      entry.service_booked,
      `$${entry.ticket_value.toLocaleString()}`,
    ]);
    
    autoTable(doc, {
      startY: finalY + 32,
      head: [['Date', 'Service', 'Value']],
      body: bellData,
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [0, 0, 0] },
      margin: { left: 20, right: 20 },
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      'Client Engine Program',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Save
  const fileName = `client-engine-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

export function generateCompletionCertificate(userName: string, completedAt: Date): void {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.5);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);
  
  // Header
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICATE OF COMPLETION', pageWidth / 2, 50, { align: 'center' });
  
  // Subheader
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text('CLIENT ENGINE PROGRAM', pageWidth / 2, 65, { align: 'center' });
  
  // Decorative line
  doc.setLineWidth(1);
  doc.line(60, 75, pageWidth - 60, 75);
  
  // Body text
  doc.setFontSize(14);
  doc.text('This certifies that', pageWidth / 2, 95, { align: 'center' });
  
  // Name
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(userName, pageWidth / 2, 115, { align: 'center' });
  
  // Achievement text
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('has successfully completed the 75-Day Client Engine Program,', pageWidth / 2, 135, { align: 'center' });
  doc.text('demonstrating exceptional dedication, consistency, and growth.', pageWidth / 2, 147, { align: 'center' });
  
  // Date
  doc.setFontSize(12);
  doc.text(`Completed on ${format(completedAt, 'MMMM d, yyyy')}`, pageWidth / 2, 170, { align: 'center' });
  
  // Signature line
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 60, 190, pageWidth / 2 + 60, 190);
  doc.setFontSize(10);
  doc.text('Program Director', pageWidth / 2, 198, { align: 'center' });
  
  // Save
  const fileName = `client-engine-certificate-${userName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName);
}
