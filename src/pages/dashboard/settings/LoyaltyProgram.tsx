import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { Star, Crown } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { LoyaltyProgramConfigurator } from '@/components/dashboard/loyalty/LoyaltyProgramConfigurator';
import { LoyaltyTiersEditor } from '@/components/dashboard/loyalty/LoyaltyTiersEditor';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export default function LoyaltyProgram() {
  const [activeTab, setActiveTab] = useState('program');
  const { effectiveOrganization } = useOrganizationContext();
  const organizationId = effectiveOrganization?.id;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DashboardPageHeader
          title="Loyalty & Rewards"
          description="Configure your client loyalty program, tiers, and points"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <ResponsiveTabsList onTabChange={setActiveTab}>
            <TabsTrigger value="program" className="gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Program</span>
            </TabsTrigger>
            <TabsTrigger value="tiers" className="gap-2">
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Tiers</span>
            </TabsTrigger>
          </ResponsiveTabsList>

          <TabsContent value="program">
            <LoyaltyProgramConfigurator organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="tiers">
            <LoyaltyTiersEditor organizationId={organizationId} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
