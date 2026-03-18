import { useState, useMemo } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useBackroomAlertRules, useUpsertAlertRule, useDeleteAlertRule, ALERT_RULE_TYPES, SEVERITY_OPTIONS, type BackroomAlertRule } from '@/hooks/backroom/useBackroomAlertRules';
import { useActiveLocations } from '@/hooks/useLocations';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bell, Plus, Trash2, Zap, MapPin } from 'lucide-react';
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
  const [filterLocationId, setFilterLocationId] = useState('all');
  const { data: activeLocations = [] } = useActiveLocations();
  const effectiveLocationId = filterLocationId === 'all' ? undefined : filterLocationId;
  const { data: allRules, isLoading } = useBackroomAlertRules(filterLocationId === 'all' ? null : filterLocationId);
  const upsertRule = useUpsertAlertRule();
  const deleteRule = useDeleteAlertRule();

  // When "All Locations", show all rules; when filtered, show org-wide + location-specific
  const rules = useMemo(() => {
    if (!allRules) return [];
    if (filterLocationId === 'all') return allRules;
    return allRules.filter((r) => !r.location_id || r.location_id === filterLocationId);
  }, [allRules, filterLocationId]);

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

  const severityVariant = (s: string): 'destructive' | 'default' | 'secondary' | 'outline' => {
    if (s === 'critical') return 'destructive';
    if (s === 'warning') return 'default';
    return 'outline';
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className={tokens.loading.spinner} /></div>;
  }

  return (
    <div className="space-y-6">
      <Infotainer id="backroom-alerts-guide" title="Alerts & Exceptions" description="Set up automatic alerts for operational issues — like a stylist skipping the reweigh step, using 50% more product than expected, or running low on stock." icon={<Bell className="h-4 w-4 text-primary" />} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Bell className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Alerts & Exceptions</CardTitle>
              <CardDescription>Define rules that trigger alerts and exception reports.</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeLocations.length > 1 && (
              <Select value={filterLocationId} onValueChange={setFilterLocationId}>
                <SelectTrigger className="w-fit gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {activeLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {(!rules || rules.length === 0) && (
              <Button size="sm" onClick={handleApplyRecommended}>
                <Zap className="w-4 h-4 mr-1.5" /> Use Recommended
              </Button>
            )}
            {!showForm && (
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Rule
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showForm && (
            <div className="rounded-lg border bg-card/50 p-4 space-y-3">
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
                <label className="flex items-center gap-2 text-sm font-sans text-foreground">
                  <Switch checked={form.creates_exception} onCheckedChange={c => setForm(f => ({ ...f, creates_exception: c }))} />
                  Creates Exception
                  <MetricInfoTooltip description="Logs an exception report that managers can review in the Control Tower." />
                </label>
                <label className="flex items-center gap-2 text-sm font-sans text-foreground">
                  <Switch checked={form.creates_task} onCheckedChange={c => setForm(f => ({ ...f, creates_task: c }))} />
                  Creates Task
                  <MetricInfoTooltip description="Automatically creates an operational task assigned to the relevant manager." />
                </label>
                <label className="flex items-center gap-2 text-sm font-sans text-foreground">
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
                        const next = form.notify_roles.includes(role) ? form.notify_roles.filter(r => r !== role) : [...form.notify_roles, role];
                        setForm(f => ({ ...f, notify_roles: next }));
                      }}
                    >
                      {role.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={!form.rule_type}>Save Rule</Button>
              </div>
            </div>
          )}

          {(!rules || rules.length === 0) && !showForm ? (
            <div className={tokens.empty.container}>
              <Bell className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No alert rules configured</h3>
              <p className={tokens.empty.description}>Add rules to automatically detect operational issues, or use the recommended set to get started quickly.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={handleApplyRecommended}>
                <Zap className="w-3.5 h-3.5 mr-1.5" /> Use Recommended Rules
              </Button>
            </div>
          ) : (
            rules?.map((rule) => {
              const ruleType = ALERT_RULE_TYPES.find(t => t.value === rule.rule_type);
              return (
                <div key={rule.id} className="rounded-lg border bg-card/50 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={cn(tokens.body.emphasis, 'text-foreground')}>{ruleType?.label || rule.rule_type}</p>
                        <Badge variant={severityVariant(rule.severity)}>{rule.severity}</Badge>
                        {!rule.is_active && <Badge variant="outline">Disabled</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Threshold: {rule.threshold_value}{rule.threshold_unit}
                        {rule.creates_exception && ' · Creates exception'}
                        {rule.creates_task && ' · Creates task'}
                        {rule.notify_roles.length > 0 && ` · Notifies: ${rule.notify_roles.join(', ')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={rule.is_active} onCheckedChange={(checked) => upsertRule.mutate({ ...rule, is_active: checked })} />
                    <Button variant="ghost" size="icon" onClick={() => deleteRule.mutate(rule.id)} className="h-8 w-8">
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
