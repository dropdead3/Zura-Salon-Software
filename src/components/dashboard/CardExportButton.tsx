import { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface CardExportButtonProps {
  cardId: string;
  title: string;
  dateRange: string;
  data: Record<string, any> | Record<string, any>[];
  disabled?: boolean;
}

export function CardExportButton({
  cardId,
  title,
  dateRange,
  data,
  disabled = false,
}: CardExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const generateCSV = () => {
    try {
      setIsExporting(true);
      
      const dataArray = Array.isArray(data) ? data : [data];
      if (dataArray.length === 0) {
        toast.error('No data to export');
        return;
      }

      // Get headers from first item
      const headers = Object.keys(dataArray[0]);
      
      // Build CSV content
      const csvRows = [
        headers.join(','),
        ...dataArray.map(row => 
          headers.map(header => {
            const value = row[header];
            // Handle values that might contain commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          }).join(',')
        )
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cardId}-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const generateTextReport = () => {
    try {
      setIsExporting(true);
      
      const dataArray = Array.isArray(data) ? data : [data];
      if (dataArray.length === 0) {
        toast.error('No data to export');
        return;
      }

      // Build text report
      let report = `${title}\n`;
      report += `Date Range: ${dateRange}\n`;
      report += `Generated: ${new Date().toLocaleString()}\n`;
      report += '─'.repeat(50) + '\n\n';

      dataArray.forEach((row, index) => {
        if (dataArray.length > 1) {
          report += `Record ${index + 1}:\n`;
        }
        Object.entries(row).forEach(([key, value]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          report += `  ${formattedKey}: ${value}\n`;
        });
        report += '\n';
      });

      const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cardId}-${dateRange}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={disabled || isExporting}
        >
          <Download className="h-3.5 w-3.5" />
          <span className="sr-only">Export data</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={generateCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={generateTextReport}>
          <FileText className="mr-2 h-4 w-4" />
          Export as Text
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
