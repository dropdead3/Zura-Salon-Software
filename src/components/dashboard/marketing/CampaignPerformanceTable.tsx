import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowUpDown, Download, TrendingUp, Clock, DollarSign, Target, BarChart3 } from 'lucide-react';
import { CampaignPerformance, formatSourceName, formatMediumName } from '@/hooks/useMarketingAnalytics';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface CampaignPerformanceTableProps {
  campaigns: CampaignPerformance[];
  isLoading?: boolean;
}

type SortField = 'campaign' | 'totalLeads' | 'converted' | 'conversionRate' | 'totalRevenue' | 'costPerLead' | 'roas';
type SortDirection = 'asc' | 'desc';

function getRoasColor(roas: number | null): string {
  if (roas === null) return '';
  if (roas >= 3) return 'text-green-600 dark:text-green-400';
  if (roas >= 1) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getRoasBadge(roas: number | null): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | null {
  if (roas === null) return null;
  if (roas >= 3) return { label: 'Great', variant: 'default' };
  if (roas >= 1) return { label: 'OK', variant: 'secondary' };
  return { label: 'Low', variant: 'destructive' };
}

export function CampaignPerformanceTable({ campaigns, isLoading }: CampaignPerformanceTableProps) {
  const { formatCurrency, formatCurrencyWhole } = useFormatCurrency();
  const [sortField, setSortField] = useState<SortField>('totalRevenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    if (sortField === 'campaign') {
      return multiplier * a.campaign.localeCompare(b.campaign);
    }
    const aVal = a[sortField] ?? 0;
    const bVal = b[sortField] ?? 0;
    return multiplier * (aVal - bVal);
  });

  const handleExport = () => {
    const headers = ['Campaign', 'Source', 'Medium', 'Leads', 'Conversions', 'Conv %', 'Revenue', 'Budget', 'Spend', 'CPL', 'ROAS', 'Avg Response (hrs)'];
    const rows = sortedCampaigns.map(c => [
      c.campaign,
      c.source,
      c.medium,
      c.totalLeads,
      c.converted,
      `${c.conversionRate.toFixed(1)}%`,
      `$${c.totalRevenue.toLocaleString()}`,
      c.budget ? `$${c.budget.toLocaleString()}` : '',
      c.spendToDate ? `$${c.spendToDate.toLocaleString()}` : '',
      c.costPerLead ? `$${c.costPerLead.toFixed(2)}` : '',
      c.roas ? `${c.roas.toFixed(2)}x` : '',
      c.avgResponseTime.toFixed(1),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campaign-performance.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  if (isLoading) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="font-display text-base tracking-wide">CAMPAIGN PERFORMANCE</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Loading campaigns...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="font-display text-base tracking-wide">CAMPAIGN PERFORMANCE</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No campaigns with UTM tracking found</p>
            <p className="text-xs mt-1">Add utm_campaign parameters to your marketing links</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if any campaign has spend data
  const hasSpendData = campaigns.some(c => c.spendToDate !== null && c.spendToDate > 0);

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="font-display text-base tracking-wide">CAMPAIGN PERFORMANCE</CardTitle>
        </div>
        <Button variant="outline" size={tokens.button.card} onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortButton field="campaign">Campaign</SortButton>
                </TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead className="text-right">
                  <SortButton field="totalLeads">Leads</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="converted">Conv.</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="conversionRate">Conv %</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="totalRevenue">Revenue</SortButton>
                </TableHead>
                {hasSpendData && (
                  <>
                    <TableHead className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        <DollarSign className="h-3 w-3" />
                        Spend
                      </span>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="costPerLead">CPL</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="roas">ROAS</SortButton>
                    </TableHead>
                  </>
                )}
                <TableHead className="text-right">
                  <span className="flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" />
                    Resp. Hrs
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCampaigns.map((campaign) => {
                const roasBadge = getRoasBadge(campaign.roas);
                
                return (
                  <TableRow key={campaign.campaign}>
                    <TableCell className="font-medium">{campaign.campaign}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {formatSourceName(campaign.source)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {formatMediumName(campaign.medium)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{campaign.totalLeads}</TableCell>
                    <TableCell className="text-right tabular-nums">{campaign.converted}</TableCell>
                    <TableCell className="text-right">
                      <span className={campaign.conversionRate >= 20 ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                        {campaign.conversionRate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrencyWhole(campaign.totalRevenue)}
                    </TableCell>
                    {hasSpendData && (
                      <>
                        <TableCell className="text-right tabular-nums">
                          {campaign.spendToDate !== null ? formatCurrencyWhole(campaign.spendToDate) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {campaign.costPerLead !== null ? (
                            <Tooltip>
                              <TooltipTrigger>
                                {formatCurrency(campaign.costPerLead)}
                              </TooltipTrigger>
                              <TooltipContent>
                                Cost per Lead
                              </TooltipContent>
                            </Tooltip>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {campaign.roas !== null ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className={`tabular-nums font-medium ${getRoasColor(campaign.roas)}`}>
                                {campaign.roas.toFixed(2)}x
                              </span>
                              {roasBadge && (
                                <Badge variant={roasBadge.variant} className="text-xs">
                                  {roasBadge.label}
                                </Badge>
                              )}
                            </div>
                          ) : '—'}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {campaign.avgResponseTime > 0 ? campaign.avgResponseTime.toFixed(1) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
