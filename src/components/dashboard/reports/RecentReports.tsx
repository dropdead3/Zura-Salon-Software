import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Clock } from 'lucide-react';

export function RecentReports() {
  const { formatDate } = useFormatDate();
  const { effectiveOrganization } = useOrganizationContext();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['recent-reports', effectiveOrganization?.id],
    queryFn: async () => {
      let query = supabase
        .from('report_history' as any)
        .select(`
          *,
          employee_profiles:generated_by (
            full_name,
            display_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (effectiveOrganization?.id) {
        query = query.eq('organization_id', effectiveOrganization.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'daily-sales': 'Daily Sales',
      'stylist-sales': 'Sales by Stylist',
      'location-sales': 'Sales by Location',
      'product-sales': 'Product Sales',
      'staff-kpi': 'Staff KPI',
      'retention': 'Client Retention',
      'no-show': 'No-Show',
      'capacity': 'Capacity',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Recent Reports</CardTitle>
          <CardDescription>Previously generated reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Recent Reports</CardTitle>
          <CardDescription>Previously generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No reports generated yet</p>
            <p className="text-sm">Select a report type above to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Recent Reports</CardTitle>
        <CardDescription>Previously generated reports</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {reports.map((report) => {
          const profile = report.employee_profiles as any;
          const generatedBy = profile?.display_name || profile?.full_name || 'Unknown';
          
          return (
            <div
              key={report.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{report.report_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {getReportTypeLabel(report.report_type)}
                    </Badge>
                    <span>•</span>
                    <span>
                      {formatDate(new Date(report.date_from), 'MMM d')} - {formatDate(new Date(report.date_to), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                  </div>
                  <p>by {generatedBy}</p>
                </div>
                {report.file_url && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={report.file_url} download>
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
