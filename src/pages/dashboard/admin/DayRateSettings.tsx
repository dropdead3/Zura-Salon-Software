import { lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { Armchair, FileText } from 'lucide-react';
import { VisibilityGate } from '@/components/visibility/VisibilityGate';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';

const ChairManager = lazy(() => import('@/components/dashboard/day-rate/ChairManager').then(m => ({ default: m.ChairManager })));
const AgreementEditor = lazy(() => import('@/components/dashboard/day-rate/AgreementEditor').then(m => ({ default: m.AgreementEditor })));

export default function DayRateSettings() {
  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <DashboardPageHeader
          title="Day Rate Settings"
          description="Configure chair inventory, pricing, and rental agreements"
        />
        <PageExplainer pageId="day-rate-settings" />

        <Tabs defaultValue="chairs" className="w-full">
          <ResponsiveTabsList>
            <VisibilityGate elementKey="dayrate_chairs_tab" elementName="Chair Inventory" elementCategory="Page Tabs">
              <TabsTrigger value="chairs" className="flex items-center gap-2">
                <Armchair className="w-4 h-4" />
                Chair Inventory
              </TabsTrigger>
            </VisibilityGate>
            <VisibilityGate elementKey="dayrate_agreement_tab" elementName="Agreement" elementCategory="Page Tabs">
              <TabsTrigger value="agreement" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Agreement
              </TabsTrigger>
            </VisibilityGate>
          </ResponsiveTabsList>

          <Suspense fallback={<DashboardLoader size="lg" className="h-64" />}>
            <TabsContent value="chairs" className="mt-6">
              <ChairManager />
            </TabsContent>

            <TabsContent value="agreement" className="mt-6">
              <AgreementEditor />
            </TabsContent>
          </Suspense>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
