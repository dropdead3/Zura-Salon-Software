import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  useLeadAnalytics, 
  formatSourceName, 
  getSourceColor,
  type LeadSourceBreakdown,
  type StylistLeadPerformance 
} from '@/hooks/useLeadAnalytics';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Target,
  ArrowRight,
  Phone,
  Globe,
  Instagram,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface LeadFunnelCardProps {
  locationId?: string;
  dateRange: 'week' | 'month' | '3months';
}

export function LeadFunnelCard({ locationId, dateRange }: LeadFunnelCardProps) {
  const { 
    summary, 
    sourceBreakdown, 
    funnelStages, 
    stylistPerformance,
    isLoading 
  } = useLeadAnalytics(locationId, dateRange);

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Lead Funnel Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  const hasData = summary.totalLeads > 0;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Lead Funnel Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Total Leads</span>
            </div>
            <p className="font-display text-2xl">{summary.totalLeads}</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600 uppercase tracking-wide">Avg Response</span>
            </div>
            <p className="font-display text-2xl text-blue-700 dark:text-blue-400">
              {summary.avgResponseTimeMinutes > 0 ? `${summary.avgResponseTimeMinutes}m` : 'N/A'}
            </p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-600 uppercase tracking-wide">Consult Rate</span>
            </div>
            <p className="font-display text-2xl text-amber-700 dark:text-amber-400">
              {summary.consultationRate.toFixed(1)}%
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600 uppercase tracking-wide">Conversion</span>
            </div>
            <p className="font-display text-2xl text-green-700 dark:text-green-400">
              {summary.conversionRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {!hasData ? (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No leads tracked yet</p>
            <p className="text-sm">Lead data will appear here as new inquiries come in from website forms and other sources.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column: Source Breakdown + Funnel */}
            <div className="space-y-6">
              {/* Source Breakdown */}
              <div>
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Lead Sources
                </h3>
                <div className="flex items-center gap-6">
                  <div className="w-[140px] h-[140px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sourceBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={60}
                          paddingAngle={0}
                          stroke="hsl(var(--border) / 0.4)"
                          strokeWidth={1}
                          dataKey="count"
                          nameKey="source"
                        >
                          {sourceBreakdown.map((entry) => (
                            <Cell 
                              key={entry.source} 
                              fill={getSourceColor(entry.source)} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, _: string, props: any) => [
                            `${value} (${props.payload.percentage.toFixed(1)}%)`,
                            formatSourceName(props.payload.source)
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {sourceBreakdown.slice(0, 5).map((source) => (
                      <div key={source.source} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: getSourceColor(source.source) }}
                          />
                          <span>{formatSourceName(source.source)}</span>
                        </div>
                        <span className="font-medium">{source.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Conversion Funnel */}
              <div>
                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Conversion Funnel
                </h3>
                <div className="space-y-2">
                  {funnelStages.map((stage, idx) => {
                    const widthPercent = summary.totalLeads > 0 
                      ? Math.max(20, (stage.count / summary.totalLeads) * 100) 
                      : 100;
                    const colors = [
                      'bg-primary',
                      'bg-blue-500',
                      'bg-amber-500',
                      'bg-green-500',
                    ];
                    
                    return (
                      <div key={stage.stage} className="relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{stage.stage}</span>
                          <span className="text-sm text-muted-foreground">
                            {stage.count}
                            {idx > 0 && stage.dropoffRate > 0 && (
                              <span className="text-red-500 text-xs ml-2">
                                -{stage.dropoffRate.toFixed(0)}%
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="h-6 bg-muted/30 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all", colors[idx])}
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Stylist Performance */}
            <div>
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Stylist Conversion Leaderboard
              </h3>
              {stylistPerformance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No leads have been assigned yet
                </div>
              ) : (
                <div className="space-y-3">
                  {stylistPerformance.slice(0, 6).map((stylist, idx) => (
                    <div 
                      key={stylist.userId}
                      className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                          idx === 0 && "bg-amber-100 text-amber-700",
                          idx === 1 && "bg-gray-100 text-gray-700",
                          idx === 2 && "bg-orange-100 text-orange-700",
                          idx > 2 && "bg-muted text-muted-foreground"
                        )}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{stylist.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {stylist.leadsAssigned} leads · {stylist.converted} converted
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={stylist.conversionRate >= 50 ? 'default' : 'secondary'}
                          className={cn(
                            stylist.conversionRate >= 70 && "bg-green-500 hover:bg-green-600",
                            stylist.conversionRate >= 50 && stylist.conversionRate < 70 && "bg-blue-500 hover:bg-blue-600",
                            stylist.conversionRate < 50 && "bg-muted text-muted-foreground"
                          )}
                        >
                          {stylist.conversionRate.toFixed(0)}%
                        </Badge>
                        {stylist.avgResponseTime > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {stylist.avgResponseTime}m avg response
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
