import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useHandbookWithVersion } from '@/hooks/handbook/useHandbookData';
import { useLeadershipCheck } from '@/hooks/useLeadershipCheck';
import { WizardShell, WizardStep } from '@/components/dashboard/handbook/WizardShell';
import { OrgSetupStep } from '@/components/dashboard/handbook/steps/OrgSetupStep';
import { ScopeBuilderStep } from '@/components/dashboard/handbook/steps/ScopeBuilderStep';
import { ComingSoonStep } from '@/components/dashboard/handbook/steps/ComingSoonStep';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

export default function HandbookWizardPage() {
  const { handbookId } = useParams<{ handbookId: string }>();
  const navigate = useNavigate();
  const { dashPath } = useOrgDashboardPath();
  const { isLeadership } = useLeadershipCheck();
  const { data, isLoading } = useHandbookWithVersion(handbookId);
  const [activeStep, setActiveStep] = useState<string>('org_setup');
  const [saving, setSaving] = useState(false);

  const setupComplete = !!(
    data?.setup?.roles_enabled?.length &&
    data.setup.roles_enabled.length > 0 &&
    Object.values(data?.setup?.classifications || {}).some(Boolean)
  );
  const scopeComplete = (data?.sections?.length ?? 0) > 0;

  const steps: WizardStep[] = useMemo(() => [
    { key: 'org_setup', label: 'Organization Setup', status: activeStep === 'org_setup' ? 'active' : setupComplete ? 'done' : 'todo' },
    { key: 'scope', label: 'Scope Builder', status: activeStep === 'scope' ? 'active' : scopeComplete ? 'done' : 'todo', disabled: !setupComplete },
    { key: 'policy', label: 'Policy Configuration', status: activeStep === 'policy' ? 'active' : 'todo', disabled: !scopeComplete },
    { key: 'matrix', label: 'Applicability Matrix', status: activeStep === 'matrix' ? 'active' : 'todo', disabled: !scopeComplete },
    { key: 'drafting', label: 'AI Drafting', status: activeStep === 'drafting' ? 'active' : 'todo', disabled: !scopeComplete },
    { key: 'review', label: 'Review & Health', status: activeStep === 'review' ? 'active' : 'todo', disabled: !scopeComplete },
    { key: 'publish', label: 'Publish', status: activeStep === 'publish' ? 'active' : 'todo', disabled: !scopeComplete },
  ], [activeStep, setupComplete, scopeComplete]);

  if (!isLeadership) {
    return (
      <DashboardLayout>
        <Card><CardContent className="py-12 text-center font-sans text-sm text-muted-foreground">
          Handbook editing is restricted to leadership.
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  if (isLoading || !data) {
    return <DashboardLayout><DashboardLoader fullPage /></DashboardLayout>;
  }

  const { handbook, version, setup, sections } = data;
  const handleExit = () => navigate(dashPath('/admin/handbook-wizard'));

  const renderStep = () => {
    switch (activeStep) {
      case 'org_setup':
        return <OrgSetupStep setup={setup} versionId={version.id} onSavingChange={setSaving} />;
      case 'scope':
        return <ScopeBuilderStep versionId={version.id} setup={setup} selectedSections={sections} />;
      case 'policy':
        return <ComingSoonStep title="Policy Configuration" description="Configure the decision logic for each section before drafting language. This sets the rules your AI will follow." waveLabel="Wave 25" />;
      case 'matrix':
        return <ComingSoonStep title="Role Applicability Matrix" description="Edit which roles and employment types each section applies to in a single grid." waveLabel="Wave 25" />;
      case 'drafting':
        return <ComingSoonStep title="AI Drafting Workspace" description="AI drafts each section grounded in your configuration — never inventing policy. Tone-aware, with rewrite and gap-detection modes." waveLabel="Wave 26" />;
      case 'review':
        return <ComingSoonStep title="Review & Handbook Health" description="Surface unresolved fields, conflicts, role gaps, and review-readiness. Score completeness and clarity." waveLabel="Wave 27" />;
      case 'publish':
        return <ComingSoonStep title="Publish & Final Reader" description="Publish a versioned, navigable handbook with table of contents, role views, and acknowledgment workflow." waveLabel="Wave 27" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <WizardShell
        title={handbook.name}
        subtitle="Handbook Wizard"
        steps={steps}
        activeStepKey={activeStep}
        onStepClick={setActiveStep}
        saving={saving}
        onExit={handleExit}
        footer={
          <>
            <Button variant="ghost" onClick={handleExit} className="font-sans">Save & exit</Button>
            <div className="flex items-center gap-2">
              {(() => {
                const currentIdx = steps.findIndex((s) => s.key === activeStep);
                const next = steps[currentIdx + 1];
                return next && !next.disabled ? (
                  <Button onClick={() => setActiveStep(next.key)} className="font-sans">Continue</Button>
                ) : null;
              })()}
            </div>
          </>
        }
      >
        {renderStep()}
      </WizardShell>
    </DashboardLayout>
  );
}
