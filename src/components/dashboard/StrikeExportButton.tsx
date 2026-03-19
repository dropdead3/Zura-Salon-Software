import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { toast } from 'sonner';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  StaffStrikeWithDetails,
  STRIKE_TYPE_LABELS,
  SEVERITY_LABELS,
  StrikeType,
  StrikeSeverity,
} from '@/hooks/useStaffStrikes';

interface StrikeExportButtonProps {
  strikes: StaffStrikeWithDetails[];
  filteredStrikes: StaffStrikeWithDetails[];
}

export function StrikeExportButton({ strikes, filteredStrikes }: StrikeExportButtonProps) {
  const { formatDate } = useFormatDate();
  const { data: businessSettings } = useBusinessSettings();
  const { effectiveOrganization } = useOrganizationContext();
  const orgSlug = (businessSettings?.business_name || effectiveOrganization?.name || '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = (data: StaffStrikeWithDetails[], filename: string) => {
    const headers = [
      'Employee Name',
      'Title',
      'Type',
      'Severity',
      'Status',
      'Incident Date',
      'Description',
      'Created By',
      'Created At',
      'Resolution Notes',
      'Resolved By',
      'Resolved At',
    ];

    const rows = data.map((strike) => [
      strike.employee_name || 'Unknown',
      strike.title,
      STRIKE_TYPE_LABELS[strike.strike_type as StrikeType],
      SEVERITY_LABELS[strike.severity as StrikeSeverity],
      strike.is_resolved ? 'Resolved' : 'Active',
      format(new Date(strike.incident_date), 'yyyy-MM-dd'),
      (strike.description || '').replace(/"/g, '""'),
      strike.created_by_name || 'Unknown',
      format(new Date(strike.created_at), 'yyyy-MM-dd HH:mm'),
      (strike.resolution_notes || '').replace(/"/g, '""'),
      strike.resolved_by_name || '',
      strike.resolved_at ? format(new Date(strike.resolved_at), 'yyyy-MM-dd HH:mm') : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${orgSlug ? orgSlug + '_' : ''}${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToPDF = async (data: StaffStrikeWithDetails[], filename: string) => {
    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'landscape' });

      // Title
      doc.setFontSize(18);
      doc.text('Staff Strikes Report', 14, 20);

      // Subtitle with date
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on ${formatDate(new Date(), 'MMMM d, yyyy h:mm a')}`, 14, 28);
      doc.text(`Total Records: ${data.length}`, 14, 34);

      // Summary stats
      const activeCount = data.filter((s) => !s.is_resolved).length;
      const resolvedCount = data.filter((s) => s.is_resolved).length;
      const criticalCount = data.filter((s) => s.severity === 'critical' && !s.is_resolved).length;
      doc.text(`Active: ${activeCount} | Resolved: ${resolvedCount} | Critical: ${criticalCount}`, 14, 40);

      // Table data
      const tableData = data.map((strike) => [
        strike.employee_name || 'Unknown',
        strike.title.length > 30 ? strike.title.substring(0, 30) + '...' : strike.title,
        STRIKE_TYPE_LABELS[strike.strike_type as StrikeType],
        SEVERITY_LABELS[strike.severity as StrikeSeverity],
        strike.is_resolved ? 'Resolved' : 'Active',
        format(new Date(strike.incident_date), 'MM/dd/yy'),
        strike.created_by_name || 'Unknown',
      ]);

      autoTable(doc, {
        startY: 46,
        head: [['Employee', 'Title', 'Type', 'Severity', 'Status', 'Date', 'Created By']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 60 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
          6: { cellWidth: 40 },
        },
      });

      doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={tokens.button.card} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            exportToCSV(filteredStrikes, 'strikes_filtered');
            toast.success('CSV exported successfully');
          }}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export Filtered (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            exportToCSV(strikes, 'strikes_all');
            toast.success('CSV exported successfully');
          }}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export All (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToPDF(filteredStrikes, 'strikes_filtered')}>
          <FileText className="w-4 h-4 mr-2" />
          Export Filtered (PDF)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToPDF(strikes, 'strikes_all')}>
          <FileText className="w-4 h-4 mr-2" />
          Export All (PDF)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
