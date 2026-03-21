import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useNewClientConversion, type NewClientConversionData } from '@/hooks/useNewClientConversion';
import { CATEGORY_COLORS } from '@/utils/serviceCategorization';
import { UserPlus, ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface NewClientConversionCardProps {
  dateFrom: string;
  dateTo: string;
  locationId?: string;
}

export function NewClientConversionCard({ dateFrom, dateTo, locationId }: NewClientConversionCardProps) {
  const { data, isLoading } = useNewClientConversion(dateFrom, dateTo, locationId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <Skeleton className="h-5 w-48" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.totalNewClients === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-display text-base tracking-wide">NEW CLIENT CONVERSION</CardTitle>
                <MetricInfoTooltip description="Tracks which services new clients book first and whether they convert to high-ticket services like blonding or extensions. A client's first appointment in the date range defines them as 'new'." />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No new client data available for this period. This card analyzes conversion patterns once client appointment history is present.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-base tracking-wide">NEW CLIENT CONVERSION</CardTitle>
              <MetricInfoTooltip description="Tracks which services new clients book first and whether they convert to high-ticket services like blonding or extensions. A client's first appointment in the date range defines them as 'new'." />
            </div>
          </div>
          
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-4">
          <KpiBlock
            icon={UserPlus}
            label="New Clients"
            value={data.totalNewClients.toLocaleString()}
          />
          <KpiBlock
            icon={TrendingUp}
            label="Conversion Rate"
            value={`${data.overallConversionRate}%`}
            subtitle={`${data.totalConverted} converted`}
          />
          <KpiBlock
            icon={Clock}
            label="Avg Time to Convert"
            value={data.avgDaysToConvert != null ? `${data.avgDaysToConvert}d` : '—'}
            subtitle={data.avgDaysToConvert != null ? 'days avg' : 'no conversions yet'}
          />
        </div>

        {/* Entry Services Breakdown */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-display text-sm tracking-wide uppercase text-muted-foreground">Entry Services</h3>
            <MetricInfoTooltip description="Service categories new clients book on their first visit, ranked by frequency." />
          </div>
          <div className="space-y-2.5">
            {data.entryServices.slice(0, 6).map((entry) => (
              <EntryServiceRow key={entry.category} entry={entry} />
            ))}
          </div>
        </div>

        {/* Conversion Funnel by Entry Category */}
        {data.entryServices.some(e => e.convertedCount > 0) && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-display text-sm tracking-wide uppercase text-muted-foreground">Conversion by Entry Category</h3>
              <MetricInfoTooltip description="Shows how often clients entering via each category later book a high-ticket service (blonding or extensions)." />
            </div>
            <div className="space-y-2">
              {data.entryServices
                .filter(e => e.count >= 2) // only show meaningful categories
                .map((entry) => (
                  <div key={entry.category} className="flex items-center gap-3 text-sm">
                    <span className="w-28 truncate text-muted-foreground">{entry.category}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                    <span className="text-xs text-muted-foreground">High Ticket</span>
                    <div className="flex-1">
                      <Progress value={entry.conversionRate} className="h-1.5" />
                    </div>
                    <span className={cn(
                      'text-xs font-medium tabular-nums w-10 text-right',
                      entry.conversionRate >= 30 ? 'text-primary' :
                      entry.conversionRate >= 15 ? 'text-accent-foreground' :
                      'text-muted-foreground'
                    )}>
                      {entry.conversionRate}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KpiBlock({ icon: Icon, label, value, subtitle }: {
  icon: any;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center space-y-1">
      <Icon className="w-4 h-4 text-primary mx-auto" />
      <p className="font-display text-xl tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>}
    </div>
  );
}

function EntryServiceRow({ entry }: { entry: NewClientConversionData['entryServices'][number] }) {
  const color = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS['Other'];

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm w-28 truncate">{entry.category}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${entry.percentage}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{entry.count}</span>
      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{entry.percentage}%</span>
    </div>
  );
}
