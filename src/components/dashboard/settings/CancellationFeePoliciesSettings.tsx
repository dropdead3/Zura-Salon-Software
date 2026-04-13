import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Trash2, ShieldAlert, FileText } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { ZuraLoader } from '@/components/ui/ZuraLoader';
import {
  useCancellationFeePolicies,
  useUpsertCancellationFeePolicy,
  useDeleteCancellationFeePolicy,
  type CancellationFeePolicy,
} from '@/hooks/useDepositData';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useSiteSettings, useUpdateSiteSetting } from '@/hooks/useSiteSettings';
import { toast } from 'sonner';

const POLICY_TYPES = [
  { value: 'cancellation', label: 'Cancellation' },
  { value: 'no_show', label: 'No Show' },
];

const NOTICE_TIERS = [
  { value: '', label: 'Any notice' },
  { value: '24', label: 'Under 24 hours' },
  { value: '48', label: 'Under 48 hours' },
  { value: '72', label: 'Under 72 hours' },
];

export function CancellationFeePoliciesSettings() {
  const { data: policies, isLoading } = useCancellationFeePolicies();
  const upsert = useUpsertCancellationFeePolicy();
  const remove = useDeleteCancellationFeePolicy();
  const { formatCurrency } = useFormatCurrency();

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    policy_type: 'cancellation',
    fee_type: 'flat',
    fee_amount: '',
    min_notice_hours: '',
    applies_to_new_clients_only: false,
  });

  // Policy text settings
  interface BookingPolicies {
    deposit_policy_text: string;
    cancellation_policy_text: string;
  }
  const { data: policyTexts, isLoading: policyTextsLoading } = useSiteSettings<BookingPolicies>('booking_policies');
  const updatePolicySetting = useUpdateSiteSetting<BookingPolicies>();
  const [depositPolicyText, setDepositPolicyText] = useState('');
  const [cancellationPolicyText, setCancellationPolicyText] = useState('');
  const [policyTextsDirty, setPolicyTextsDirty] = useState(false);

  useEffect(() => {
    if (policyTexts) {
      setDepositPolicyText(policyTexts.deposit_policy_text || '');
      setCancellationPolicyText(policyTexts.cancellation_policy_text || '');
    }
  }, [policyTexts]);

  const handleSavePolicyTexts = () => {
    updatePolicySetting.mutate(
      { key: 'booking_policies', value: { deposit_policy_text: depositPolicyText, cancellation_policy_text: cancellationPolicyText } },
      {
        onSuccess: () => { toast.success('Policy texts saved'); setPolicyTextsDirty(false); },
        onError: () => toast.error('Failed to save policy texts'),
      },
    );
  };

  const handleAdd = () => {
    upsert.mutate(
      {
        policy_type: form.policy_type,
        fee_type: form.fee_type,
        fee_amount: parseFloat(form.fee_amount) || 0,
        min_notice_hours: form.min_notice_hours ? parseInt(form.min_notice_hours) : null,
        applies_to_new_clients_only: form.applies_to_new_clients_only,
        is_active: true,
      },
      {
        onSuccess: () => {
          setAdding(false);
          setForm({ policy_type: 'cancellation', fee_type: 'flat', fee_amount: '', min_notice_hours: '', applies_to_new_clients_only: false });
        },
      },
    );
  };

  const toggleActive = (p: CancellationFeePolicy) => {
    upsert.mutate({ id: p.id, policy_type: p.policy_type, is_active: !p.is_active });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <ShieldAlert className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Cancellation & No-Show Fees</CardTitle>
            <CardDescription>Configure fee policies applied when clients cancel late or fail to attend.</CardDescription>
          </div>
        </div>
        <Button size={tokens.button.card} onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Policy
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <ZuraLoader size="sm" />
          </div>
        ) : (
          <>
            {policies && policies.length > 0 ? (
              <div className="space-y-2">
                {policies.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card">
                    <div className="flex items-center gap-3">
                      <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{p.policy_type}</Badge>
                          <span className="text-sm">
                            {p.fee_type === 'percentage' ? `${p.fee_amount}%` : formatCurrency(p.fee_amount)}
                          </span>
                          {p.min_notice_hours && (
                            <span className="text-xs text-muted-foreground">under {p.min_notice_hours}h notice</span>
                          )}
                        </div>
                        {p.applies_to_new_clients_only && (
                          <span className="text-[10px] text-muted-foreground">New clients only</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(p.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : !adding ? (
              <div className={tokens.empty.container}>
                <ShieldAlert className={tokens.empty.icon} />
                <h3 className={tokens.empty.heading}>No fee policies configured</h3>
                <p className={tokens.empty.description}>Add a cancellation or no-show fee policy to protect against late changes.</p>
              </div>
            ) : null}

            {adding && (
              <div className="p-4 rounded-lg border border-border space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={form.policy_type} onValueChange={(v) => setForm((f) => ({ ...f, policy_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {POLICY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notice Window</Label>
                    <Select value={form.min_notice_hours} onValueChange={(v) => setForm((f) => ({ ...f, min_notice_hours: v }))}>
                      <SelectTrigger><SelectValue placeholder="Any notice" /></SelectTrigger>
                      <SelectContent>
                        {NOTICE_TIERS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fee Type</Label>
                    <Select value={form.fee_type} onValueChange={(v) => setForm((f) => ({ ...f, fee_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat Amount</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{form.fee_type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}</Label>
                    <Input type="number" min="0" step={form.fee_type === 'percentage' ? '1' : '0.01'} value={form.fee_amount} onChange={(e) => setForm((f) => ({ ...f, fee_amount: e.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.applies_to_new_clients_only} onCheckedChange={(v) => setForm((f) => ({ ...f, applies_to_new_clients_only: v }))} />
                    <Label className="text-xs">New clients only</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleAdd} disabled={!form.fee_amount || upsert.isPending}>
                      {upsert.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
