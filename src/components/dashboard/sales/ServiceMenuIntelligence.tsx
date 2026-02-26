import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { tokens } from '@/lib/design-tokens';
import { TrendingDown, Target, Layers, ChevronDown, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { useServiceMenuIntelligence } from '@/hooks/useServiceMenuIntelligence';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface ServiceMenuIntelligenceProps {
  locationId?: string;
}

export function ServiceMenuIntelligence({ locationId }: ServiceMenuIntelligenceProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data, isLoading } = useServiceMenuIntelligence(orgId, locationId);
  const { formatCurrency } = useFormatCurrency();
  const { formatPercent } = useFormatNumber();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    declining: true,
    highMargin: false,
    bundles: false,
  });

  const toggle = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          {[1, 2, 3].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}
        </CardContent>
      </Card>
    );
  }

  const hasData = data && (data.decliningServices.length > 0 || data.highMarginUnderbooked.length > 0 || data.suggestedBundles.length > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Service Menu Intelligence</CardTitle>
              <CardDescription>Not enough data to generate intelligence signals yet</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>Service Menu Intelligence</CardTitle>
                <MetricInfoTooltip description="Analyzes booking trends, margins, and co-purchase patterns to identify underperforming services, high-margin opportunities, and natural bundles." />
              </div>
              <CardDescription>Actionable signals from your service menu data</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Declining Services */}
        {data.decliningServices.length > 0 && (
          <Collapsible open={openSections.declining} onOpenChange={() => toggle('declining')}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded-lg px-3 transition-colors">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-sans font-medium flex-1 text-left">Declining Services</span>
              <Badge variant="secondary" className="text-xs">{data.decliningServices.length}</Badge>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', openSections.declining && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={tokens.table.columnHeader}>Service</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Prior 4 Wks</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Recent 4 Wks</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Change</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Revenue Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.decliningServices.map(s => (
                    <TableRow key={s.serviceName}>
                      <TableCell className="text-sm">{s.serviceName}</TableCell>
                      <TableCell className="text-sm tabular-nums">{s.priorCount}</TableCell>
                      <TableCell className="text-sm tabular-nums">{s.recentCount}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs text-red-600 dark:text-red-400">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {Math.round(s.changePct)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-red-600 dark:text-red-400">
                        <BlurredAmount>-{formatCurrency(s.revenueImpact)}</BlurredAmount>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* High-Margin Underbooked */}
        {data.highMarginUnderbooked.length > 0 && (
          <Collapsible open={openSections.highMargin} onOpenChange={() => toggle('highMargin')}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded-lg px-3 transition-colors">
              <Target className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-sans font-medium flex-1 text-left">High-Margin Opportunities</span>
              <Badge variant="secondary" className="text-xs">{data.highMarginUnderbooked.length}</Badge>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', openSections.highMargin && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={tokens.table.columnHeader}>Service</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Margin</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Bookings (4 Wks)</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Median</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.highMarginUnderbooked.map(s => (
                    <TableRow key={s.serviceName}>
                      <TableCell className="text-sm">{s.serviceName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs text-emerald-600 dark:text-emerald-400">
                          {Math.round(s.marginPct)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{s.bookings}</TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{s.medianBookings}</TableCell>
                      <TableCell className="text-xs text-primary">Consider promoting</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Bundle Suggestions */}
        {data.suggestedBundles.length > 0 && (
          <Collapsible open={openSections.bundles} onOpenChange={() => toggle('bundles')}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded-lg px-3 transition-colors">
              <Layers className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-sans font-medium flex-1 text-left">Bundle Opportunities</span>
              <Badge variant="secondary" className="text-xs">{data.suggestedBundles.length}</Badge>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', openSections.bundles && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={tokens.table.columnHeader}>Service Pair</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Co-Bookings</TableHead>
                    <TableHead className={tokens.table.columnHeader}>Est. Revenue Lift</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.suggestedBundles.map((b, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">
                        {b.serviceA} <span className="text-muted-foreground mx-1">+</span> {b.serviceB}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{b.coOccurrences}</TableCell>
                      <TableCell className="text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                        <BlurredAmount>+{formatCurrency(b.estimatedLift)}</BlurredAmount>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
