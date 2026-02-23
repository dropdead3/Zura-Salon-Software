import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { Star, Crown, Sparkles, CreditCard, Package } from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { LoyaltyProgramConfigurator } from '@/components/dashboard/loyalty/LoyaltyProgramConfigurator';
import { LoyaltyTiersEditor } from '@/components/dashboard/loyalty/LoyaltyTiersEditor';
import { GiftCardDesignEditor } from '@/components/dashboard/loyalty/GiftCardDesignEditor';
import { PhysicalCardOrderForm } from '@/components/dashboard/loyalty/PhysicalCardOrderForm';
import { PhysicalCardOrderHistory } from '@/components/dashboard/loyalty/PhysicalCardOrderHistory';
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
          description="Configure your client loyalty program and gift card designs"
        />

        {/* Tabs */}
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
            <TabsTrigger value="design" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Design</span>
            </TabsTrigger>
            <TabsTrigger value="print" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </TabsTrigger>
            <TabsTrigger value="order" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Order</span>
            </TabsTrigger>
          </ResponsiveTabsList>

          <TabsContent value="program">
            <LoyaltyProgramConfigurator organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="tiers">
            <LoyaltyTiersEditor organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="design">
            <GiftCardDesignEditor organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="print">
            <PhysicalCardOrderForm organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="order">
            <PhysicalCardOrderHistory organizationId={organizationId} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
