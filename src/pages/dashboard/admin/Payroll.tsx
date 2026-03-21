import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EnforcementGateBanner } from '@/components/enforcement/EnforcementGateBanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { 
  LayoutDashboard,
  History, 
  Users, 
  Settings,
  Play,
  Plus,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { usePayrollConnection } from '@/hooks/usePayrollConnection';
import { PayrollProviderHub } from '@/components/dashboard/payroll/providers/PayrollProviderHub';
import { PayrollConnectionCard } from '@/components/dashboard/payroll/PayrollConnectionCard';
import { PayrollHistoryTable } from '@/components/dashboard/payroll/PayrollHistoryTable';
import { EmployeePayrollList } from '@/components/dashboard/payroll/EmployeePayrollList';
import { PayScheduleCard } from '@/components/dashboard/payroll/PayScheduleCard';
import { RunPayrollWizard } from '@/components/dashboard/payroll/RunPayrollWizard';
import { PayrollOverview } from '@/components/dashboard/payroll/PayrollOverview';
import { CommissionIntelligence } from '@/components/dashboard/payroll/CommissionIntelligence';
import { NewHireWizardContent } from '@/components/dashboard/payroll/NewHireWizardContent';
import { PayrollReminderSettings } from '@/components/dashboard/payroll/PayrollReminderSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function Payroll() {
  const { connection, isLoading, isConnected } = usePayrollConnection();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [showWizard, setShowWizard] = useState(false);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <PlatformPageContainer>
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </PlatformPageContainer>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PlatformPageContainer>
        <div className="space-y-6">
          <PlatformPageHeader
            title="Hiring & Payroll Hub"
            description="Hiring, analytics, forecasting, and compensation management for your team."
            actions={
              !showWizard && (
                <div className="flex items-center gap-2">
                  {activeTab !== 'hire' && (
                    <Button onClick={() => setShowWizard(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Run Payroll
                    </Button>
                  )}
                  <Button 
                    variant={activeTab === 'hire' ? 'default' : 'outline'}
                    onClick={() => handleTabChange('hire')}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    New Hire
                  </Button>
                </div>
              )
            }
          />

          {!isConnected && activeTab !== 'hire' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No payroll provider connected. Payroll runs will be saved locally and can be exported for manual processing. 
                Connect Gusto or QuickBooks in Settings to enable automatic processing.
              </AlertDescription>
            </Alert>
          )}

          <EnforcementGateBanner gateKey="gate_commission_model">
          {showWizard ? (
            <RunPayrollWizard
              onComplete={() => setShowWizard(false)} 
              onCancel={() => setShowWizard(false)} 
            />
          ) : (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview" className="flex items-center gap-1.5">
                  <LayoutDashboard className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="run" className="flex items-center gap-1.5">
                  <Play className="h-4 w-4" />
                  Run Payroll
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-1.5">
                  <History className="h-4 w-4" />
                  History
                </TabsTrigger>
                <TabsTrigger value="team" className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Team
                </TabsTrigger>
                <TabsTrigger value="commissions" className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  Commissions
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-1.5">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="hire" className="flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  Hire
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hire">
                <NewHireWizardContent />
              </TabsContent>

              <TabsContent value="overview">
                <PayrollOverview />
              </TabsContent>

              <TabsContent value="run">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="h-5 w-5" />
                      Run Payroll
                    </CardTitle>
                    <CardDescription>
                      Create and submit a new payroll run for your team.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="font-medium mb-2">Ready to run payroll</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Calculate wages, commissions, and taxes for your team.
                      </p>
                      <Button onClick={() => setShowWizard(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Start New Payroll Run
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Payroll History
                    </CardTitle>
                    <CardDescription>
                      View past payroll runs and their details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PayrollHistoryTable />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="team">
                <EmployeePayrollList />
              </TabsContent>

              <TabsContent value="commissions">
                <CommissionIntelligence />
              </TabsContent>

              <TabsContent value="settings">
                <div className="space-y-8">
                  {isConnected && (
                    <div className="grid gap-6 md:grid-cols-2">
                      <PayrollConnectionCard />
                      <PayScheduleCard />
                    </div>
                  )}
                  
                  {!isConnected && (
                    <PayrollProviderHub />
                  )}
                  
                  <PayrollReminderSettings />
                  
                  {isConnected && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Pay Schedules</CardTitle>
                        <CardDescription>
                          Configure when employees get paid.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Pay schedule configuration will be synced from your payroll provider once connected.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          </EnforcementGateBanner>
        </div>
      </PlatformPageContainer>
    </DashboardLayout>
  );
}
