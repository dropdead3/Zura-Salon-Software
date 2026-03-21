import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Database, Plug, Palette, User, Shield } from 'lucide-react';
import { PlatformTeamManager } from '@/components/platform/PlatformTeamManager';
import { PlatformAppearanceTab } from '@/components/platform/settings/PlatformAppearanceTab';
import { PlatformIntegrationsTab } from '@/components/platform/settings/PlatformIntegrationsTab';
import { PlatformAccountTab } from '@/components/platform/settings/PlatformAccountTab';
import { PlatformSecurityTab } from '@/components/platform/settings/PlatformSecurityTab';
import { PlatformImportTemplatesTab } from '@/components/platform/settings/PlatformImportTemplatesTab';
import { PlatformDefaultsTab } from '@/components/platform/settings/PlatformDefaultsTab';
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

export default function PlatformSettings() {
  const tabTriggerClass = 'data-[state=active]:bg-violet-600 data-[state=active]:text-white text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]';

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Platform Settings"
        description="Configure platform-wide settings and defaults"
      />

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
      </Tabs>
    </PlatformPageContainer>
  );
}
