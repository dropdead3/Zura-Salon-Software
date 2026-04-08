import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package,
  Download,
  Loader2,
  DollarSign,
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  CreditCard,
} from 'lucide-react';
import { useLocations } from '@/hooks/useLocations';
import { getReportTier, filterReportsByTier } from '@/config/reportCatalog';
import { useBatchReportGenerator, type BatchReportConfig } from './useBatchReportGenerator';

interface BatchReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

interface ReportOption {
  id: string;
  name: string;
  category: string;
}

const REPORT_CATEGORIES = [
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'clients', label: 'Clients', icon: UserCheck },
  { id: 'operations', label: 'Operations', icon: Clock },
  { id: 'financial', label: 'Financial', icon: TrendingUp },
  { id: 'gift-cards', label: 'Gift Cards', icon: CreditCard },
];

const ALL_REPORTS: ReportOption[] = [
  // Sales
  { id: 'daily-sales', name: 'Daily Sales Summary', category: 'sales' },
  { id: 'stylist-sales', name: 'Sales by Stylist', category: 'sales' },
  { id: 'location-sales', name: 'Sales by Location', category: 'sales' },
  { id: 'product-sales', name: 'Product Sales Report', category: 'sales' },
  { id: 'retail-products', name: 'Retail Product Report', category: 'sales' },
  { id: 'retail-staff', name: 'Retail Sales by Staff', category: 'sales' },
  { id: 'category-mix', name: 'Service Category Mix', category: 'sales' },
  { id: 'tax-summary', name: 'Tax Summary', category: 'sales' },
  { id: 'discounts', name: 'Discounts & Promotions', category: 'sales' },
  // Staff
  { id: 'staff-kpi', name: 'Staff KPI Report', category: 'staff' },
  { id: 'tip-analysis', name: 'Tip Analysis', category: 'staff' },
  { id: 'staff-transaction-detail', name: 'Staff Transaction Detail', category: 'staff' },
  { id: 'compensation-ratio', name: 'Compensation Ratio', category: 'staff' },
  // Clients
  { id: 'client-attrition', name: 'Client Attrition', category: 'clients' },
  { id: 'top-clients', name: 'Top Clients', category: 'clients' },
  { id: 'client-birthdays', name: 'Client Birthdays', category: 'clients' },
  { id: 'client-source', name: 'Client Source', category: 'clients' },
  { id: 'duplicate-clients', name: 'Duplicate Clients', category: 'clients' },
  // Operations
  { id: 'no-show-enhanced', name: 'No-Shows & Cancellations', category: 'operations' },
  { id: 'deleted-appointments', name: 'Deleted Appointments', category: 'operations' },
  { id: 'demand-heatmap', name: 'Demand Heatmap', category: 'operations' },
  { id: 'future-appointments', name: 'Future Appointments Value', category: 'operations' },
  // Financial
  { id: 'executive-summary', name: 'Executive Summary', category: 'financial' },
  { id: 'payroll-summary', name: 'Payroll Summary', category: 'financial' },
  { id: 'end-of-month', name: 'End-of-Month Summary', category: 'financial' },
  { id: 'service-profitability', name: 'Service Profitability', category: 'financial' },
  { id: 'chemical-cost', name: 'Chemical Cost Report', category: 'financial' },
  { id: 'location-benchmark', name: 'Location Benchmarking', category: 'financial' },
  // Gift Cards
  { id: 'gift-cards', name: 'Gift Cards', category: 'gift-cards' },
  { id: 'vouchers', name: 'Vouchers', category: 'gift-cards' },
];

export function BatchReportDialog({ open, onOpenChange, dateFrom, dateTo, locationId }: BatchReportDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [outputFormat, setOutputFormat] = useState<'merged' | 'zip'>('merged');
  const { data: locations } = useLocations();
  const locationCount = locations?.length ?? 1;
  const reportTier = getReportTier(locationCount);

  const filteredReports = useMemo(() => {
    return filterReportsByTier(ALL_REPORTS, reportTier);
  }, [reportTier]);

  const groupedReports = useMemo(() => {
    const map = new Map<string, ReportOption[]>();
    for (const r of filteredReports) {
      const list = map.get(r.category) || [];
      list.push(r);
      map.set(r.category, list);
    }
    return map;
  }, [filteredReports]);

  const toggleReport = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 15) next.add(id);
      return next;
    });
  };

  const toggleCategory = (categoryId: string) => {
    const reports = groupedReports.get(categoryId) || [];
    const allSelected = reports.every(r => selectedIds.has(r.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const r of reports) {
        if (allSelected) next.delete(r.id);
        else if (next.size < 15) next.add(r.id);
      }
      return next;
    });
  };

  const configs: BatchReportConfig[] = useMemo(() => 
    Array.from(selectedIds).map(id => {
      const report = ALL_REPORTS.find(r => r.id === id);
      return { reportId: id, reportName: report?.name || id };
    }),
  [selectedIds]);

  const { generate, isGenerating, progress, progressLabel } = useBatchReportGenerator();

  const handleGenerate = async () => {
    if (configs.length === 0) return;
    await generate({ configs, dateFrom, dateTo, locationId, outputFormat });
    onOpenChange(false);
    setSelectedIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Generate Report Pack
          </DialogTitle>
          <DialogDescription>
            Select reports to download as a single merged PDF or separate PDFs in a ZIP.
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">{progressLabel}</p>
            <Progress value={progress} className="w-64" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-1 mb-2">
              <Badge variant="outline">{selectedIds.size} of 15 max</Badge>
              <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as 'merged' | 'zip')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merged">Single Merged PDF</SelectItem>
                  <SelectItem value="zip">Separate PDFs (ZIP)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="flex-1 max-h-[400px] pr-4">
              <div className="space-y-5">
                {REPORT_CATEGORIES.map(cat => {
                  const reports = groupedReports.get(cat.id);
                  if (!reports || reports.length === 0) return null;
                  const allSelected = reports.every(r => selectedIds.has(r.id));
                  const someSelected = reports.some(r => selectedIds.has(r.id));
                  const Icon = cat.icon;

                  return (
                    <div key={cat.id}>
                      <button
                        className="flex items-center gap-2 mb-2 text-sm font-medium hover:text-foreground transition-colors w-full text-left"
                        onClick={() => toggleCategory(cat.id)}
                      >
                        <Checkbox
                          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                          onCheckedChange={() => toggleCategory(cat.id)}
                          className="pointer-events-none"
                        />
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {cat.label}
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {reports.filter(r => selectedIds.has(r.id)).length}/{reports.length}
                        </Badge>
                      </button>
                      <div className="ml-8 space-y-1">
                        {reports.map(r => (
                          <label
                            key={r.id}
                            className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={selectedIds.has(r.id)}
                              onCheckedChange={() => toggleReport(r.id)}
                            />
                            <span className="text-sm">{r.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                disabled={selectedIds.size === 0}
                onClick={handleGenerate}
              >
                <Download className="w-4 h-4 mr-2" />
                Generate {selectedIds.size} Report{selectedIds.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
