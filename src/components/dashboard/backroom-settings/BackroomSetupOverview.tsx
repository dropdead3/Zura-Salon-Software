import { useState } from 'react';
import { useBackroomSetupHealth, type SetupWarning } from '@/hooks/backroom/useBackroomSetupHealth';
import { useBackroomSetting } from '@/hooks/backroom/useBackroomSettings';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
      <Card className={tokens.card.wrapper}>
        <CardContent className="py-12 text-center">
          <Info className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className={tokens.body.emphasis}>No organization selected</p>
          <p className={tokens.body.muted}>Select an organization from the switcher to view Backroom setup status.</p>
        </CardContent>
      </Card>
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
        <Card className={cn(tokens.card.wrapper, 'border-primary/30 bg-primary/5')}>
          <CardContent className="py-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={tokens.body.emphasis}>First time? Use the Setup Wizard</p>
              <p className={tokens.body.muted}>Walk through product selection, service mapping, allowances, and station setup step by step.</p>
            </div>
            <Button onClick={() => setShowWizard(true)} className="font-sans shrink-0">
              Launch Wizard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progress card */}
      <Card className={tokens.card.wrapper}>
        <CardHeader>
          <CardTitle className={tokens.card.title}>Setup Progress</CardTitle>
          <CardDescription className={tokens.body.muted}>
            {completedCount} of {checklistItems.length} configuration areas completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressPct} className="h-2" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {checklistItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.section}
                  onClick={() => onNavigate(item.section)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50',
                    item.done ? 'border-border' : 'border-border/60'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', item.done ? 'bg-primary/10' : 'bg-muted')}>
                    <Icon className={cn('w-4 h-4', item.done ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-sans', item.done ? 'text-foreground' : 'text-muted-foreground')}>
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.value}{item.total != null ? ` / ${item.total}` : ''} configured
                    </p>
                  </div>
                  {item.done && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {health.warnings.length > 0 && (
        <Card className={tokens.card.wrapper}>
          <CardHeader>
            <CardTitle className={tokens.card.title}>Configuration Warnings</CardTitle>
            <CardDescription className={tokens.body.muted}>
              Issues that may affect Backroom functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {health.warnings.map((w) => (
              <WarningRow key={w.id} warning={w} onNavigate={onNavigate} />
            ))}
          </CardContent>
        </Card>
      )}

      {health.warnings.length === 0 && completedCount === checklistItems.length && (
        <Card className={cn(tokens.card.wrapper, 'border-primary/20')}>
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-primary" />
            <p className={tokens.body.emphasis}>All systems configured</p>
            <p className={tokens.body.muted}>Backroom is ready to operate.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WarningRow({ warning, onNavigate }: { warning: SetupWarning; onNavigate: (s: string) => void }) {
  const icon = warning.severity === 'error' ? AlertTriangle : warning.severity === 'warning' ? AlertTriangle : Info;
  const Icon = icon;
  const color = warning.severity === 'error' ? 'text-destructive' : warning.severity === 'warning' ? 'text-amber-500' : 'text-muted-foreground';

  return (
    <button
      onClick={() => onNavigate(warning.section)}
      className="flex items-start gap-3 rounded-lg border border-border/60 p-3 w-full text-left hover:bg-muted/50 transition-colors"
    >
      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', color)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-sans font-medium text-foreground">{warning.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{warning.description}</p>
      </div>
      <Badge variant="outline" className="shrink-0 text-xs">
        {warning.severity}
      </Badge>
    </button>
  );
}
