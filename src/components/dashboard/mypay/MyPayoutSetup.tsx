import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  useMyPayoutAccount,
  useStartPayoutOnboarding,
  useCreatePayoutLoginLink,
  useRefreshPayoutStatus,
} from '@/hooks/useStaffPayoutAccount';
import { useMyPendingTipTotal } from '@/hooks/useTipDistributions';
import {
  Loader2,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Landmark,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  active: { label: 'Verified', icon: CheckCircle2, className: 'text-emerald-600' },
  pending: { label: 'Pending Verification', icon: Clock, className: 'text-amber-600' },
  restricted: { label: 'Action Required', icon: AlertCircle, className: 'text-destructive' },
  disabled: { label: 'Disabled', icon: AlertCircle, className: 'text-muted-foreground' },
};

export function MyPayoutSetup() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { formatCurrency } = useFormatCurrency();

  const { data: account, isLoading } = useMyPayoutAccount();
  const startOnboarding = useStartPayoutOnboarding();
  const createLoginLink = useCreatePayoutLoginLink();
  const refreshStatus = useRefreshPayoutStatus();
  const { data: pendingTotal = 0 } = useMyPendingTipTotal();

  const handleConnect = async () => {
    if (!orgId) return;
    const result = await startOnboarding.mutateAsync({ organization_id: orgId });
    if (result?.onboarding_url) {
      window.location.href = result.onboarding_url;
    }
  };

  const handleManageAccount = async () => {
    if (!orgId) return;
    const result = await createLoginLink.mutateAsync({ organization_id: orgId });
    if (result?.login_url) {
      window.open(result.login_url, '_blank');
    }
  };

  const handleRefresh = () => {
    if (!orgId) return;
    refreshStatus.mutate({ organization_id: orgId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const statusConfig = account ? STATUS_CONFIG[account.stripe_status] || STATUS_CONFIG.pending : null;
  const StatusIcon = statusConfig?.icon || Clock;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Landmark className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className={tokens.card.title}>Direct Deposit Setup</CardTitle>
              <MetricInfoTooltip description="Connect your bank account to receive tip payouts directly. Your banking details are securely held by our payment processor — we never store sensitive financial information." />
            </div>
            <CardDescription>Receive your tips via direct deposit</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!account ? (
          <div className="flex flex-col items-center text-center py-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Building2 className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">No bank account connected</p>
              {pendingTotal > 0 ? (
                <p className="text-sm text-muted-foreground max-w-sm">
                  You have <span className="font-medium text-foreground"><BlurredAmount>{formatCurrency(pendingTotal)}</BlurredAmount></span> in pending tips. Connect your bank account to receive them via direct deposit.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground max-w-sm">
                  Connect your bank account to receive daily tip payouts directly. You'll need to verify your identity to comply with financial regulations.
                </p>
              )}
            </div>
            <Button
              onClick={handleConnect}
              disabled={startOnboarding.isPending}
              className="rounded-full"
            >
              {startOnboarding.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Building2 className="w-4 h-4 mr-2" />
              )}
              Connect Bank Account
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status banner */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <StatusIcon className={cn('w-5 h-5', statusConfig?.className)} />
                <div>
                  <p className="text-sm font-medium">{statusConfig?.label}</p>
                  {account.bank_name && account.bank_last4 && (
                    <p className="text-xs text-muted-foreground">
                      {account.bank_name} ····{account.bank_last4}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {account.payouts_enabled && (
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Payouts Enabled
                  </Badge>
                )}
              </div>
            </div>

            {/* Pending tips callout */}
            {pendingTotal > 0 && account.payouts_enabled && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm">
                <span className="text-muted-foreground">Pending tips: </span>
                <span className="font-medium text-foreground"><BlurredAmount>{formatCurrency(pendingTotal)}</BlurredAmount></span>
              </div>
            )}

            {/* Verification details */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Identity Verified</p>
                <p className="font-medium">{account.details_submitted ? 'Yes' : 'Incomplete'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Can Receive Funds</p>
                <p className="font-medium">{account.payouts_enabled ? 'Yes' : 'No'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Account Status</p>
                <p className="font-medium capitalize">{account.stripe_status}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {account.stripe_status === 'pending' || account.stripe_status === 'restricted' ? (
                <Button
                  onClick={handleConnect}
                  disabled={startOnboarding.isPending}
                  size="sm"
                  className="rounded-full"
                >
                  {startOnboarding.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Complete Verification
                </Button>
              ) : (
                <Button
                  onClick={handleManageAccount}
                  disabled={createLoginLink.isPending}
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                >
                  {createLoginLink.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Manage Account
                </Button>
              )}
              <Button
                onClick={handleRefresh}
                disabled={refreshStatus.isPending}
                size="sm"
                variant="ghost"
                className="rounded-full"
              >
                <RefreshCw className={cn('w-4 h-4', refreshStatus.isPending && 'animate-spin')} />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
