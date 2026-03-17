import { useState } from 'react';
import { useBackroomSetupHealth, type SetupWarning } from '@/hooks/backroom/useBackroomSetupHealth';
import { useBackroomSetting } from '@/hooks/backroom/useBackroomSettings';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { PlatformCard, PlatformCardContent, PlatformCardHeader, PlatformCardTitle, PlatformCardDescription } from '@/components/platform/ui/PlatformCard';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { Progress } from '@/components/ui/progress';
import { Loader2, AlertTriangle, CheckCircle2, Info, Package, Wrench, DollarSign, Monitor, BarChart3, Bell, Sparkles, LayoutDashboard } from 'lucide-react';
import { BackroomSetupWizard } from './BackroomSetupWizard';
import { Infotainer } from '@/components/ui/Infotainer';

interface Props {
  onNavigate: (section: string) => void;
}

export function BackroomSetupOverview({ onNavigate }: Props) {
  const { data: health, isLoading } = useBackroomSetupHealth();
  const { data: wizardSetting } = useBackroomSetting('setup_wizard_completed');
  const [showWizard, setShowWizard] = useState(false);
  const wizardCompleted = !!(wizardSetting?.value as Record<string, unknown>)?.completed;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  if (!health) {
    return (
      <PlatformCard variant="default">
        <PlatformCardContent className="py-12 text-center">
          <Info className="w-10 h-10 mx-auto mb-3 text-[hsl(var(--platform-foreground-muted))]" />
          <p className={cn(tokens.body.emphasis, 'text-[hsl(var(--platform-foreground))]')}>No organization selected</p>
          <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">Select an organization from the switcher to view Backroom setup status.</p>
        </PlatformCardContent>
      </PlatformCard>
    );
  }

  if (showWizard) {
    return (
      <BackroomSetupWizard
        onComplete={() => setShowWizard(false)}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  const checklistItems = [
    { label: 'Backroom products configured', value: health.trackedProducts, total: health.totalProducts, section: 'products', icon: Package, done: health.trackedProducts > 0 },
    { label: 'Services mapped for tracking', value: health.trackedServices, total: health.totalServices, section: 'services', icon: Wrench, done: health.trackedServices > 0 },
    { label: 'Recipe baselines defined', value: health.recipesConfigured, section: 'recipes', icon: BarChart3, done: health.recipesConfigured > 0 },
    { label: 'Allowance policies configured', value: health.allowancePolicies, section: 'allowances', icon: DollarSign, done: health.allowancePolicies > 0 },
    { label: 'Mixing stations configured', value: health.stationsConfigured, section: 'stations', icon: Monitor, done: health.stationsConfigured > 0 },
    { label: 'Alert rules defined', value: health.alertRulesConfigured, section: 'alerts', icon: Bell, done: health.alertRulesConfigured > 0 },
  ];

  const completedCount = checklistItems.filter((i) => i.done).length;
  const progressPct = Math.round((completedCount / checklistItems.length) * 100);

  return (
    <div className="space-y-6">
      <Infotainer
        id="backroom-overview-guide"
        title="Setup Overview"
        description="This dashboard shows your Backroom configuration progress. Complete each area to unlock full tracking, billing, and compliance features. Use the Setup Wizard for a guided walkthrough, or configure each section individually from the left navigation."
        icon={<LayoutDashboard className="h-4 w-4 text-primary" />}
      />
      {/* Wizard launch CTA */}
      {!wizardCompleted && completedCount < checklistItems.length && (
        <PlatformCard variant="default" className="border-[hsl(var(--platform-primary)/0.3)]">
          <PlatformCardContent className="py-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-primary)/0.15)] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(tokens.body.emphasis, 'text-[hsl(var(--platform-foreground))]')}>First time? Use the Setup Wizard</p>
              <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">Walk through product selection, service mapping, allowances, and station setup step by step.</p>
            </div>
            <PlatformButton onClick={() => setShowWizard(true)} className="shrink-0">
              Launch Wizard
            </PlatformButton>
          </PlatformCardContent>
        </PlatformCard>
      )}

      {/* Progress card */}
      <PlatformCard variant="default">
        <PlatformCardHeader>
          <PlatformCardTitle>Setup Progress</PlatformCardTitle>
          <PlatformCardDescription>
            {completedCount} of {checklistItems.length} configuration areas completed
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <Progress value={progressPct} className="h-2" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {checklistItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.section}
                  onClick={() => onNavigate(item.section)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                    'border-[hsl(var(--platform-border)/0.5)] hover:bg-[hsl(var(--platform-bg-hover)/0.5)]',
                    item.done && 'border-[hsl(var(--platform-border)/0.7)]'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    item.done ? 'bg-[hsl(var(--platform-primary)/0.15)]' : 'bg-[hsl(var(--platform-bg-hover))]'
                  )}>
                    <Icon className={cn('w-4 h-4', item.done ? 'text-[hsl(var(--platform-primary))]' : 'text-[hsl(var(--platform-foreground-muted))]')} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-sans', item.done ? 'text-[hsl(var(--platform-foreground))]' : 'text-[hsl(var(--platform-foreground-muted))]')}>
                      {item.label}
                    </p>
                    <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">
                      {item.value}{item.total != null ? ` / ${item.total}` : ''} configured
                    </p>
                  </div>
                  {item.done && <CheckCircle2 className="w-4 h-4 text-[hsl(var(--platform-primary))] shrink-0" />}
                </button>
              );
            })}
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Warnings */}
      {health.warnings.length > 0 && (
        <PlatformCard variant="default">
          <PlatformCardHeader>
            <PlatformCardTitle>Configuration Warnings</PlatformCardTitle>
            <PlatformCardDescription>
              Issues that may affect Backroom functionality
            </PlatformCardDescription>
          </PlatformCardHeader>
          <PlatformCardContent className="space-y-2">
            {health.warnings.map((w) => (
              <WarningRow key={w.id} warning={w} onNavigate={onNavigate} />
            ))}
          </PlatformCardContent>
        </PlatformCard>
      )}

      {health.warnings.length === 0 && completedCount === checklistItems.length && (
        <PlatformCard variant="default" className="border-[hsl(var(--platform-primary)/0.2)]">
          <PlatformCardContent className="py-8 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-[hsl(var(--platform-primary))]" />
            <p className={cn(tokens.body.emphasis, 'text-[hsl(var(--platform-foreground))]')}>All systems configured</p>
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">Backroom is ready to operate.</p>
          </PlatformCardContent>
        </PlatformCard>
      )}
    </div>
  );
}

function WarningRow({ warning, onNavigate }: { warning: SetupWarning; onNavigate: (s: string) => void }) {
  const icon = warning.severity === 'error' ? AlertTriangle : warning.severity === 'warning' ? AlertTriangle : Info;
  const Icon = icon;
  const color = warning.severity === 'error' ? 'text-destructive' : warning.severity === 'warning' ? 'text-amber-500' : 'text-[hsl(var(--platform-foreground-muted))]';

  return (
    <button
      onClick={() => onNavigate(warning.section)}
      className="flex items-start gap-3 rounded-lg border border-[hsl(var(--platform-border)/0.5)] p-3 w-full text-left hover:bg-[hsl(var(--platform-bg-hover)/0.5)] transition-colors"
    >
      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', color)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-sans font-medium text-[hsl(var(--platform-foreground))]">{warning.title}</p>
        <p className="text-xs text-[hsl(var(--platform-foreground-muted))] mt-0.5">{warning.description}</p>
      </div>
      <PlatformBadge variant="outline" className="shrink-0 text-xs">
        {warning.severity}
      </PlatformBadge>
    </button>
  );
}
