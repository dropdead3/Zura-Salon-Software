import { RefreshCw, CreditCard, DollarSign, TrendingDown } from 'lucide-react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { StripeHealthSummary } from '@/components/platform/stripe/StripeHealthSummary';
import { AtRiskOrgTable } from '@/components/platform/stripe/AtRiskOrgTable';
import { LocationIssuesTable } from '@/components/platform/stripe/LocationIssuesTable';
import { PaymentEventFeed } from '@/components/platform/stripe/PaymentEventFeed';
import { TerminalRequestsTable } from '@/components/platform/stripe/TerminalRequestsTable';
import { useStripePaymentsHealth } from '@/hooks/useStripePaymentsHealth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function StripeHealthPage() {
  const { data, isLoading, isFetching, refetch } = useStripePaymentsHealth();

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Payment health data refreshed');
    } catch (error) {
      toast.error('Failed to refresh payment health');
    }
  };

  const hasIssues = (data?.subscriptions.pastDue || 0) > 0 || 
                   (data?.locations.issues || 0) > 0 || 
                   (data?.locations.suspended || 0) > 0;

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Payments Health"
        description="Monitor Stripe payment processing across all organizations"
        actions={
          <div className="flex items-center gap-3">
            {/* Real-time indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(var(--platform-bg-card)/0.6)] border border-[hsl(var(--platform-border)/0.5)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-[hsl(var(--platform-foreground-muted))]">Live</span>
            </div>
            
            <PlatformButton 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isFetching && "animate-spin")} />
              Refresh
            </PlatformButton>
          </div>
        }
      />

      {/* Overall Status Banner */}
      <div className={cn(
        "rounded-xl border p-5 flex items-center justify-between",
        hasIssues 
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-emerald-500/30 bg-emerald-500/10"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-full",
            hasIssues ? "bg-amber-500/20" : "bg-emerald-500/20"
          )}>
            <CreditCard className={cn(
              "h-6 w-6",
              hasIssues ? "text-amber-400" : "text-emerald-400"
            )} />
          </div>
          <div>
            <h2 className="text-lg font-medium text-[hsl(var(--platform-foreground))]">
              {hasIssues ? 'Payment Issues Detected' : 'All Payments Healthy'}
            </h2>
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
              {hasIssues 
                ? `${(data?.subscriptions.pastDue || 0) + (data?.locations.issues || 0) + (data?.locations.suspended || 0)} issues require attention`
                : 'All organizations and locations are processing payments normally'
              }
            </p>
          </div>
        </div>

        {/* Revenue at Risk */}
        {(data?.revenueAtRisk || 0) > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
            <TrendingDown className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-xs text-amber-400 font-medium">Revenue at risk</p>
              <p className="text-lg font-medium text-[hsl(var(--platform-foreground))]">
                ${((data?.revenueAtRisk || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <StripeHealthSummary data={data} isLoading={isLoading} />

      {/* Issues Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AtRiskOrgTable 
          organizations={data?.atRiskOrganizations || []} 
          isLoading={isLoading} 
        />
        <LocationIssuesTable 
          locations={data?.locationsWithIssues || []} 
          isLoading={isLoading} 
        />
      </div>

      {/* Terminal Hardware Requests */}
      <TerminalRequestsTable />

      {/* Event Feed */}
      <PaymentEventFeed 
        events={data?.recentEvents || []} 
        isLoading={isLoading} 
      />
    </PlatformPageContainer>
  );
}
