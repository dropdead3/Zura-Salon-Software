import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function MyPay() {
  const { dashPath } = useOrgDashboardPath();
  const { isEntitled, isLoading: entitlementLoading } = usePayrollEntitlement();
  const { isLoading, settings, currentPeriod, salesData, estimatedCompensation, payStubs, error } = useMyPayData();

  // Redirect if org doesn't have payroll enabled
  if (!entitlementLoading && !isEntitled) {
    return <Navigate to={dashPath('/')} replace />;
  }

  if (isLoading || entitlementLoading) {
    return (
      <DashboardLayout>
        <div className="px-8 py-8 max-w-[1600px] mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
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
            <TabsTrigger value="tips">My Tips</TabsTrigger>
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

          <TabsContent value="tips" className="space-y-6">
            <MyPayoutSetup />
            <MyTipsHistory />
          </TabsContent>

          <TabsContent value="history">
            <MyPayStubHistory payStubs={payStubs} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
