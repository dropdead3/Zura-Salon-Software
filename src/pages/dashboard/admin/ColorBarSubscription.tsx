import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
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
import { Loader2, CreditCard, Weight, Settings, Plus, Beaker } from 'lucide-react';
import { AddScalesDialog } from '@/components/dashboard/color-bar-settings/AddScalesDialog';
import { ColorBarROICard } from '@/components/dashboard/color-bar-settings/ColorBarROICard';
import { COLOR_BAR_BASE_PRICE, COLOR_BAR_PER_SERVICE_FEE, SCALE_LICENSE_MONTHLY } from '@/hooks/color-bar/useLocationStylistCounts';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useColorBarEntitlement } from '@/hooks/color-bar/useColorBarEntitlement';
import { PageExplainer } from '@/components/ui/PageExplainer';


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

export default function ColorBarSubscription() {
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const { isEntitled, isLoading: entitlementLoading } = useColorBarEntitlement();
  const [portalLoading, setPortalLoading] = useState(false);
  const [addScalesOpen, setAddScalesOpen] = useState(false);

  // Entitlement gate — redirect if org doesn't have Color Bar enabled
  if (entitlementLoading) {
    return (
      <DashboardLayout>
        <DashboardLoader className="h-64" />
      </DashboardLayout>
    );
  }

  if (!isEntitled) {
    return <Navigate to={dashPath('/')} replace />;
  }

  const { data: sub, isLoading } = useQuery<SubscriptionData>({
    queryKey: ['color-bar-subscription', effectiveOrganization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-color-bar-subscription', {
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
        <DashboardLoader className="h-64" />
      </DashboardLayout>
    );
  }

  if (!sub?.subscribed) {
    return (
      <DashboardLayout>
        <div className={tokens.layout.pageContainer}>
          <DashboardPageHeader
            title="Color Bar Subscription"
            description="You don't have an active Color Bar subscription."
            backTo={dashPath('/admin/color-bar-settings')}
          />
          <PageExplainer pageId="color-bar-subscription" />
          <Card className="bg-card/60 border-border/40 max-w-lg">
            <CardContent className="p-6 text-center space-y-4">
              <p className="text-muted-foreground font-sans text-sm">
                Subscribe to Zura Color Bar to access inventory intelligence, chemical tracking, and cost optimization.
              </p>
              <Button
                className="font-sans font-medium"
                onClick={() => window.location.href = dashPath('/admin/color-bar-settings')}
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
  const baseCost = locationCount * COLOR_BAR_BASE_PRICE;
  const scaleLicenseCost = scaleCount * SCALE_LICENSE_MONTHLY;
  const renewalDate = sub.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <DashboardLayout>
      <div className={tokens.layout.pageContainer}>
        <DashboardPageHeader
          title="Color Bar Subscription"
          description="Manage your Color Bar subscription, scale licenses, and billing."
          backTo={dashPath('/admin/color-bar-settings')}
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
                  <p className="text-xs text-muted-foreground font-sans">Active color bar plan</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className={cn(tokens.stat.large, 'text-foreground')}>
                    {locationCount} Location{locationCount !== 1 ? 's' : ''}
                  </span>
                  <Badge variant="outline" className="font-sans text-[10px]">
                    ${COLOR_BAR_BASE_PRICE}/mo each
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
                  <Weight className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className={cn(tokens.label.default, 'text-foreground')}>Scale Hardware</p>
                  <p className="text-xs text-muted-foreground font-sans"><p className="text-xs text-muted-foreground font-sans">Precision scales</p></p>
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
                  ${COLOR_BAR_PER_SERVICE_FEE.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground font-sans">/color appointment</span>
              </div>
              <p className="text-xs text-muted-foreground font-sans">
                Usage is tracked automatically from completed mix sessions and billed at the end of each billing cycle.
              </p>
            </CardContent>
          </Card>

          {/* ROI Card */}
          <ColorBarROICard subscriptionMonthlyCost={sub.monthly_cost} />
        </div>
      </div>

      <AddScalesDialog open={addScalesOpen} onOpenChange={setAddScalesOpen} />
    </DashboardLayout>
  );
}
