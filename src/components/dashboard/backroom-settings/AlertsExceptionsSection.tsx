import { useState } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBackroomAlertRules, useUpsertAlertRule, useDeleteAlertRule, ALERT_RULE_TYPES, SEVERITY_OPTIONS, type BackroomAlertRule } from '@/hooks/backroom/useBackroomAlertRules';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bell, Plus, Trash2 } from 'lucide-react';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

const NOTIFY_ROLE_OPTIONS = ['owner', 'manager', 'inventory_manager', 'front_desk'];

export function AlertsExceptionsSection() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: rules, isLoading } = useBackroomAlertRules();
  const upsertRule = useUpsertAlertRule();
  const deleteRule = useDeleteAlertRule();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    rule_type: 'missing_reweigh',
    threshold_value: 0,
    threshold_unit: '%',
    severity: 'warning',
    creates_exception: true,
    creates_task: false,
    notify_roles: ['manager'] as string[],
    is_active: true,
  });

  const resetForm = () => {
    setForm({
      rule_type: 'missing_reweigh', threshold_value: 0, threshold_unit: '%',
      severity: 'warning', creates_exception: true, creates_task: false,
      notify_roles: ['manager'], is_active: true,
    });
    setShowForm(false);
  };

  const handleSave = () => {
    if (!orgId) return;
    upsertRule.mutate({
      organization_id: orgId,
      rule_type: form.rule_type,
      threshold_value: form.threshold_value,
      threshold_unit: form.threshold_unit,
      severity: form.severity,
      creates_exception: form.creates_exception,
      creates_task: form.creates_task,
      notify_roles: form.notify_roles,
      is_active: form.is_active,
    }, { onSuccess: resetForm });
  };

  const severityColor = (s: string) => {
    if (s === 'critical') return 'destructive';
    if (s === 'warning') return 'secondary';
    return 'outline';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Infotainer
        id="backroom-alerts-guide"
        title="Alerts & Exceptions"
        description="Set up automatic alerts for operational issues — like a stylist skipping the reweigh step, using 50% more product than expected, or running low on stock."
        icon={<Bell className="h-4 w-4 text-primary" />}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Bell className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Alerts & Exceptions</CardTitle>
              <CardDescription className={tokens.body.muted}>Define rules that trigger alerts and exception reports.</CardDescription>
            </div>
          </div>
          {!showForm && (
            <Button size={tokens.button.card} className={tokens.button.cardAction} variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Rule
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {showForm && (
            <div className={cn(tokens.card.inner, 'p-4 space-y-3')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={tokens.label.default}>Rule Type</label>
                  <Select value={form.rule_type} onValueChange={v => setForm(f => ({ ...f, rule_type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALERT_RULE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={tokens.label.default}>Severity</label>
                  <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={tokens.label.default}>Threshold Value</label>
                  <Input type="number" value={form.threshold_value} onChange={e => setForm(f => ({ ...f, threshold_value: Number(e.target.value) }))} className="mt-1" />
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
                <label className="flex items-center gap-2 text-sm font-sans">
                  <Switch checked={form.creates_exception} onCheckedChange={c => setForm(f => ({ ...f, creates_exception: c }))} />
                  Creates Exception
                </label>
                <label className="flex items-center gap-2 text-sm font-sans">
                  <Switch checked={form.creates_task} onCheckedChange={c => setForm(f => ({ ...f, creates_task: c }))} />
                  Creates Task
                </label>
                <label className="flex items-center gap-2 text-sm font-sans">
                  <Switch checked={form.is_active} onCheckedChange={c => setForm(f => ({ ...f, is_active: c }))} />
                  Active
                </label>
              </div>
              <div>
                <label className={tokens.label.default}>Notify Roles</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {NOTIFY_ROLE_OPTIONS.map(role => (
                    <Badge
                      key={role}
                      variant={form.notify_roles.includes(role) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const next = form.notify_roles.includes(role)
                          ? form.notify_roles.filter(r => r !== role)
                          : [...form.notify_roles, role];
                        setForm(f => ({ ...f, notify_roles: next }));
                      }}
                    >
                      {role.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size={tokens.button.card} onClick={resetForm}>Cancel</Button>
                <Button size={tokens.button.card} onClick={handleSave} disabled={!form.rule_type}>Save Rule</Button>
              </div>
            </div>
          )}

          {(!rules || rules.length === 0) && !showForm ? (
            <div className={tokens.empty.container}>
              <Bell className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No alert rules configured</h3>
              <p className={tokens.empty.description}>Add rules to automatically detect operational issues.</p>
            </div>
          ) : (
            rules?.map((rule) => {
              const ruleType = ALERT_RULE_TYPES.find(t => t.value === rule.rule_type);
              return (
                <div key={rule.id} className={cn(tokens.card.inner, 'p-4 flex items-center justify-between')}>
                  <div className="flex items-center gap-3 flex-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={tokens.body.emphasis}>{ruleType?.label || rule.rule_type}</p>
                        <Badge variant={severityColor(rule.severity) as any}>{rule.severity}</Badge>
                        {!rule.is_active && <Badge variant="outline">Disabled</Badge>}
                      </div>
                      <p className={tokens.body.muted}>
                        Threshold: {rule.threshold_value}{rule.threshold_unit}
                        {rule.creates_exception && ' · Creates exception'}
                        {rule.creates_task && ' · Creates task'}
                        {rule.notify_roles.length > 0 && ` · Notifies: ${rule.notify_roles.join(', ')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => upsertRule.mutate({ ...rule, is_active: checked })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => deleteRule.mutate(rule.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
