import { useState } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBackroomAlertRules, useUpsertAlertRule, useDeleteAlertRule, ALERT_RULE_TYPES, SEVERITY_OPTIONS, type BackroomAlertRule } from '@/hooks/backroom/useBackroomAlertRules';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { PlatformCard, PlatformCardContent, PlatformCardHeader, PlatformCardTitle, PlatformCardDescription } from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bell, Plus, Trash2, Zap } from 'lucide-react';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { toast } from 'sonner';

const NOTIFY_ROLE_OPTIONS = ['owner', 'manager', 'inventory_manager', 'front_desk'];

const RECOMMENDED_RULES = [
  { rule_type: 'missing_reweigh', threshold_value: 1, threshold_unit: 'count', severity: 'warning', creates_exception: true, creates_task: false, notify_roles: ['manager'], is_active: true, label: 'Missing Reweigh' },
  { rule_type: 'usage_variance', threshold_value: 25, threshold_unit: '%', severity: 'warning', creates_exception: true, creates_task: false, notify_roles: ['manager'], is_active: true, label: 'Excess Usage > 25%' },
  { rule_type: 'stockout_risk', threshold_value: 5, threshold_unit: 'count', severity: 'info', creates_exception: false, creates_task: true, notify_roles: ['inventory_manager', 'manager'], is_active: true, label: 'Low Stock Alert' },
  { rule_type: 'assistant_workflow', threshold_value: 1, threshold_unit: 'count', severity: 'warning', creates_exception: true, creates_task: false, notify_roles: ['manager'], is_active: true, label: 'No Mix Session for Color Appointment' },
];

