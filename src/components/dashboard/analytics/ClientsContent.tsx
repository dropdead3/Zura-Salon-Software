import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  AlertTriangle,
  UserCheck,
  UserPlus,
  TrendingUp,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { RetentionMetrics } from '@/hooks/useOperationalAnalytics';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { AtRiskClientsList } from './AtRiskClientsList';
import { BentoGrid } from '@/components/ui/bento-grid';

interface ClientsContentProps {
  retention?: RetentionMetrics;
  isLoading: boolean;
  dateRange?: string;
  locationName?: string;
}

export function ClientsContent({ retention, isLoading, dateRange, locationName }: ClientsContentProps) {
  const { formatNumber } = useFormatNumber();
  const navigate = useNavigate();

  if (isLoading || !retention) {
    return (
      <div className="space-y-6">
        <BentoGrid maxPerRow={5} gap="gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-28" />
          ))}
        </BentoGrid>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  const retentionStatus = retention.retentionRate >= 60 
    ? 'healthy' 
    : retention.retentionRate >= 40 
      ? 'warning' 
      : 'critical';

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-4 rounded-full"
          onClick={() => navigate('/dashboard/admin/client-directory')}
        >
          <ExternalLink className="w-4 h-4 mr-1.5" />
          View Client Directory
        </Button>
      </div>

      {/* Key Metrics */}
      <PinnableCard 
        elementKey="retention_metrics" 
        elementName="Retention Metrics" 
        category="Analytics Hub - Operations"
        className="mb-8"
        dateRange={dateRange}
        locationName={locationName}
      >
        <BentoGrid maxPerRow={5} gap="gap-4">
          <Card
            className="p-4 cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate('/dashboard/admin/client-directory')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-display text-2xl">{formatNumber(retention.totalClients)}</p>
                <p className="text-xs text-muted-foreground">Total Clients</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-display text-2xl text-green-600">{formatNumber(retention.returningClients)}</p>
                <p className="text-xs text-muted-foreground">Returning</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-display text-2xl text-blue-600">{formatNumber(retention.newClients)}</p>
                <p className="text-xs text-muted-foreground">New Clients</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                retentionStatus === 'healthy' && "bg-green-100 dark:bg-green-900/30",
                retentionStatus === 'warning' && "bg-amber-100 dark:bg-amber-900/30",
                retentionStatus === 'critical' && "bg-red-100 dark:bg-red-900/30"
              )}>
                <RefreshCw className={cn(
                  "w-5 h-5",
                  retentionStatus === 'healthy' && "text-green-600",
                  retentionStatus === 'warning' && "text-amber-600",
                  retentionStatus === 'critical' && "text-red-600"
                )} />
              </div>
              <div>
                <p className={cn(
                  "font-display text-2xl",
                  retentionStatus === 'healthy' && "text-green-600",
                  retentionStatus === 'warning' && "text-amber-600",
                  retentionStatus === 'critical' && "text-red-600"
                )}>
                  {retention.retentionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Retention Rate</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                retention.atRiskClients > 10 
                  ? "bg-red-100 dark:bg-red-900/30"
                  : "bg-amber-100 dark:bg-amber-900/30"
              )}>
                <AlertTriangle className={cn(
                  "w-5 h-5",
                  retention.atRiskClients > 10 ? "text-red-600" : "text-amber-600"
                )} />
              </div>
              <div>
                <p className={cn(
                  "font-display text-2xl",
                  retention.atRiskClients > 10 && "text-red-600"
                )}>
                  {retention.atRiskClients}
                </p>
                <p className="text-xs text-muted-foreground">At-Risk Clients</p>
              </div>
            </div>
          </Card>
        </BentoGrid>
      </PinnableCard>

      {/* Detailed Retention Card */}
      <PinnableCard 
        elementKey="retention_overview" 
        elementName="Client Retention Overview" 
        category="Analytics Hub - Operations"
        className="mb-6"
        dateRange={dateRange}
        locationName={locationName}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Client Retention Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Visual Breakdown */}
              <div>
                <h4 className="font-medium mb-4">Client Distribution</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Returning Clients</span>
                      <span className="text-green-600">{retention.returningClients}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${retention.totalClients > 0 ? (retention.returningClients / retention.totalClients) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>New Clients</span>
                      <span className="text-blue-600">{retention.newClients}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${retention.totalClients > 0 ? (retention.newClients / retention.totalClients) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Insights */}
              <div>
                <h4 className="font-medium mb-4">Key Insights</h4>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-sm font-medium">Retention Health</p>
                    <p className={cn(
                      "text-sm",
                      retentionStatus === 'healthy' && "text-green-600",
                      retentionStatus === 'warning' && "text-amber-600",
                      retentionStatus === 'critical' && "text-red-600"
                    )}>
                      {retentionStatus === 'healthy' && "Excellent client retention rate. Keep up the great work!"}
                      {retentionStatus === 'warning' && "Retention rate is below average. Focus on follow-ups."}
                      {retentionStatus === 'critical' && "Low retention rate. Immediate action recommended."}
                    </p>
                  </div>
                  {retention.atRiskClients > 0 && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">At-Risk Alert</p>
                      </div>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        {retention.atRiskClients} clients with 2+ visits haven't returned in 60+ days.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </PinnableCard>

      {/* Client Breakdown */}
      <PinnableCard 
        elementKey="client_breakdown" 
        elementName="Client Breakdown" 
        category="Analytics Hub - Operations"
        className="mb-6"
        dateRange={dateRange}
        locationName={locationName}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Client Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="font-display text-2xl">{retention.totalClients}</p>
                <p className="text-xs text-muted-foreground">Total Clients</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="font-display text-2xl text-green-700 dark:text-green-400">
                  {retention.returningClients}
                </p>
                <p className="text-xs text-green-600">Returning</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="font-display text-2xl text-blue-700 dark:text-blue-400">
                  {retention.newClients}
                </p>
                <p className="text-xs text-blue-600">New Clients</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <p className="font-display text-2xl text-red-700 dark:text-red-400">
                    {retention.atRiskClients}
                  </p>
                </div>
                <p className="text-xs text-red-600">At-Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </PinnableCard>

      {/* At-Risk Clients List */}
      <PinnableCard 
        elementKey="at_risk_clients_list" 
        elementName="At-Risk Clients" 
        category="Analytics Hub - Operations"
        dateRange={dateRange}
        locationName={locationName}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              At-Risk Clients
              {retention.atRiskClientsList.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {retention.atRiskClientsList.length}
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Clients with 2+ visits who haven't returned in 60+ days
            </p>
          </CardHeader>
          <CardContent>
            <AtRiskClientsList clients={retention.atRiskClientsList} />
          </CardContent>
        </Card>
      </PinnableCard>
    </>
  );
}
