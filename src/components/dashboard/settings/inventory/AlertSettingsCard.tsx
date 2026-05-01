import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bell, ChevronDown, ChevronUp, Loader2, Users, AlertTriangle, CalendarCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useInventoryAlertSettings, useUpsertInventoryAlertSettings } from '@/hooks/useInventoryAlertSettings';
import { isStructurallyEqual } from '@/lib/stableStringify';

export function AlertSettingsCard() {
  const { data: settings, isLoading } = useInventoryAlertSettings();
  const upsert = useUpsertInventoryAlertSettings();
  const [open, setOpen] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [thresholdPct, setThresholdPct] = useState(100);
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(true);
  const [autoCreatePo, setAutoCreatePo] = useState(true);
  const [autoReorderEnabled, setAutoReorderEnabled] = useState(false);
  const [autoReorderMode, setAutoReorderMode] = useState('to_par');
  const [maxAutoReorderValue, setMaxAutoReorderValue] = useState('');
  const [requirePoApproval, setRequirePoApproval] = useState(true);
  const [deadStockEnabled, setDeadStockEnabled] = useState(true);
  const [deadStockDays, setDeadStockDays] = useState(90);
  const [auditFrequency, setAuditFrequency] = useState('monthly');
  const [auditReminderEnabled, setAuditReminderEnabled] = useState(true);
  const [auditReminderDaysBefore, setAuditReminderDaysBefore] = useState(3);
  const [auditNotifyInventoryManager, setAuditNotifyInventoryManager] = useState(true);
  const [auditNotifyManager, setAuditNotifyManager] = useState(true);
  const [auditNotifyAdmin, setAuditNotifyAdmin] = useState(false);

  // Sync from server
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setThresholdPct(settings.default_threshold_pct);
      setInApp(settings.alert_channels.includes('in_app'));
      setEmail(settings.alert_channels.includes('email'));
      setAutoCreatePo(settings.auto_create_draft_po);
      setAutoReorderEnabled(settings.auto_reorder_enabled ?? false);
      setAutoReorderMode(settings.auto_reorder_mode ?? 'to_par');
      setMaxAutoReorderValue(settings.max_auto_reorder_value?.toString() ?? '');
      setRequirePoApproval(settings.require_po_approval ?? true);
      setDeadStockEnabled(settings.dead_stock_enabled ?? true);
      setDeadStockDays(settings.dead_stock_days ?? 90);
      setAuditFrequency(settings.audit_frequency ?? 'monthly');
      setAuditReminderEnabled(settings.audit_reminder_enabled ?? true);
      setAuditReminderDaysBefore(settings.audit_reminder_days_before ?? 3);
      const roles = settings.audit_notify_roles ?? ['inventory_manager', 'manager'];
      setAuditNotifyInventoryManager(roles.includes('inventory_manager'));
      setAuditNotifyManager(roles.includes('manager'));
      setAuditNotifyAdmin(roles.includes('admin'));
    }
  }, [settings]);

  const currentAuditRoles = [
    ...(auditNotifyInventoryManager ? ['inventory_manager'] : []),
    ...(auditNotifyManager ? ['manager'] : []),
    ...(auditNotifyAdmin ? ['admin'] : []),
  ];
  const serverAuditRoles = settings?.audit_notify_roles ?? ['inventory_manager', 'manager'];

  const isDirty = settings ? (
    enabled !== settings.enabled ||
    thresholdPct !== settings.default_threshold_pct ||
    inApp !== settings.alert_channels.includes('in_app') ||
    email !== settings.alert_channels.includes('email') ||
    autoCreatePo !== settings.auto_create_draft_po ||
    autoReorderEnabled !== (settings.auto_reorder_enabled ?? false) ||
    autoReorderMode !== (settings.auto_reorder_mode ?? 'to_par') ||
    maxAutoReorderValue !== (settings.max_auto_reorder_value?.toString() ?? '') ||
    requirePoApproval !== (settings.require_po_approval ?? true) ||
    deadStockEnabled !== (settings.dead_stock_enabled ?? true) ||
    deadStockDays !== (settings.dead_stock_days ?? 90) ||
    auditFrequency !== (settings.audit_frequency ?? 'monthly') ||
    auditReminderEnabled !== (settings.audit_reminder_enabled ?? true) ||
    auditReminderDaysBefore !== (settings.audit_reminder_days_before ?? 3) ||
    !isStructurallyEqual(currentAuditRoles.sort(), [...serverAuditRoles].sort())
  ) : true;

  const handleSave = () => {
    const channels: string[] = [];
    if (inApp) channels.push('in_app');
    if (email) channels.push('email');

    upsert.mutate({
      enabled,
      default_threshold_pct: thresholdPct,
      alert_channels: channels,
      auto_create_draft_po: autoCreatePo,
      auto_reorder_enabled: autoReorderEnabled,
      auto_reorder_mode: autoReorderMode,
      max_auto_reorder_value: maxAutoReorderValue ? parseFloat(maxAutoReorderValue) : null,
      require_po_approval: requirePoApproval,
      dead_stock_enabled: deadStockEnabled,
      dead_stock_days: deadStockDays,
      audit_frequency: auditFrequency,
      audit_reminder_enabled: auditReminderEnabled,
      audit_reminder_days_before: auditReminderDaysBefore,
      audit_notify_roles: currentAuditRoles,
    });
  };

  if (isLoading) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={cn(tokens.card.wrapper)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={tokens.card.iconBox}>
                  <Bell className={tokens.card.icon} />
                </div>
                <div>
                  <CardTitle className={tokens.card.title}>Low Stock Alerts</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Configure when and how you're notified about low inventory
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={enabled ? 'default' : 'secondary'} className="text-[10px]">
                  {enabled ? 'Active' : 'Disabled'}
                </Badge>
                {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-5 pt-0">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">Enable low stock alerts</Label>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {enabled && (
              <>
                {/* Threshold slider */}
                <div className="space-y-2">
                  <Label className="text-sm">Alert threshold</Label>
                  <p className="text-xs text-muted-foreground">
                    Alert when stock falls to {thresholdPct}% of minimum stock level
                  </p>
                  <Slider
                    value={[thresholdPct]}
                    onValueChange={([v]) => setThresholdPct(v)}
                    min={50}
                    max={200}
                    step={10}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>50%</span>
                    <span>100% (at level)</span>
                    <span>200%</span>
                  </div>
                </div>

                {/* Channels */}
                <div className="space-y-2">
                  <Label className="text-sm">Notification channels</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={inApp} onCheckedChange={(v) => setInApp(!!v)} />
                      <span className="text-sm">In-app</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={email} onCheckedChange={(v) => setEmail(!!v)} />
                      <span className="text-sm">Email</span>
                    </label>
                  </div>
                </div>

                {/* Recipients */}
                 <div className="space-y-2">
                  <Label className="text-sm">Recipients</Label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>All admins &amp; managers receive alerts by default</span>
                  </div>
                </div>

                {/* Auto-create PO */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Auto-create draft purchase orders</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatically generate draft POs for low-stock items with assigned suppliers
                    </p>
                  </div>
                  <Switch checked={autoCreatePo} onCheckedChange={(v) => { setAutoCreatePo(v); if (!v) setAutoReorderEnabled(false); }} />
                </div>

                {/* Auto-reorder (send to supplier) */}
                {autoCreatePo && (
                  <div className="ml-4 pl-4 border-l border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Auto-send POs to suppliers</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Automatically email POs to suppliers without manual review
                        </p>
                      </div>
                      <Switch checked={autoReorderEnabled} onCheckedChange={setAutoReorderEnabled} />
                    </div>

                    {autoReorderEnabled && (
                      <>
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 mt-1 shrink-0" />
                          <span>POs will be sent to suppliers without manual review</span>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Reorder mode</Label>
                          <RadioGroup value={autoReorderMode} onValueChange={setAutoReorderMode} className="space-y-2">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <RadioGroupItem value="to_par" className="mt-1" />
                              <div>
                                <span className="text-sm">Restock to par level</span>
                                <p className="text-xs text-muted-foreground">Order enough to bring stock back to the target (par) level</p>
                              </div>
                            </label>
                            <label className="flex items-start gap-2 cursor-pointer">
                              <RadioGroupItem value="moq_only" className="mt-1" />
                              <div>
                                <span className="text-sm">Order minimum quantity (MOQ)</span>
                                <p className="text-xs text-muted-foreground">Order only the supplier's minimum order quantity</p>
                              </div>
                            </label>
                          </RadioGroup>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Daily spend cap</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={maxAutoReorderValue}
                            onChange={e => setMaxAutoReorderValue(e.target.value)}
                            placeholder="No limit"
                            className="max-w-[180px]"
                            autoCapitalize="off"
                          />
                          <p className="text-xs text-muted-foreground">
                            Pause auto-reorders when daily PO value exceeds this amount
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Require PO Approval */}
                {autoCreatePo && (
                  <div className="ml-4 pl-4 border-l border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Require manager approval</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Auto-generated POs stay as drafts until a manager approves them
                        </p>
                      </div>
                      <Switch checked={requirePoApproval} onCheckedChange={setRequirePoApproval} />
                    </div>
                  </div>
                )}

                {/* Dead Stock Detection */}
                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Dead stock alerts</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Alert when products have zero sales for a configurable period
                      </p>
                    </div>
                    <Switch checked={deadStockEnabled} onCheckedChange={setDeadStockEnabled} />
                  </div>
                  {deadStockEnabled && (
                    <div className="space-y-2">
                      <Label className="text-sm">No-sale threshold</Label>
                      <p className="text-xs text-muted-foreground">
                        Flag products with no sales for {deadStockDays} days
                      </p>
                      <Slider
                        value={[deadStockDays]}
                        onValueChange={([v]) => setDeadStockDays(v)}
                        min={30}
                        max={365}
                        step={15}
                        className="mt-2"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>30 days</span>
                        <span>90 days</span>
                        <span>365 days</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Audit Schedule */}
                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm flex items-center gap-1.5">
                        <CalendarCheck className="w-3.5 h-3.5 text-primary" />
                        Scheduled audit reminders
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Remind color bar managers when periodic inventory audits are due
                      </p>
                    </div>
                    <Switch checked={auditReminderEnabled} onCheckedChange={setAuditReminderEnabled} />
                  </div>
                  {auditReminderEnabled && (
                    <div className="space-y-4 ml-4 pl-4 border-l border-border">
                      <div className="space-y-2">
                        <Label className="text-sm">Audit frequency</Label>
                        <Select value={auditFrequency} onValueChange={setAuditFrequency}>
                          <SelectTrigger className="max-w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Biweekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Remind before due date</Label>
                        <p className="text-xs text-muted-foreground">
                          Send reminder {auditReminderDaysBefore} day{auditReminderDaysBefore !== 1 ? 's' : ''} before the audit is due
                        </p>
                        <Slider
                          value={[auditReminderDaysBefore]}
                          onValueChange={([v]) => setAuditReminderDaysBefore(v)}
                          min={1}
                          max={7}
                          step={1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>1 day</span>
                          <span>3 days</span>
                          <span>7 days</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Notify roles</Label>
                        <div className="flex flex-wrap items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox checked={auditNotifyInventoryManager} onCheckedChange={(v) => setAuditNotifyInventoryManager(!!v)} />
                            <span className="text-sm">Inventory Manager</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox checked={auditNotifyManager} onCheckedChange={(v) => setAuditNotifyManager(!!v)} />
                            <span className="text-sm">Manager</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox checked={auditNotifyAdmin} onCheckedChange={(v) => setAuditNotifyAdmin(!!v)} />
                            <span className="text-sm">Admin</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Save */}
            {isDirty && (
              <div className="flex justify-end pt-2">
                <Button size={tokens.button.card} onClick={handleSave} disabled={upsert.isPending} className="gap-1.5">
                  {upsert.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
