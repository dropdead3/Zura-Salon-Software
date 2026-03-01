import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Database, Plug, Palette, User, Shield } from 'lucide-react';
import { PlatformTeamManager } from '@/components/platform/PlatformTeamManager';
import { PlatformAppearanceTab } from '@/components/platform/settings/PlatformAppearanceTab';
import { PlatformIntegrationsTab } from '@/components/platform/settings/PlatformIntegrationsTab';
import { PlatformAccountTab } from '@/components/platform/settings/PlatformAccountTab';
import { PlatformSecurityTab } from '@/components/platform/settings/PlatformSecurityTab';
import { PlatformImportTemplatesTab } from '@/components/platform/settings/PlatformImportTemplatesTab';
import { PlatformDefaultsTab } from '@/components/platform/settings/PlatformDefaultsTab';
import { usePlatformTheme } from '@/contexts/PlatformThemeContext';
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
  const { resolvedTheme } = usePlatformTheme();
  const isDark = resolvedTheme === 'dark';

  const tabTriggerClass = cn(
    'data-[state=active]:bg-violet-600 data-[state=active]:text-white',
    isDark 
      ? 'text-slate-400 hover:text-white'
      : 'text-slate-500 hover:text-violet-700 data-[state=active]:shadow-md'
  );

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Platform Settings"
        description="Configure platform-wide settings and defaults"
      />

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className={cn(
          'border p-1',
          isDark 
            ? 'bg-slate-800/50 border-slate-700/50'
            : 'bg-white/80 border-violet-200/50 shadow-sm'
        )}>
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
