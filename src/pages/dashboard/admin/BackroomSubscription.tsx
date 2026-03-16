import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { Loader2, CreditCard, Scale, Settings, Plus, Beaker } from 'lucide-react';
import { AddScalesDialog } from '@/components/dashboard/backroom-settings/AddScalesDialog';
import { BackroomROICard } from '@/components/dashboard/backroom-settings/BackroomROICard';
import { BACKROOM_BASE_PRICE, BACKROOM_PER_SERVICE_FEE, SCALE_LICENSE_MONTHLY } from '@/hooks/backroom/useLocationStylistCounts';

interface SubscriptionData {
  subscribed: boolean;
  plan?: string;
  billing_interval?: string;
  scale_count?: number;
  scale_licenses?: number;
  status?: string;
  current_period_end?: string;
  monthly_cost?: number;
  subscription_id?: string;
  active_location_count?: number;
}

export default function BackroomSubscription() {
  const { effectiveOrganization } = useOrganizationContext();
  const [portalLoading, setPortalLoading] = useState(false);
  const [addScalesOpen, setAddScalesOpen] = useState(false);

  const { data: sub, isLoading } = useQuery<SubscriptionData>({
    queryKey: ['backroom-subscription', effectiveOrganization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-backroom-subscription', {
        body: { organization_id: effectiveOrganization!.id },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveOrganization?.id,
    staleTime: 30_000,
  });

  const openPortal = async () => {
    if (!effectiveOrganization?.id) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: { organization_id: effectiveOrganization.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to open portal';
      toast.error(msg);
    } finally {
      setPortalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!sub?.subscribed) {
    return (
      <DashboardLayout>
        <div className={tokens.layout.pageContainer}>
          <DashboardPageHeader
            title="Backroom Subscription"
            description="You don't have an active Backroom subscription."
            backTo="/dashboard/admin/backroom-settings"
          />
          <Card className="bg-card/60 border-border/40 max-w-lg">
            <CardContent className="p-6 text-center space-y-4">
              <p className="text-muted-foreground font-sans text-sm">
                Subscribe to Zura Backroom to access inventory intelligence, chemical tracking, and cost optimization.
              </p>
              <Button
                className="font-sans font-medium"
                onClick={() => window.location.href = '/dashboard/admin/backroom-settings'}
              >
                View Plans
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const locationCount = sub.active_location_count || 1;
  const scaleCount = sub.scale_licenses || sub.scale_count || 0;
  const baseCost = locationCount * BACKROOM_BASE_PRICE;
  const scaleLicenseCost = scaleCount * SCALE_LICENSE_MONTHLY;
  const renewalDate = sub.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <DashboardLayout>
      <div className={tokens.layout.pageContainer}>
        <DashboardPageHeader
          title="Backroom Subscription"
          description="Manage your Backroom subscription, scale licenses, and billing."
          backTo="/dashboard/admin/backroom-settings"
          actions={
            <Button
              variant="outline"
              className="font-sans font-medium gap-2"
              onClick={openPortal}
              disabled={portalLoading}
            >
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
              Manage Billing
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Current Plan */}
          <Card className="bg-card/60 border-border/40">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className={cn(tokens.label.default, 'text-foreground')}>Subscription</p>
                  <p className="text-xs text-muted-foreground font-sans">Active backroom plan</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className={cn(tokens.stat.large, 'text-foreground')}>
                    {locationCount} Location{locationCount !== 1 ? 's' : ''}
                  </span>
                  <Badge variant="outline" className="font-sans text-[10px]">
                    ${BACKROOM_BASE_PRICE}/mo each
                  </Badge>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-display tracking-wide text-foreground">
                    ${sub.monthly_cost?.toFixed(2) || baseCost}
                  </span>
                  <span className="text-sm text-muted-foreground font-sans">/mo base</span>
                </div>
              </div>

              <div className="border-t border-border/40 pt-3 text-sm font-sans text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Status</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-sans text-[10px]">
                    {sub.status === 'active' ? 'Active' : sub.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Renewal</span>
                  <span className="text-foreground">{renewalDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scale Overview */}
          <Card className="bg-card/60 border-border/40">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Scale className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className={cn(tokens.label.default, 'text-foreground')}>Scale Hardware</p>
                  <p className="text-xs text-muted-foreground font-sans">Acaia Pearl scales</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className={cn(tokens.stat.large, 'text-foreground')}>
                    {scaleCount}
                  </span>
                  <span className="text-sm text-muted-foreground font-sans">active license(s)</span>
                </div>
                <p className="text-xs text-muted-foreground font-sans">
                  ${scaleLicenseCost}/mo in scale licenses
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="font-sans font-medium gap-1.5 w-full"
                onClick={() => setAddScalesOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Add More Scales
              </Button>
            </CardContent>
          </Card>

          {/* Usage Pricing Info */}
          <Card className="bg-card/60 border-border/40">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Beaker className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className={cn(tokens.label.default, 'text-foreground')}>Color Service Usage</p>
                  <p className="text-xs text-muted-foreground font-sans">Billed based on actual appointments</p>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-display tracking-wide text-foreground">
                  ${BACKROOM_PER_SERVICE_FEE.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground font-sans">/color appointment</span>
              </div>
              <p className="text-xs text-muted-foreground font-sans">
                Usage is tracked automatically from completed mix sessions and billed at the end of each billing cycle.
              </p>
            </CardContent>
          </Card>

          {/* ROI Card */}
          <BackroomROICard subscriptionMonthlyCost={sub.monthly_cost} />
        </div>
      </div>

      <AddScalesDialog open={addScalesOpen} onOpenChange={setAddScalesOpen} />
    </DashboardLayout>
  );
}
