import { useState } from 'react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriceQueueTab } from '@/components/platform/backroom/PriceQueueTab';
import { PriceSourcesTab } from '@/components/platform/backroom/PriceSourcesTab';
import { BackroomEntitlementsTab } from '@/components/platform/backroom/BackroomEntitlementsTab';
import { SupplyLibraryTab } from '@/components/platform/backroom/SupplyLibraryTab';
import { BackroomAnalyticsTab } from '@/components/platform/backroom/BackroomAnalyticsTab';
import { ClipboardList, Database, Building2, Package, BarChart3 } from 'lucide-react';

export default function BackroomAdmin() {
  const [tab, setTab] = useState('queue');

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Zura Backroom"
        description="Wholesale price intelligence, source configuration, organization entitlements, and platform analytics."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="queue" className="font-sans text-sm gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            Price Queue
          </TabsTrigger>
          <TabsTrigger value="sources" className="font-sans text-sm gap-1.5">
            <Database className="w-3.5 h-3.5" />
            Price Sources
          </TabsTrigger>
          <TabsTrigger value="entitlements" className="font-sans text-sm gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Entitlements
          </TabsTrigger>
          <TabsTrigger value="library" className="font-sans text-sm gap-1.5">
            <Package className="w-3.5 h-3.5" />
            Supply Library
          </TabsTrigger>
          <TabsTrigger value="analytics" className="font-sans text-sm gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics
          </TabsTrigger>
        </TabsList>

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
        <TabsContent value="analytics" className="mt-6">
          <BackroomAnalyticsTab />
        </TabsContent>
      </Tabs>
    </PlatformPageContainer>
  );
}
