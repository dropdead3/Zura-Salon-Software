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
import { Loader2, CreditCard, Scale, ArrowUpRight, Settings, Plus } from 'lucide-react';
import { AddScalesDialog } from '@/components/dashboard/backroom-settings/AddScalesDialog';

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
}

const PLAN_DISPLAY: Record<string, { name: string; price: number; annualPrice: number }> = {
  starter: { name: 'Starter', price: 39, annualPrice: 33 },
  professional: { name: 'Professional', price: 79, annualPrice: 67 },
  unlimited: { name: 'Unlimited', price: 129, annualPrice: 110 },
};

const UPGRADE_ORDER = ['starter', 'professional', 'unlimited'];

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

  const planInfo = PLAN_DISPLAY[sub.plan || 'starter'];
  const isAnnual = sub.billing_interval === 'annual';
  const renewalDate = sub.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  const currentIdx = UPGRADE_ORDER.indexOf(sub.plan || 'starter');
  const upgradePlans = UPGRADE_ORDER.slice(currentIdx + 1).map((key) => ({
    key,
    ...PLAN_DISPLAY[key],
  }));

  return (
    <DashboardLayout>
      <div className={tokens.layout.pageContainer}>
        <DashboardPageHeader
          title="Backroom Subscription"
          description="Manage your Backroom plan, scale licenses, and billing."
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
                  <p className={cn(tokens.label.default, 'text-foreground')}>Current Plan</p>
                  <p className="text-xs text-muted-foreground font-sans">Active subscription</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className={cn(tokens.stat.large, 'text-foreground')}>{planInfo.name}</span>
                  <Badge variant="outline" className="font-sans text-[10px]">
                    {isAnnual ? 'Annual' : 'Monthly'}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-display tracking-wide text-foreground">
                    ${sub.monthly_cost?.toFixed(2) || planInfo.price}
                  </span>
                  <span className="text-sm text-muted-foreground font-sans">/mo</span>
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
                    {sub.scale_licenses || sub.scale_count || 0}
                  </span>
                  <span className="text-sm text-muted-foreground font-sans">active license(s)</span>
                </div>
                <p className="text-xs text-muted-foreground font-sans">
                  ${(sub.scale_licenses || sub.scale_count || 0) * 10}/mo in scale licenses
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

          {/* Upgrade Path */}
          {upgradePlans.length > 0 && (
            <Card className="bg-card/60 border-border/40 md:col-span-2">
              <CardContent className="p-6 space-y-4">
                <p className={cn(tokens.label.default, 'text-foreground')}>Upgrade Path</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {upgradePlans.map((up) => {
                    const diff = (isAnnual ? up.annualPrice : up.price) - (isAnnual ? planInfo.annualPrice : planInfo.price);
                    return (
                      <button
                        key={up.key}
                        onClick={openPortal}
                        className="p-4 rounded-xl border border-border/50 bg-card/40 text-left hover:border-primary/50 hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={cn(tokens.label.default, 'text-foreground')}>{up.name}</p>
                            <p className="text-xs text-muted-foreground font-sans mt-0.5">
                              +${diff}/mo from your current plan
                            </p>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-primary shrink-0" />
                        </div>
                        <p className="text-lg font-display tracking-wide text-foreground mt-2">
                          ${isAnnual ? up.annualPrice : up.price}/mo
                        </p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AddScalesDialog open={addScalesOpen} onOpenChange={setAddScalesOpen} />
    </DashboardLayout>
  );
}
