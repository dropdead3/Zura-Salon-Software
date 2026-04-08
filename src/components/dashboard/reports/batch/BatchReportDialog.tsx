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
import { REPORT_CATALOG, REPORT_CATEGORIES, getReportTier, filterReportsByTier } from '@/config/reportCatalog';
import { useBatchReportGenerator, type BatchReportConfig } from './useBatchReportGenerator';

interface BatchReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  sales: DollarSign,
  staff: Users,
  clients: UserCheck,
  operations: Clock,
  financial: TrendingUp,
  'gift-cards': CreditCard,
};

export function BatchReportDialog({ open, onOpenChange, dateFrom, dateTo, locationId }: BatchReportDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [outputFormat, setOutputFormat] = useState<'merged' | 'zip'>('merged');
  const { data: locations } = useLocations();
  const locationCount = locations?.length ?? 1;
  const reportTier = getReportTier(locationCount);

  const filteredReports = useMemo(() => {
    return filterReportsByTier(REPORT_CATALOG, reportTier);
  }, [reportTier]);

  const groupedReports = useMemo(() => {
    const map = new Map<string, typeof REPORT_CATALOG>();
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
      const report = REPORT_CATALOG.find(r => r.id === id);
      return { reportId: id, reportName: report?.name || id };
    }),
  [selectedIds]);

  const { generate, isGenerating, progress, progressLabel } = useBatchReportGenerator();

  const handleGenerate = async () => {
    if (configs.length === 0) return;
    await generate({ configs, dateFrom, dateTo, locationId, outputFormat });
    setSelectedIds(new Set());
    onOpenChange(false);
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
                  const Icon = CATEGORY_ICONS[cat.id] || DollarSign;

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
