import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Download, Copy, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { tokens } from '@/lib/design-tokens';

interface ExportData {
  stylistData?: any[];
  locationData?: any[];
  dailyData?: any[];
  metrics?: any;
}

interface GoogleSheetsExportProps {
  data: ExportData;
  dateFrom: string;
  dateTo: string;
}

export function GoogleSheetsExport({ data, dateFrom, dateTo }: GoogleSheetsExportProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [exportOptions, setExportOptions] = useState({
    summary: true,
    byStylists: true,
    byLocation: true,
    dailyTrend: true,
  });

  const generateCSV = () => {
    const sheets: string[] = [];
    const separator = '\n\n'; // Double newline between sections

    // Summary section
    if (exportOptions.summary && data.metrics) {
      sheets.push('=== SUMMARY ===');
      sheets.push(`Period,${dateFrom} to ${dateTo}`);
      sheets.push(`Total Revenue,$${data.metrics.totalRevenue?.toLocaleString() || 0}`);
      sheets.push(`Service Revenue,$${data.metrics.serviceRevenue?.toLocaleString() || 0}`);
      sheets.push(`Product Revenue,$${data.metrics.productRevenue?.toLocaleString() || 0}`);
      sheets.push(`Total Services,${data.metrics.totalServices || 0}`);
      sheets.push(`Total Products,${data.metrics.totalProducts || 0}`);
      sheets.push(`Average Ticket,$${Math.round(data.metrics.averageTicket || 0)}`);
    }

    // By Stylist section
    if (exportOptions.byStylists && data.stylistData?.length) {
      sheets.push(separator);
      sheets.push('=== BY STYLIST ===');
      sheets.push('Name,Total Revenue,Service Revenue,Product Revenue,Services,Products,Transactions,Avg Ticket');
      data.stylistData.forEach(s => {
        const avgTicket = s.totalTransactions > 0 ? s.totalRevenue / s.totalTransactions : 0;
        sheets.push([
          `"${s.name}"`,
          s.totalRevenue.toFixed(2),
          s.serviceRevenue.toFixed(2),
          s.productRevenue.toFixed(2),
          s.totalServices,
          s.totalProducts,
          s.totalTransactions,
          avgTicket.toFixed(2),
        ].join(','));
      });
    }

    // By Location section
    if (exportOptions.byLocation && data.locationData?.length) {
      sheets.push(separator);
      sheets.push('=== BY LOCATION ===');
      sheets.push('Location,Total Revenue,Service Revenue,Product Revenue,Services,Products,Transactions');
      data.locationData.forEach(l => {
        sheets.push([
          `"${l.name}"`,
          l.totalRevenue.toFixed(2),
          l.serviceRevenue.toFixed(2),
          l.productRevenue.toFixed(2),
          l.totalServices,
          l.totalProducts,
          l.totalTransactions,
        ].join(','));
      });
    }

    // Daily Trend section
    if (exportOptions.dailyTrend && data.dailyData?.length) {
      sheets.push(separator);
      sheets.push('=== DAILY TREND ===');
      sheets.push('Date,Revenue,Services,Products,Transactions');
      data.dailyData.forEach(d => {
        sheets.push([
          d.date,
          d.revenue?.toFixed(2) || 0,
          d.services || 0,
          d.products || 0,
          d.transactions || 0,
        ].join(','));
      });
    }

    return sheets.join('\n');
  };

  const handleExport = () => {
    setIsExporting(true);
    
    try {
      const csv = generateCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export complete',
        description: 'CSV file downloaded. Open in Google Sheets to import.',
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not generate export file.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const csv = generateCSV();
      // Convert CSV to tab-separated for better Google Sheets paste
      const tsv = csv.replace(/,/g, '\t');
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: 'Copied to clipboard',
        description: 'Paste directly into Google Sheets.',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const optionCount = Object.values(exportOptions).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={tokens.button.card}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export to Sheets
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Export to Google Sheets
          </DialogTitle>
          <DialogDescription>
            Select data to export as CSV or copy directly to clipboard
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Period: {dateFrom} to {dateTo}
            </span>
            <Badge variant="outline">{optionCount} sections selected</Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="summary" 
                checked={exportOptions.summary}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, summary: !!checked }))
                }
              />
              <Label htmlFor="summary" className="flex-1 cursor-pointer">
                <span className="font-medium">Summary Overview</span>
                <span className="block text-xs text-muted-foreground">
                  Total revenue, averages, key metrics
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="stylists" 
                checked={exportOptions.byStylists}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, byStylists: !!checked }))
                }
              />
              <Label htmlFor="stylists" className="flex-1 cursor-pointer">
                <span className="font-medium">By Stylist</span>
                <span className="block text-xs text-muted-foreground">
                  {data.stylistData?.length || 0} stylists with revenue breakdown
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="locations" 
                checked={exportOptions.byLocation}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, byLocation: !!checked }))
                }
              />
              <Label htmlFor="locations" className="flex-1 cursor-pointer">
                <span className="font-medium">By Location</span>
                <span className="block text-xs text-muted-foreground">
                  {data.locationData?.length || 0} locations with performance data
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="daily" 
                checked={exportOptions.dailyTrend}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, dailyTrend: !!checked }))
                }
              />
              <Label htmlFor="daily" className="flex-1 cursor-pointer">
                <span className="font-medium">Daily Trend</span>
                <span className="block text-xs text-muted-foreground">
                  {data.dailyData?.length || 0} days of trend data
                </span>
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleCopyToClipboard}
            disabled={optionCount === 0}
            className="w-full sm:w-auto"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-chart-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy for Sheets
              </>
            )}
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting || optionCount === 0}
            className="w-full sm:w-auto"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
