import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useMyPayData } from '@/hooks/useMyPayData';
import { CurrentPeriodCard } from '@/components/dashboard/mypay/CurrentPeriodCard';
import { EarningsBreakdownCard } from '@/components/dashboard/mypay/EarningsBreakdownCard';
import { MyPayStubHistory } from '@/components/dashboard/mypay/MyPayStubHistory';
import { MyTipsHistory } from '@/components/dashboard/mypay/MyTipsHistory';
import { MyPayoutSetup } from '@/components/dashboard/mypay/MyPayoutSetup';
import { Loader2, Wallet } from 'lucide-react';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { usePayrollEntitlement } from '@/hooks/payroll/usePayrollEntitlement';
import { Navigate } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useRefreshPayoutStatus } from '@/hooks/useStaffPayoutAccount';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useColorBarSetting } from '@/hooks/color-bar/useColorBarSettings';
import { toast } from 'sonner';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { AuthFlowLoader } from '@/components/auth/AuthFlowLoader';
import { usePostLoginFirstPaint } from '@/hooks/usePostLoginFirstPaint';

interface TipDistributionPolicy {
  enabled: boolean;
  default_method: string;
}

export default function MyPay() {
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const { isEntitled, isLoading: entitlementLoading } = usePayrollEntitlement();
  const { isLoading, settings, currentPeriod, salesData, estimatedCompensation, payStubs, error } = useMyPayData();
  const refreshStatus = useRefreshPayoutStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const onboardingHandled = useRef(false);

  // Load tip distribution policy to gate the My Tips tab
  const { data: tipPolicySetting } = useColorBarSetting('tip_distribution_policy');
  const tipPolicy = tipPolicySetting?.value as unknown as TipDistributionPolicy | null;
  const tipsEnabled = tipPolicy?.enabled === true;
  const showDirectDeposit = tipsEnabled && tipPolicy?.default_method === 'direct_deposit';

  // Handle Stripe onboarding return
  useEffect(() => {
    if (onboardingHandled.current || !effectiveOrganization?.id) return;

    const onboardingParam = searchParams.get('onboarding');
    if (!onboardingParam) return;

    onboardingHandled.current = true;

    if (onboardingParam === 'complete') {
      refreshStatus.mutate(
        { organization_id: effectiveOrganization.id },
        {
          onSuccess: () => {
            toast.success('Bank account connected! Your payout status has been updated.');
          },
        }
      );
    } else if (onboardingParam === 'refresh') {
      toast.warning('Your verification link expired. Please try connecting again.');
    }

    // Clear the query param
    searchParams.delete('onboarding');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, effectiveOrganization?.id]);

  // Redirect if org doesn't have payroll enabled
  if (!entitlementLoading && !isEntitled) {
    return <Navigate to={dashPath('/')} replace />;
  }

  // Post-login handoff: keep the slate-950 canvas continuous when the user
  // lands directly on /my-pay (custom landing page or hard refresh).
  if (usePostLoginFirstPaint(isLoading, entitlementLoading)) {
    return <AuthFlowLoader />;
  }

  if (isLoading || entitlementLoading) {
    return (
      <DashboardLayout>
        <DashboardLoader fullPage />
      </DashboardLayout>
    );
  }

  if (!settings) {
    return (
      <DashboardLayout>
        <div className="px-8 py-8 max-w-[1600px] mx-auto">
          <DashboardPageHeader title="My Pay" description="Your earnings and pay history" className="mb-8" />
          <PageExplainer pageId="my-pay" />
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">
                Your payroll settings haven't been configured yet.
              </p>
              <p className="text-sm text-muted-foreground/70 text-center mt-1">
                Please contact your administrator to set up your pay details.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="px-8 py-8 max-w-[1600px] mx-auto">
        <DashboardPageHeader title="My Pay" description="Your earnings and pay history" className="mb-8" />

        <Tabs defaultValue="current" className="space-y-6">
          <TabsList>
            <TabsTrigger value="current">Current Period</TabsTrigger>
            {tipsEnabled && <TabsTrigger value="tips">My Tips</TabsTrigger>}
            <TabsTrigger value="history">Pay History</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <CurrentPeriodCard
                currentPeriod={currentPeriod}
                estimatedCompensation={estimatedCompensation}
                settings={settings}
              />
              <EarningsBreakdownCard
                estimatedCompensation={estimatedCompensation}
                salesData={salesData}
                settings={settings}
              />
            </div>
          </TabsContent>

          {tipsEnabled && (
            <TabsContent value="tips" className="space-y-6">
              {showDirectDeposit && <MyPayoutSetup />}
              <MyTipsHistory />
            </TabsContent>
          )}

          <TabsContent value="history">
            <MyPayStubHistory payStubs={payStubs} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