export function AlertsExceptionsSection() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: rules, isLoading } = useBackroomAlertRules();
  const upsertRule = useUpsertAlertRule();
  const deleteRule = useDeleteAlertRule();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    rule_type: 'missing_reweigh', threshold_value: 0, threshold_unit: '%',
    severity: 'warning', creates_exception: true, creates_task: false,
    notify_roles: ['manager'] as string[], is_active: true,
  });

  const resetForm = () => {
    setForm({ rule_type: 'missing_reweigh', threshold_value: 0, threshold_unit: '%', severity: 'warning', creates_exception: true, creates_task: false, notify_roles: ['manager'], is_active: true });
    setShowForm(false);
  };

  const handleSave = () => {
    if (!orgId) return;
    upsertRule.mutate({ organization_id: orgId, ...form }, { onSuccess: resetForm });
  };

  const handleApplyRecommended = async () => {
    if (!orgId) return;
    const existingTypes = new Set((rules || []).map(r => r.rule_type));
    const toCreate = RECOMMENDED_RULES.filter(r => !existingTypes.has(r.rule_type));
    if (toCreate.length === 0) { toast.info('All recommended rules are already configured.'); return; }
    for (const rule of toCreate) {
      upsertRule.mutate({ organization_id: orgId, rule_type: rule.rule_type, threshold_value: rule.threshold_value, threshold_unit: rule.threshold_unit, severity: rule.severity, creates_exception: rule.creates_exception, creates_task: rule.creates_task, notify_roles: rule.notify_roles, is_active: rule.is_active });
    }
    toast.success(`${toCreate.length} recommended rules added.`);
  };

  const severityVariant = (s: string): 'error' | 'warning' | 'outline' => {
    if (s === 'critical') return 'error';
    if (s === 'warning') return 'warning';
    return 'outline';
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  return (
    <div className="space-y-6">
      <Infotainer id="backroom-alerts-guide" title="Alerts & Exceptions" description="Set up automatic alerts for operational issues — like a stylist skipping the reweigh step, using 50% more product than expected, or running low on stock." icon={<Bell className="h-4 w-4 text-primary" />} />
      <PlatformCard variant="default">
        <PlatformCardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(var(--platform-bg-hover))] flex items-center justify-center">
              <Bell className="w-5 h-5 text-[hsl(var(--platform-primary))]" />
            </div>
            <div>
              <PlatformCardTitle>Alerts & Exceptions</PlatformCardTitle>
              <PlatformCardDescription>Define rules that trigger alerts and exception reports.</PlatformCardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(!rules || rules.length === 0) && (
              <PlatformButton size="sm" onClick={handleApplyRecommended}>
                <Zap className="w-4 h-4 mr-1.5" /> Use Recommended
              </PlatformButton>
            )}
            {!showForm && (
              <PlatformButton variant="outline" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Rule
              </PlatformButton>
            )}
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-3">
          {showForm && (
            <div className="rounded-lg border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.5)] p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={tokens.label.default}>Rule Type</label>
                  <Select value={form.rule_type} onValueChange={v => setForm(f => ({ ...f, rule_type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{ALERT_RULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={tokens.label.default}>Severity</label>
                  <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{SEVERITY_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center gap-1"><label className={tokens.label.default}>Threshold Value</label><MetricInfoTooltip description="The numeric trigger point. For 'Missing Reweigh' use count; for 'Excess Usage' use percentage." /></div>
                  <PlatformInput type="number" value={form.threshold_value} onChange={e => setForm(f => ({ ...f, threshold_value: Number(e.target.value) }))} className="mt-1" />
                </div>
                <div>
                  <label className={tokens.label.default}>Threshold Unit</label>
                  <Select value={form.threshold_unit} onValueChange={v => setForm(f => ({ ...f, threshold_unit: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="%">Percent (%)</SelectItem>
                      <SelectItem value="g">Grams (g)</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="dollars">Dollars ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm font-sans text-[hsl(var(--platform-foreground))]">
                  <Switch checked={form.creates_exception} onCheckedChange={c => setForm(f => ({ ...f, creates_exception: c }))} />
                  Creates Exception
                  <MetricInfoTooltip description="Logs an exception report that managers can review in the Control Tower." />
                </label>
                <label className="flex items-center gap-2 text-sm font-sans text-[hsl(var(--platform-foreground))]">
                  <Switch checked={form.creates_task} onCheckedChange={c => setForm(f => ({ ...f, creates_task: c }))} />
                  Creates Task
                  <MetricInfoTooltip description="Automatically creates an operational task assigned to the relevant manager." />
                </label>
                <label className="flex items-center gap-2 text-sm font-sans text-[hsl(var(--platform-foreground))]">
                  <Switch checked={form.is_active} onCheckedChange={c => setForm(f => ({ ...f, is_active: c }))} />
                  Active
                </label>
              </div>
              <div>
                <label className={tokens.label.default}>Notify Roles</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {NOTIFY_ROLE_OPTIONS.map(role => (
                    <PlatformBadge
                      key={role}
                      variant={form.notify_roles.includes(role) ? 'primary' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const next = form.notify_roles.includes(role) ? form.notify_roles.filter(r => r !== role) : [...form.notify_roles, role];
                        setForm(f => ({ ...f, notify_roles: next }));
                      }}
                    >
                      {role.replace('_', ' ')}
                    </PlatformBadge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <PlatformButton variant="ghost" size="sm" onClick={resetForm}>Cancel</PlatformButton>
                <PlatformButton size="sm" onClick={handleSave} disabled={!form.rule_type}>Save Rule</PlatformButton>
              </div>
            </div>
          )}

          {(!rules || rules.length === 0) && !showForm ? (
            <div className={tokens.empty.container}>
              <Bell className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No alert rules configured</h3>
              <p className={tokens.empty.description}>Add rules to automatically detect operational issues, or use the recommended set to get started quickly.</p>
              <PlatformButton variant="outline" size="sm" className="mt-2" onClick={handleApplyRecommended}>
                <Zap className="w-3.5 h-3.5 mr-1.5" /> Use Recommended Rules
              </PlatformButton>
            </div>
          ) : (
            rules?.map((rule) => {
              const ruleType = ALERT_RULE_TYPES.find(t => t.value === rule.rule_type);
              return (
                <div key={rule.id} className="rounded-lg border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.5)] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={cn(tokens.body.emphasis, 'text-[hsl(var(--platform-foreground))]')}>{ruleType?.label || rule.rule_type}</p>
                        <PlatformBadge variant={severityVariant(rule.severity)}>{rule.severity}</PlatformBadge>
                        {!rule.is_active && <PlatformBadge variant="outline">Disabled</PlatformBadge>}
                      </div>
                      <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                        Threshold: {rule.threshold_value}{rule.threshold_unit}
                        {rule.creates_exception && ' · Creates exception'}
                        {rule.creates_task && ' · Creates task'}
                        {rule.notify_roles.length > 0 && ` · Notifies: ${rule.notify_roles.join(', ')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={rule.is_active} onCheckedChange={(checked) => upsertRule.mutate({ ...rule, is_active: checked })} />
                    <PlatformButton variant="ghost" size="icon-sm" onClick={() => deleteRule.mutate(rule.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </PlatformButton>
                  </div>
                </div>
              );
            })
          )}
        </PlatformCardContent>
      </PlatformCard>
    </div>
  );
}
