import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Loader2, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { useDemandHeatmap } from '@/hooks/useDemandHeatmap';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7-21

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function DemandHeatmapReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data, isLoading } = useDemandHeatmap(dateFrom, dateTo, locationId);
  const cells = data?.cells ?? [];
  const maxCount = data?.maxCount ?? 1;

  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-muted/30';
    const intensity = count / maxCount;
    if (intensity > 0.75) return 'bg-primary text-primary-foreground';
    if (intensity > 0.5) return 'bg-primary/70 text-primary-foreground';
    if (intensity > 0.25) return 'bg-primary/40';
    return 'bg-primary/15';
  };

  const getCount = (day: number, hour: number) => cells.find(c => c.day === day && c.hour === hour)?.count ?? 0;

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('landscape');
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Demand Heatmap', dateFrom, dateTo, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      const head = [['Day', ...HOURS.map(h => `${h}:00`)]];
      const body = DAY_NAMES.map((name, d) => [name, ...HOURS.map(h => getCount(d, h).toString())]);
      autoTable(doc, { ...branding, startY: y, head, body, styles: { fontSize: 8 } });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'demand-heatmap', dateFrom, dateTo }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const head = ['Day', ...HOURS.map(h => `${h}:00`)];
    const body = DAY_NAMES.map((name, d) => [name, ...HOURS.map(h => getCount(d, h).toString())]);
    const rows = [head, ...body];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'demand-heatmap', dateFrom, dateTo }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Demand Heatmap</CardTitle>
            {data && <p className="text-xs text-muted-foreground mt-1">Peak: {data.peakDay} at {data.peakHour}:00</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header row */}
            <div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(${HOURS.length}, 1fr)` }}>
              <div />
              {HOURS.map(h => (
                <div key={h} className="text-center text-[10px] text-muted-foreground font-sans pb-1">{h}:00</div>
              ))}
            </div>
            {/* Data rows */}
            {DAY_NAMES.map((name, d) => (
              <div key={d} className="grid gap-1 mb-1" style={{ gridTemplateColumns: `60px repeat(${HOURS.length}, 1fr)` }}>
                <div className="flex items-center text-xs font-medium">{name}</div>
                {HOURS.map(h => {
                  const count = getCount(d, h);
                  return (
                    <div
                      key={h}
                      className={cn('rounded h-8 flex items-center justify-center text-[10px] transition-colors', getCellColor(count))}
                      title={`${name} ${h}:00 — ${count} appointments`}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 mt-4 text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-4 rounded bg-muted/30 border" />
            <div className="w-4 h-4 rounded bg-primary/15" />
            <div className="w-4 h-4 rounded bg-primary/40" />
            <div className="w-4 h-4 rounded bg-primary/70" />
            <div className="w-4 h-4 rounded bg-primary" />
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
