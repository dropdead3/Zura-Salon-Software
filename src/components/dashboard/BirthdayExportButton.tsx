import { useState } from 'react';
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
import { ROLE_LABELS } from '@/hooks/useUserRoles';
import { tokens } from '@/lib/design-tokens';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface BirthdayPerson {
  id: string;
  full_name: string;
  display_name: string | null;
  photo_url: string | null;
  birthday: string;
  roles?: string[];
  nextBirthday: Date;
  daysUntil: number;
}

interface BirthdayExportButtonProps {
  birthdays: BirthdayPerson[];
}

export function BirthdayExportButton({ birthdays }: BirthdayExportButtonProps) {
  const { formatDate } = useFormatDate();
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = (data: BirthdayPerson[], filename: string) => {
    const headers = [
      'Name',
      'Display Name',
      'Birthday',
      'Next Birthday',
      'Days Until',
      'Roles',
    ];

    const rows = data.map((person) => [
      person.full_name,
      person.display_name || '',
      person.birthday ? formatDate(new Date(person.birthday + 'T00:00:00'), 'MMMM d') : '',
      formatDate(person.nextBirthday, 'MMMM d, yyyy'),
      person.daysUntil.toString(),
      person.roles?.map(role => ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role).join('; ') || '',
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
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToPDF = async (data: BirthdayPerson[], filename: string) => {
    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.text('Team Birthdays Report', 14, 20);

      // Subtitle with date
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on ${formatDate(new Date(), 'MMMM d, yyyy h:mm a')}`, 14, 28);
      doc.text(`Total Team Members: ${data.length}`, 14, 34);

      // Group by month for summary
      const monthCounts: Record<string, number> = {};
      data.forEach((person) => {
        const month = formatDate(new Date(person.birthday + 'T00:00:00'), 'MMMM');
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      });

      const monthSummary = Object.entries(monthCounts)
        .map(([month, count]) => `${month}: ${count}`)
        .join(' | ');
      
      doc.setFontSize(9);
      doc.text(monthSummary.length > 80 ? monthSummary.substring(0, 80) + '...' : monthSummary, 14, 40);

      // Table data - sorted by next birthday
      const sortedData = [...data].sort((a, b) => a.daysUntil - b.daysUntil);
      
      const tableData = sortedData.map((person) => [
        person.display_name || person.full_name,
        formatDate(new Date(person.birthday + 'T00:00:00'), 'MMMM d'),
        formatDate(person.nextBirthday, 'MMM d, yyyy'),
        person.daysUntil === 0 ? 'Today! 🎂' : person.daysUntil === 1 ? 'Tomorrow' : `${person.daysUntil} days`,
        person.roles?.map(role => ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role).join(', ') || '',
      ]);

      autoTable(doc, {
        startY: 46,
        head: [['Name', 'Birthday', 'Next Birthday', 'Days Until', 'Role(s)']],
        body: tableData,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [236, 72, 153], textColor: 255 },
        alternateRowStyles: { fillColor: [253, 242, 248] },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 30 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
          4: { cellWidth: 45 },
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

  if (!birthdays || birthdays.length === 0) {
    return null;
  }

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
            exportToCSV(birthdays, 'team_birthdays');
            toast.success('CSV exported successfully');
          }}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToPDF(birthdays, 'team_birthdays')}>
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
