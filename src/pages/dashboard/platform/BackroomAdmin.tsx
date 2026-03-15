import { useState } from 'react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriceQueueTab } from '@/components/platform/backroom/PriceQueueTab';
import { PriceSourcesTab } from '@/components/platform/backroom/PriceSourcesTab';
import { BackroomEntitlementsTab } from '@/components/platform/backroom/BackroomEntitlementsTab';
import { SupplyLibraryTab } from '@/components/platform/backroom/SupplyLibraryTab';
import { ClipboardList, Database, Building2, Package } from 'lucide-react';

export default function BackroomAdmin() {
  const [tab, setTab] = useState('queue');

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Zura Backroom"
        description="Wholesale price intelligence, source configuration, and organization entitlements."
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
      </Tabs>
    </div>
  );
}
