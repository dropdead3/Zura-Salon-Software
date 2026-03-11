import { useState } from 'react';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { Star, Crown, Percent } from 'lucide-react';
import { LoyaltyProgramConfigurator } from '@/components/dashboard/loyalty/LoyaltyProgramConfigurator';
import { LoyaltyTiersEditor } from '@/components/dashboard/loyalty/LoyaltyTiersEditor';
import { PromotionsConfigurator } from '@/components/dashboard/promotions/PromotionsConfigurator';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export function LoyaltySettingsContent() {
  const [activeTab, setActiveTab] = useState('program');
  const { effectiveOrganization } = useOrganizationContext();
  const organizationId = effectiveOrganization?.id;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ResponsiveTabsList onTabChange={setActiveTab}>
          <TabsTrigger value="program" className="gap-2">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Program</span>
          </TabsTrigger>
          <TabsTrigger value="tiers" className="gap-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Tiers</span>
          </TabsTrigger>
          <TabsTrigger value="promos" className="gap-2">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">Promos</span>
          </TabsTrigger>
        </ResponsiveTabsList>

        <TabsContent value="program" className="mt-6">
          <LoyaltyProgramConfigurator organizationId={organizationId} />
        </TabsContent>
        <TabsContent value="tiers" className="mt-6">
          <LoyaltyTiersEditor organizationId={organizationId} />
        </TabsContent>
        <TabsContent value="promos" className="mt-6">
          <PromotionsConfigurator organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
