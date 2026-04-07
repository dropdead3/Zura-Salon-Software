import { lazy, Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { Brain, BookOpen, Users, ShieldCheck } from 'lucide-react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { PLATFORM_NAME } from '@/lib/brand';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';

const PersonalityTab = lazy(() => import('@/components/zura-config/PersonalityTab').then(m => ({ default: m.PersonalityTab })));
const KnowledgeBaseTab = lazy(() => import('@/components/zura-config/KnowledgeBaseTab').then(m => ({ default: m.KnowledgeBaseTab })));
const RoleRulesTab = lazy(() => import('@/components/zura-config/RoleRulesTab').then(m => ({ default: m.RoleRulesTab })));
const GuardrailsTab = lazy(() => import('@/components/zura-config/GuardrailsTab').then(m => ({ default: m.GuardrailsTab })));

export default function ZuraConfigPage() {
  const { currentOrganization } = useOrganizationContext();
  const orgId = currentOrganization?.id;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
        <DashboardPageHeader
          title={`${PLATFORM_NAME} Configuration`}
          description={`Customize how ${PLATFORM_NAME} communicates, what she knows, and her boundaries`}
        />
        <PageExplainer pageId="zura-config" />

        {orgId ? (
          <Tabs defaultValue="personality" className="space-y-6">
            <ResponsiveTabsList>
              <TabsTrigger value="personality" className="gap-2">
                <Brain className="h-4 w-4" /> Personality
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="gap-2">
                <BookOpen className="h-4 w-4" /> Knowledge Base
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-2">
                <Users className="h-4 w-4" /> Role Rules
              </TabsTrigger>
              <TabsTrigger value="guardrails" className="gap-2">
                <ShieldCheck className="h-4 w-4" /> Guardrails
              </TabsTrigger>
            </ResponsiveTabsList>

            <Suspense fallback={<DashboardLoader size="lg" className="h-64" />}>
              <TabsContent value="personality">
                <PersonalityTab organizationId={orgId} />
              </TabsContent>

              <TabsContent value="knowledge">
                <KnowledgeBaseTab organizationId={orgId} />
              </TabsContent>

              <TabsContent value="roles">
                <RoleRulesTab organizationId={orgId} />
              </TabsContent>

              <TabsContent value="guardrails">
                <GuardrailsTab organizationId={orgId} />
              </TabsContent>
            </Suspense>
          </Tabs>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No organization found. Please ensure you are part of an organization.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
