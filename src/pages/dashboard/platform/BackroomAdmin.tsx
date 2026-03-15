import { useState } from 'react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriceQueueTab } from '@/components/platform/backroom/PriceQueueTab';
import { PriceSourcesTab } from '@/components/platform/backroom/PriceSourcesTab';
import { BackroomEntitlementsTab } from '@/components/platform/backroom/BackroomEntitlementsTab';
import { SupplyLibraryTab } from '@/components/platform/backroom/SupplyLibraryTab';
import { BackroomAnalyticsTab } from '@/components/platform/backroom/BackroomAnalyticsTab';
import { BackroomBillingTab } from '@/components/platform/backroom/BackroomBillingTab';
import { CoachPerformanceTab } from '@/components/platform/backroom/CoachPerformanceTab';
import { ClipboardList, Database, Building2, Package, BarChart3, CreditCard, Users2 } from 'lucide-react';

const tabTriggerClass =
  'data-[state=active]:bg-violet-600 data-[state=active]:text-white text-slate-400 hover:text-white';

export default function BackroomAdmin() {
  const [tab, setTab] = useState('analytics');

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Zura Backroom"
        description="Wholesale price intelligence, source configuration, organization entitlements, billing health, and platform analytics."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-800/50 border border-slate-700/50 p-1">
          <TabsTrigger value="analytics" className={`${tabTriggerClass} flex items-center gap-1.5`}>
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="queue" className={`${tabTriggerClass} flex items-center gap-1.5`}>
            <ClipboardList className="w-3.5 h-3.5" />
            Price Queue
          </TabsTrigger>
          <TabsTrigger value="sources" className={`${tabTriggerClass} flex items-center gap-1.5`}>
            <Database className="w-3.5 h-3.5" />
            Price Sources
          </TabsTrigger>
          <TabsTrigger value="entitlements" className={`${tabTriggerClass} flex items-center gap-1.5`}>
            <Building2 className="w-3.5 h-3.5" />
            Entitlements
          </TabsTrigger>
          <TabsTrigger value="library" className={`${tabTriggerClass} flex items-center gap-1.5`}>
            <Package className="w-3.5 h-3.5" />
            Supply Library
          </TabsTrigger>
          <TabsTrigger value="billing" className={`${tabTriggerClass} flex items-center gap-1.5`}>
            <CreditCard className="w-3.5 h-3.5" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="coach-performance" className={`${tabTriggerClass} flex items-center gap-1.5`}>
            <Users2 className="w-3.5 h-3.5" />
            Coach Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          <BackroomAnalyticsTab />
        </TabsContent>
        <TabsContent value="queue" className="mt-6">
          <PriceQueueTab />
        </TabsContent>
        <TabsContent value="sources" className="mt-6">
          <PriceSourcesTab />
        </TabsContent>
        <TabsContent value="entitlements" className="mt-6">
          <BackroomEntitlementsTab />
        </TabsContent>
        <TabsContent value="library" className="mt-6">
          <SupplyLibraryTab />
        </TabsContent>
        <TabsContent value="billing" className="mt-6">
          <BackroomBillingTab />
        </TabsContent>
        <TabsContent value="coach-performance" className="mt-6">
          <CoachPerformanceTab />
        </TabsContent>
      </Tabs>
    </PlatformPageContainer>
  );
}
