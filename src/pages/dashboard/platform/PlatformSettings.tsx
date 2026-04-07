import { lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Database, Plug, Palette, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';

const PlatformTeamManager = lazy(() => import('@/components/platform/PlatformTeamManager').then(m => ({ default: m.PlatformTeamManager })));
const PlatformAppearanceTab = lazy(() => import('@/components/platform/settings/PlatformAppearanceTab').then(m => ({ default: m.PlatformAppearanceTab })));
const PlatformIntegrationsTab = lazy(() => import('@/components/platform/settings/PlatformIntegrationsTab').then(m => ({ default: m.PlatformIntegrationsTab })));
const PlatformAccountTab = lazy(() => import('@/components/platform/settings/PlatformAccountTab').then(m => ({ default: m.PlatformAccountTab })));
const PlatformSecurityTab = lazy(() => import('@/components/platform/settings/PlatformSecurityTab').then(m => ({ default: m.PlatformSecurityTab })));
const PlatformImportTemplatesTab = lazy(() => import('@/components/platform/settings/PlatformImportTemplatesTab').then(m => ({ default: m.PlatformImportTemplatesTab })));
const PlatformDefaultsTab = lazy(() => import('@/components/platform/settings/PlatformDefaultsTab').then(m => ({ default: m.PlatformDefaultsTab })));

export default function PlatformSettings() {
  const tabTriggerClass = 'data-[state=active]:bg-violet-600 data-[state=active]:text-white text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]';

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Platform Settings"
        description="Configure platform-wide settings and defaults"
      />
        <PageExplainer pageId="platform-settings" />

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="border p-1 bg-[hsl(var(--platform-bg-card)/0.5)] border-[hsl(var(--platform-border)/0.5)]">
          <TabsTrigger value="account" className={cn(tabTriggerClass, 'flex items-center gap-1.5')}>
            <User className="h-3.5 w-3.5" />
            Account
          </TabsTrigger>
          <TabsTrigger value="team" className={tabTriggerClass}>
            Team
          </TabsTrigger>
          <TabsTrigger value="appearance" className={cn(tabTriggerClass, 'flex items-center gap-1.5')}>
            <Palette className="h-3.5 w-3.5" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="security" className={tabTriggerClass}>
            Security
          </TabsTrigger>
          <TabsTrigger value="templates" className={tabTriggerClass}>
            Import Templates
          </TabsTrigger>
          <TabsTrigger value="defaults" className={tabTriggerClass}>
            Defaults
          </TabsTrigger>
          <TabsTrigger value="integrations" className={cn(tabTriggerClass, 'flex items-center gap-1.5')}>
            <Plug className="h-3.5 w-3.5" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<DashboardLoader size="lg" className="h-64" />}>
          <TabsContent value="account">
            <PlatformAccountTab />
          </TabsContent>

          <TabsContent value="team">
            <PlatformTeamManager />
          </TabsContent>

          <TabsContent value="appearance">
            <PlatformAppearanceTab />
          </TabsContent>

          <TabsContent value="security">
            <PlatformSecurityTab />
          </TabsContent>

          <TabsContent value="templates">
            <PlatformImportTemplatesTab />
          </TabsContent>

          <TabsContent value="defaults">
            <PlatformDefaultsTab />
          </TabsContent>

          <TabsContent value="integrations">
            <PlatformIntegrationsTab />
          </TabsContent>
        </Suspense>
      </Tabs>
    </PlatformPageContainer>
  );
}
