import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { buildCsvString } from '@/utils/csvExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Loader2, FileSpreadsheet, ArrowLeft, Shield } from 'lucide-react';
import { usePermissionsAuditReport } from '@/hooks/reports/usePermissionsAuditReport';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useReportLocationInfo } from '@/hooks/useReportLocationInfo';
import { addReportHeader, addReportFooter, fetchLogoAsDataUrl, getReportAutoTableBranding, buildReportFileName } from '@/lib/reportPdfLayout';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props { dateFrom: string; dateTo: string; locationId?: string; onClose: () => void; }

export function PermissionsAuditReport({ dateFrom, dateTo, locationId, onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { effectiveOrganization } = useOrganizationContext();
  const { data: businessSettings } = useBusinessSettings();
  const locationInfo = useReportLocationInfo(locationId);
  const { data: entries = [], isLoading } = usePermissionsAuditReport(locationId);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const logoDataUrl = await fetchLogoAsDataUrl(businessSettings?.logo_light_url || effectiveOrganization?.logo_url || null);
      const today = format(new Date(), 'yyyy-MM-dd');
      const headerOpts = { orgName: businessSettings?.business_name || effectiveOrganization?.name || 'Organization', logoDataUrl, reportTitle: 'Permissions Audit Report', dateFrom: today, dateTo: today, locationInfo } as const;
      const branding = getReportAutoTableBranding(doc, headerOpts);
      let y = addReportHeader(doc, headerOpts);
      autoTable(doc, { ...branding, startY: y, head: [['Staff', 'Roles', 'Status']], body: entries.map(e => [e.staffName, e.roles.join(', '), e.isActive ? 'Active' : 'Inactive']) });
      addReportFooter(doc);
      doc.save(buildReportFileName({ reportSlug: 'permissions-audit', dateFrom: today, dateTo: today }));
      toast.success('PDF downloaded');
    } catch { toast.error('Failed to generate PDF'); } finally { setIsGenerating(false); }
  };

  const downloadCSV = () => {
    const rows = [['Staff', 'Roles', 'Status'], ...entries.map(e => [e.staffName, e.roles.join('; '), e.isActive ? 'Active' : 'Inactive'])];
    const blob = new Blob([buildCsvString(rows)], { type: 'text/csv' });
    const today = format(new Date(), 'yyyy-MM-dd');
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = buildReportFileName({ reportSlug: 'permissions-audit', dateFrom: today, dateTo: today }).replace('.pdf', '.csv'); a.click();
    toast.success('CSV downloaded');
  };

  if (isLoading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}</div>;

  const roleColorMap: Record<string, string> = {
    admin: 'bg-red-500/10 text-red-700 dark:text-red-400',
    manager: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    staff: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    stylist: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    none: 'bg-muted text-muted-foreground',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <CardTitle className={tokens.card.title}>Permissions Audit</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{entries.length} staff members with role assignments</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={tokens.button.inline} onClick={downloadCSV}><FileSpreadsheet className="w-4 h-4 mr-1.5" />CSV</Button>
          <Button size={tokens.button.inline} onClick={generatePDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? <p className={tokens.empty.description}>No staff members found.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className={tokens.table.columnHeader}>Staff</TableHead>
              <TableHead className={tokens.table.columnHeader}>Roles</TableHead>
              <TableHead className={tokens.table.columnHeader}>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{e.staffName}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {e.roles.map(r => (
                        <Badge key={r} variant="outline" className={`text-xs ${roleColorMap[r] || roleColorMap.none}`}>
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={e.isActive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}>
                      {e.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
