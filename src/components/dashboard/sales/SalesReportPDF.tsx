import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2, Download } from 'lucide-react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyWhole } from '@/lib/formatCurrency';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SalesReportPDFProps {
  dateFrom: string;
  dateTo: string;
  orgName?: string;
  metrics?: {
    totalRevenue: number;
    serviceRevenue: number;
    productRevenue: number;
    totalServices: number;
    totalProducts: number;
    averageTicket: number;
  } | null;
  stylistData?: Array<{
    name: string;
    totalRevenue: number;
    serviceRevenue: number;
    productRevenue: number;
    totalServices: number;
    totalProducts: number;
  }>;
  locationData?: Array<{
    name: string;
    totalRevenue: number;
    serviceRevenue: number;
    productRevenue: number;
    totalServices: number;
    totalProducts: number;
  }>;
}

export function SalesReportPDF({ dateFrom, dateTo, metrics, stylistData, locationData }: SalesReportPDFProps) {
  const { formatDate } = useFormatDate();
  const { formatNumber } = useFormatNumber();
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState({
    includeSummary: true,
    includeStylistBreakdown: true,
    includeLocationBreakdown: true,
    includeCharts: false,
  });

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Header
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Sales Report', pageWidth / 2, y, { align: 'center' });
      
      y += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(
        `${formatDate(new Date(dateFrom), 'MMM d, yyyy')} - ${formatDate(new Date(dateTo), 'MMM d, yyyy')}`,
        pageWidth / 2,
        y,
        { align: 'center' }
      );
      
      y += 5;
      doc.text(
        `Generated on ${formatDate(new Date(), 'MMM d, yyyy h:mm a')}`,
        pageWidth / 2,
        y,
        { align: 'center' }
      );
      
      doc.setTextColor(0);
      y += 15;

      // Summary Section
      if (options.includeSummary && metrics) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, y);
        y += 8;

        autoTable(doc, {
          startY: y,
          head: [['Metric', 'Value']],
          body: [
            ['Total Revenue', formatCurrencyWhole(metrics.totalRevenue)],
            ['Service Revenue', formatCurrencyWhole(metrics.serviceRevenue)],
            ['Product Revenue', formatCurrencyWhole(metrics.productRevenue)],
            ['Total Services', formatNumber(metrics.totalServices)],
            ['Total Products', formatNumber(metrics.totalProducts)],
            ['Average Ticket', formatCurrencyWhole(Math.round(metrics.averageTicket))],
          ],
          theme: 'striped',
          headStyles: { fillColor: [51, 51, 51] },
          margin: { left: 14, right: 14 },
        });

        y = (doc as any).lastAutoTable.finalY + 15;
      }

      // Stylist Breakdown
      if (options.includeStylistBreakdown && stylistData && stylistData.length > 0) {
        // Check if we need a new page
        if (y > 220) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Sales by Stylist', 14, y);
        y += 8;

        autoTable(doc, {
          startY: y,
          head: [['Rank', 'Stylist', 'Total Revenue', 'Services', 'Retail']],
          body: stylistData.slice(0, 15).map((s, idx) => [
            `#${idx + 1}`,
            s.name,
            formatCurrencyWhole(s.totalRevenue),
            formatCurrencyWhole(s.serviceRevenue),
            formatCurrencyWhole(s.productRevenue),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [51, 51, 51] },
          margin: { left: 14, right: 14 },
        });

        y = (doc as any).lastAutoTable.finalY + 15;
      }

      // Location Breakdown
      if (options.includeLocationBreakdown && locationData && locationData.length > 0) {
        // Check if we need a new page
        if (y > 220) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Sales by Location', 14, y);
        y += 8;

        autoTable(doc, {
          startY: y,
          head: [['Location', 'Total Revenue', 'Services', 'Retail', 'Transactions']],
          body: locationData.map(l => [
            l.name,
            formatCurrencyWhole(l.totalRevenue),
            formatNumber(l.totalServices),
            formatNumber(l.totalProducts),
            formatNumber(l.totalServices + l.totalProducts),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [51, 51, 51] },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save
      const filename = `sales-report-${dateFrom}-to-${dateTo}.pdf`;
      doc.save(filename);
      setOpen(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={tokens.button.card}>
          <FileText className="w-4 h-4 mr-2" />
          PDF Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Sales Report
          </DialogTitle>
          <DialogDescription>
            Create a branded PDF report for team meetings or records
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Date Range</span>
            <Badge variant="outline">
              {formatDate(new Date(dateFrom), 'MMM d')} - {formatDate(new Date(dateTo), 'MMM d, yyyy')}
            </Badge>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Include in report:</p>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="summary"
                checked={options.includeSummary}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeSummary: !!checked }))
                }
              />
              <Label htmlFor="summary" className="text-sm">
                Summary metrics
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="stylists"
                checked={options.includeStylistBreakdown}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeStylistBreakdown: !!checked }))
                }
              />
              <Label htmlFor="stylists" className="text-sm">
                Stylist breakdown (top 15)
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="locations"
                checked={options.includeLocationBreakdown}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeLocationBreakdown: !!checked }))
                }
              />
              <Label htmlFor="locations" className="text-sm">
                Location breakdown
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={generatePDF} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
