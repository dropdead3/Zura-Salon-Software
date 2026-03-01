import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, ListTodo, BookOpen, Wrench } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useState } from 'react';
import { SEOWorkshopOverview } from '@/components/dashboard/seo-workshop/SEOWorkshopOverview';
import { SEOWorkshopActionList } from '@/components/dashboard/seo-workshop/SEOWorkshopActionList';
import { SEOWorkshopGuides } from '@/components/dashboard/seo-workshop/SEOWorkshopGuides';
import { SEOWorkshopTools } from '@/components/dashboard/seo-workshop/SEOWorkshopTools';

export default function SEOWorkshopHub() {
  const { effectiveOrganization } = useOrganizationContext();
  const organizationId = effectiveOrganization?.id;
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="SEO Workshop"
          description="Tasks and guides to improve local visibility"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              <ListTodo className="h-4 w-4" />
              Action items
            </TabsTrigger>
            <TabsTrigger value="guides" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Guides
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-2">
              <Wrench className="h-4 w-4" />
              Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <SEOWorkshopOverview
              organizationId={organizationId}
              onGoToActions={() => setActiveTab('actions')}
            />
          </TabsContent>

          <TabsContent value="actions" className="mt-6">
            <SEOWorkshopActionList organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="guides" className="mt-6">
            <SEOWorkshopGuides />
          </TabsContent>

          <TabsContent value="tools" className="mt-6">
            <SEOWorkshopTools />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
