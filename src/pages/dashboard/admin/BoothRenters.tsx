import { useSearchParams } from 'react-router-dom';
import { Store, Users, Receipt, Building2, ClipboardList } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RentersTabContent, PaymentsTabContent } from '@/components/dashboard/booth-renters';
import { RenterOnboardContent } from '@/components/dashboard/booth-renters/RenterOnboardContent';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Card, CardContent } from '@/components/ui/card';

export default function BoothRenters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'renters';
  const { effectiveOrganization, isLoading } = useOrganizationContext();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Show loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <PlatformPageContainer className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading organization...</div>
        </PlatformPageContainer>
      </DashboardLayout>
    );
  }

  // Show message when no organization is selected
  if (!effectiveOrganization?.id) {
    return (
      <DashboardLayout>
        <PlatformPageContainer className="space-y-6">
          <PlatformPageHeader
            title="Renter Hub"
            description="Manage booth renters and rent payments"
            actions={<Store className="h-6 w-6 text-primary" />}
          />
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Organization Selected</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Please select an organization from the context switcher to view booth renters and manage rent payments.
              </p>
            </CardContent>
          </Card>
        </PlatformPageContainer>
      </DashboardLayout>
    );
  }

  const organizationId = effectiveOrganization.id;

  return (
    <DashboardLayout>
      <PlatformPageContainer className="space-y-6">
        <PlatformPageHeader
          title="Renter Hub"
          description="Manage booth renters and rent payments"
          actions={<Store className="h-6 w-6 text-primary" />}
        />

        {/* Tabbed Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="renters" className="gap-2">
              <Users className="h-4 w-4" />
              Renters
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <Receipt className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Onboarding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="renters">
            <RentersTabContent organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsTabContent organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="onboarding">
            <RenterOnboardContent organizationId={organizationId} />
          </TabsContent>
        </Tabs>
      </PlatformPageContainer>
    </DashboardLayout>
  );
}
