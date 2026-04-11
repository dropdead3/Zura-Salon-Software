import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, ListTodo, Target, Layers, Settings2, BookOpen, Wrench } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useState } from 'react';
import { SEOEngineDashboard } from '@/components/dashboard/seo-workshop/SEOEngineDashboard';
import { SEOEngineTaskList } from '@/components/dashboard/seo-workshop/SEOEngineTaskList';
import { SEOEngineCampaigns } from '@/components/dashboard/seo-workshop/SEOEngineCampaigns';
import { SEOEngineObjects } from '@/components/dashboard/seo-workshop/SEOEngineObjects';
import { SEOEngineSettings } from '@/components/dashboard/seo-workshop/SEOEngineSettings';
import { SEOWorkshopGuides } from '@/components/dashboard/seo-workshop/SEOWorkshopGuides';
import { SEOWorkshopTools } from '@/components/dashboard/seo-workshop/SEOWorkshopTools';
import { PageExplainer } from '@/components/ui/PageExplainer';

export default function SEOWorkshopHub() {
  const { effectiveOrganization } = useOrganizationContext();
  const organizationId = effectiveOrganization?.id;
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="SEO Workshop"
          description="Deterministic SEO task engine for local visibility"
        />
        <PageExplainer pageId="seo-workshop" />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ListTodo className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Target className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="objects" className="gap-2">
              <Layers className="h-4 w-4" />
              Objects
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <SEOEngineDashboard
              organizationId={organizationId}
              onGoToTasks={() => setActiveTab('tasks')}
              onGoToCampaigns={() => setActiveTab('campaigns')}
            />
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <SEOEngineTaskList organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="campaigns" className="mt-6">
            <SEOEngineCampaigns organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="objects" className="mt-6">
            <SEOEngineObjects organizationId={organizationId} />
          </TabsContent>

          <TabsContent value="resources" className="mt-6 space-y-8">
            <div>
              <h3 className="text-sm font-display tracking-wide uppercase text-muted-foreground mb-4">Guides</h3>
              <SEOWorkshopGuides />
            </div>
            <div>
              <h3 className="text-sm font-display tracking-wide uppercase text-muted-foreground mb-4">Tools</h3>
              <SEOWorkshopTools />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <SEOEngineSettings organizationId={organizationId} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
