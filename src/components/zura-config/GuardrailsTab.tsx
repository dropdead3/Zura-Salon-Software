import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AI_ASSISTANT_NAME_DEFAULT } from '@/lib/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import {
  useZuraGuardrails,
  useCreateGuardrail,
  useUpdateGuardrail,
  useDeleteGuardrail,
  ZuraGuardrail,
} from '@/hooks/useZuraConfig';

interface GuardrailsTabProps {
  organizationId: string;
}

const RULE_TYPES = [
  { value: 'topic_block', label: 'Topic Block', icon: AlertTriangle },
  { value: 'data_boundary', label: 'Data Boundary', icon: ShieldCheck },
  { value: 'behavior_rule', label: 'Behavior Rule', icon: Zap },
  { value: 'compliance', label: 'Compliance', icon: ShieldCheck },
];

const TEMPLATES = [
  { rule_type: 'data_boundary', rule_description: 'Never discuss employee salaries or pay rates with non-admin roles', severity: 'hard_block' },
  { rule_type: 'behavior_rule', rule_description: 'Never recommend competitor salons or products', severity: 'hard_block' },
  { rule_type: 'compliance', rule_description: 'Always defer medical or health questions to licensed professionals', severity: 'hard_block' },
  { rule_type: 'data_boundary', rule_description: 'Never share individual stylist performance metrics with other stylists', severity: 'hard_block' },
  { rule_type: 'topic_block', rule_description: 'Do not engage in political, religious, or controversial social discussions', severity: 'soft_warn' },
  { rule_type: 'behavior_rule', rule_description: 'Never make promises about appointment availability without checking the system', severity: 'soft_warn' },
  { rule_type: 'data_boundary', rule_description: 'Do not disclose client contact information to other clients', severity: 'hard_block' },
  { rule_type: 'compliance', rule_description: 'Do not provide legal, tax, or accounting advice - refer to professionals', severity: 'hard_block' },
];

const EMPTY_GUARDRAIL = {
  rule_type: 'behavior_rule' as const,
  rule_description: '',
  severity: 'soft_warn' as const,
  is_active: true,
};

export function GuardrailsTab({ organizationId }: GuardrailsTabProps) {
  const { data: guardrails = [], isLoading } = useZuraGuardrails(organizationId);
  const createGuardrail = useCreateGuardrail();
  const updateGuardrail = useUpdateGuardrail();
  const deleteGuardrailMut = useDeleteGuardrail();

  const [editing, setEditing] = useState<Partial<ZuraGuardrail> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const openNew = () => { setEditing({ ...EMPTY_GUARDRAIL }); setIsNew(true); };
  const openEdit = (g: ZuraGuardrail) => { setEditing({ ...g }); setIsNew(false); };
  const close = () => { setEditing(null); setIsNew(false); };

  const handleSave = () => {
    if (!editing?.rule_description) return;
    if (isNew) {
      createGuardrail.mutate({ orgId: organizationId, data: editing }, { onSuccess: close });
    } else if (editing.id) {
      updateGuardrail.mutate({ id: editing.id, orgId: organizationId, data: editing }, { onSuccess: close });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this guardrail?')) return;
    deleteGuardrailMut.mutate({ id, orgId: organizationId });
  };

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    // Check if already exists
    if (guardrails.some(g => g.rule_description === template.rule_description)) return;
    createGuardrail.mutate({
      orgId: organizationId,
      data: { ...template, is_active: true } as Partial<ZuraGuardrail>,
    });
  };

  const hardBlockCount = guardrails.filter(g => g.severity === 'hard_block' && g.is_active).length;
  const softWarnCount = guardrails.filter(g => g.severity === 'soft_warn' && g.is_active).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Safety Guardrails</CardTitle>
              <CardDescription>
                {hardBlockCount} hard blocks · {softWarnCount} soft warnings active
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowTemplates(!showTemplates)}>
                {showTemplates ? 'Hide' : 'Show'} Templates
              </Button>
              <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add Rule</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Templates */}
          {showTemplates && (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Pre-Built Templates</CardTitle>
                <CardDescription className="text-xs">Click to add common guardrails</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TEMPLATES.map((template, i) => {
                    const exists = guardrails.some(g => g.rule_description === template.rule_description);
                    return (
                      <Button
                        key={i}
                        variant="outline"
                        className="h-auto py-2 px-3 text-left justify-start text-xs whitespace-normal"
                        disabled={exists}
                        onClick={() => applyTemplate(template)}
                      >
                        <Badge variant={template.severity === 'hard_block' ? 'destructive' : 'secondary'} className="text-[10px] mr-2 shrink-0">
                          {template.severity === 'hard_block' ? 'BLOCK' : 'WARN'}
                        </Badge>
                        <span className="line-clamp-2">{template.rule_description}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guardrails list */}
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : guardrails.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No guardrails configured</p>
              <p className="text-xs mt-1">Add safety rules to control what {AI_ASSISTANT_NAME_DEFAULT} can and can't discuss</p>
            </div>
          ) : (
            <div className="space-y-2">
              {guardrails.map(g => (
                <div key={g.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <Badge
                    variant={g.severity === 'hard_block' ? 'destructive' : 'secondary'}
                    className="text-[10px] mt-0.5 shrink-0"
                  >
                    {g.severity === 'hard_block' ? 'BLOCK' : 'WARN'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{g.rule_description}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {RULE_TYPES.find(t => t.value === g.rule_type)?.label || g.rule_type}
                      </Badge>
                      {!g.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(g)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(g.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={!!editing} onOpenChange={open => { if (!open) close(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? 'Add Guardrail' : 'Edit Guardrail'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rule Type</Label>
                <Select value={editing.rule_type} onValueChange={v => setEditing({ ...editing, rule_type: v as ZuraGuardrail['rule_type'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rule Description</Label>
                <Textarea
                  value={editing.rule_description || ''}
                  onChange={e => setEditing({ ...editing, rule_description: e.target.value })}
                  placeholder="Never discuss employee salaries with non-admin roles"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={editing.severity} onValueChange={v => setEditing({ ...editing, severity: v as ZuraGuardrail['severity'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soft_warn">Soft Warning — Politely deflects</SelectItem>
                    <SelectItem value="hard_block">Hard Block — Absolute refusal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={editing.is_active ?? true} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <Button onClick={handleSave} disabled={createGuardrail.isPending || updateGuardrail.isPending}>
              {isNew ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
