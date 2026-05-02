import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import {
  useReviewAutomationRules, useSaveAutomationRule, useDeleteAutomationRule,
  AutomationRule, AutomationRuleInput,
} from '@/hooks/useReviewAutomationRules';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { ComplianceBanner } from '@/components/feedback/ComplianceBanner';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';

const DEFAULT_RULE: AutomationRuleInput = {
  name: 'Default review request',
  is_active: true,
  send_delay_minutes: 240,
  eligible_service_categories: null,
  excluded_service_categories: ['Consultation', 'Correction', 'Redo', 'Model'],
  excluded_service_names: [],
  frequency_cap_days: 90,
  stylist_inclusion_mode: 'all',
  stylist_user_ids: [],
  location_ids: null,
  channel: 'email',
};

function RuleEditor({ rule, onClose }: { rule: AutomationRule | null; onClose: () => void }) {
  const save = useSaveAutomationRule();
  const [draft, setDraft] = useState<AutomationRuleInput & { id?: string }>(
    rule ? { ...rule } : DEFAULT_RULE,
  );

  return (
    <PremiumFloatingPanel open onOpenChange={(o) => !o && onClose()} showCloseButton>
      <div className="p-6 space-y-5 overflow-y-auto h-full">
        <h2 className="font-display text-lg tracking-wide">
          {rule ? 'Edit Rule' : 'New Automation Rule'}
        </h2>

        <div className="space-y-2">
          <Label>Rule name</Label>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
          <Label htmlFor="active">Active</Label>
          <Switch id="active" checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Send delay (minutes)</Label>
            <Input
              type="number" min={0}
              value={draft.send_delay_minutes}
              onChange={(e) => setDraft({ ...draft, send_delay_minutes: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Frequency cap (days)</Label>
            <Input
              type="number" min={0}
              value={draft.frequency_cap_days}
              onChange={(e) => setDraft({ ...draft, frequency_cap_days: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Channel</Label>
          <Select value={draft.channel} onValueChange={(v) => setDraft({ ...draft, channel: v as 'email' | 'sms' | 'both' })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS (coming soon)</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Excluded service categories (comma-separated)</Label>
          <Input
            value={draft.excluded_service_categories.join(', ')}
            onChange={(e) =>
              setDraft({ ...draft, excluded_service_categories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
            }
          />
          <p className="text-xs text-muted-foreground">
            Default excludes: Consultation, Correction, Redo, Model. Discounted/internal services should also be excluded.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Excluded service names (comma-separated)</Label>
          <Input
            value={draft.excluded_service_names.join(', ')}
            onChange={(e) =>
              setDraft({ ...draft, excluded_service_names: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
            }
          />
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          The dispatcher that fires real-time sends from these rules ships in the next phase. This page captures
          configuration so it's ready when the scheduler turns on.
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={async () => { await save.mutateAsync(draft); onClose(); }}
            disabled={save.isPending}
          >
            Save Rule
          </Button>
        </div>
      </div>
    </PremiumFloatingPanel>
  );
}

export default function ReviewAutomationRules() {
  const { dashPath } = useOrgDashboardPath();
  const { data: rules } = useReviewAutomationRules();
  const del = useDeleteAutomationRule();
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        <DashboardPageHeader
          title="Review Request Automations"
          description="Configure when and how clients are asked for feedback after appointments."
          backTo={dashPath('/admin/feedback')}
          backLabel="Back to Client Feedback"
          actions={
            <Button onClick={() => setCreating(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Rule
            </Button>
          }
        />
        <ComplianceBanner />

        {(rules?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No automation rules yet. Create one to define how feedback requests are sent.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {rules!.map((r) => (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle className="font-display text-base tracking-wide flex items-center gap-3">
                    {r.name}
                    {r.is_active
                      ? <Badge>Active</Badge>
                      : <Badge variant="secondary">Paused</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="space-x-4">
                    <span>Delay: {r.send_delay_minutes} min</span>
                    <span>Cap: {r.frequency_cap_days} days</span>
                    <span>Channel: {r.channel}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(r)}>Edit</Button>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {(editing || creating) && (
        <RuleEditor
          rule={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </DashboardLayout>
  );
}
