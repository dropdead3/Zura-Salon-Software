import { useState } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useServiceAllowancePolicies, useUpsertAllowancePolicy, useDeleteAllowancePolicy } from '@/hooks/billing/useServiceAllowancePolicies';
import { useAllowanceBuckets, useUpsertAllowanceBucket, useDeleteAllowanceBucket } from '@/hooks/backroom/useAllowanceBuckets';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

function buildSummary(policy: any, buckets: any[]): string {
  if (!buckets.length) {
    return `${policy.included_allowance_qty}${policy.allowance_unit || 'g'} included, overage at $${policy.overage_rate}/${policy.overage_rate_type === 'flat' ? 'flat' : policy.allowance_unit || 'g'}`;
  }
  return buckets.map(b =>
    `${b.bucket_name}: ${b.included_quantity}${b.included_unit} included, overage $${b.overage_rate}/${b.overage_rate_type === 'flat' ? 'flat' : b.included_unit}`
  ).join(' · ');
}

export function AllowancesBillingSection() {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: policies, isLoading } = useServiceAllowancePolicies();
  const { data: allBuckets } = useAllowanceBuckets();
  const upsertPolicy = useUpsertAllowancePolicy();
  const deletePolicy = useDeleteAllowancePolicy();
  const upsertBucket = useUpsertAllowanceBucket();
  const deleteBucket = useDeleteAllowanceBucket();

  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [showBucketForm, setShowBucketForm] = useState<string | null>(null);
  const [bucketForm, setBucketForm] = useState({
    bucket_name: '', included_quantity: 0, included_unit: 'g',
    overage_rate: 0, overage_rate_type: 'per_unit', overage_cap: '',
    is_taxable: false, requires_manager_override: false,
    min_charge_threshold: 0, rounding_rule: 'round_up',
    billing_label: '',
  });

  const resetBucketForm = () => {
    setBucketForm({
      bucket_name: '', included_quantity: 0, included_unit: 'g',
      overage_rate: 0, overage_rate_type: 'per_unit', overage_cap: '',
      is_taxable: false, requires_manager_override: false,
      min_charge_threshold: 0, rounding_rule: 'round_up',
      billing_label: '',
    });
    setShowBucketForm(null);
  };

  const handleSaveBucket = (policyId: string) => {
    if (!orgId) return;
    upsertBucket.mutate({
      organization_id: orgId,
      policy_id: policyId,
      bucket_name: bucketForm.bucket_name,
      included_quantity: bucketForm.included_quantity,
      included_unit: bucketForm.included_unit,
      overage_rate: bucketForm.overage_rate,
      overage_rate_type: bucketForm.overage_rate_type,
      overage_cap: bucketForm.overage_cap ? Number(bucketForm.overage_cap) : null,
      is_taxable: bucketForm.is_taxable,
      requires_manager_override: bucketForm.requires_manager_override,
      min_charge_threshold: bucketForm.min_charge_threshold,
      rounding_rule: bucketForm.rounding_rule,
      billing_label: bucketForm.billing_label || bucketForm.bucket_name,
    }, { onSuccess: resetBucketForm });
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
        id="backroom-allowances-guide"
        title="Allowances & Billing"
        description="Define how much product is included in each service price and what to charge when a stylist uses more. Example: 30g of color included, $0.50/g overage. Requires services to be tracked first."
        icon={<DollarSign className="h-4 w-4 text-primary" />}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <DollarSign className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Allowances & Billing</CardTitle>
              <CardDescription className={tokens.body.muted}>Configure service allowance policies and overage billing rules.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(!policies || policies.length === 0) ? (
            <div className={tokens.empty.container}>
              <DollarSign className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No allowance policies</h3>
              <p className={tokens.empty.description}>Allowances are created per tracked service. Track services first in Service Tracking, then define billing rules here.</p>
            </div>
          ) : (
            policies.map((policy) => {
              const buckets = (allBuckets || []).filter(b => b.policy_id === policy.id);
              const isExpanded = expandedPolicy === policy.id;

              return (
                <div key={policy.id} className={cn(tokens.card.inner, 'overflow-hidden')}>
                  <button
                    onClick={() => setExpandedPolicy(isExpanded ? null : policy.id)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        <p className={tokens.body.emphasis}>Service: {policy.service_id.slice(0, 8)}…</p>
                        <Badge variant={policy.is_active ? 'default' : 'secondary'}>{policy.is_active ? 'Active' : 'Inactive'}</Badge>
                      </div>
                      <p className={cn(tokens.body.muted, 'ml-6 mt-1')}>{buildSummary(policy, buckets)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={tokens.body.muted}>{buckets.length} bucket{buckets.length !== 1 ? 's' : ''}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/50 p-4 space-y-3">
                      {/* Policy summary */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <div className="flex items-center gap-1">
                            <p className={tokens.label.tiny}>Included Qty</p>
                            <MetricInfoTooltip description="Amount of product included in the service price at no extra charge." />
                          </div>
                          <p className={tokens.body.emphasis}>{policy.included_allowance_qty} {policy.allowance_unit}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className={tokens.label.tiny}>Overage Rate</p>
                            <MetricInfoTooltip description="Price charged per unit when usage exceeds the included quantity." />
                          </div>
                          <p className={tokens.body.emphasis}>${policy.overage_rate} / {policy.overage_rate_type}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className={tokens.label.tiny}>Overage Cap</p>
                            <MetricInfoTooltip description="Maximum overage charge per service, regardless of how much extra was used." />
                          </div>
                          <p className={tokens.body.emphasis}>{policy.overage_cap ? `$${policy.overage_cap}` : 'No cap'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="destructive" size={tokens.button.inline} onClick={() => deletePolicy.mutate(policy.id)}>
                            <Trash2 className="w-3 h-3 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>

                      {/* Buckets */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className={tokens.heading.subsection}>Buckets</span>
                            <MetricInfoTooltip description="Separate billing tiers within one policy — e.g. one bucket for color, another for lightener." />
                          </div>
                          <Button variant="outline" size={tokens.button.inline} onClick={() => setShowBucketForm(policy.id)}>
                            <Plus className="w-3 h-3 mr-1" /> Add Bucket
                          </Button>
                        </div>

                        {buckets.map(bucket => (
                          <div key={bucket.id} className={cn(tokens.card.innerDeep, 'p-3 flex items-center justify-between')}>
                            <div>
                              <p className={tokens.body.emphasis}>{bucket.bucket_name}</p>
                              <p className={tokens.body.muted}>
                                {bucket.included_quantity}{bucket.included_unit} included · ${bucket.overage_rate}/{bucket.overage_rate_type}
                                {bucket.is_taxable && ' · Taxable'}
                                {bucket.requires_manager_override && ' · Manager override required'}
                              </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => deleteBucket.mutate(bucket.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ))}

                        {showBucketForm === policy.id && (
                          <div className={cn(tokens.card.innerDeep, 'p-4 space-y-3')}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <div className="flex items-center gap-1"><label className={tokens.label.default}>Bucket Name</label></div>
                                <Input value={bucketForm.bucket_name} onChange={e => setBucketForm(f => ({ ...f, bucket_name: e.target.value }))} className="mt-1" placeholder="e.g. Color" />
                              </div>
                              <div>
                                <label className={tokens.label.default}>Billing Label</label>
                                <Input value={bucketForm.billing_label} onChange={e => setBucketForm(f => ({ ...f, billing_label: e.target.value }))} className="mt-1" placeholder="Label on invoice" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1"><label className={tokens.label.default}>Included Quantity</label><MetricInfoTooltip description="Amount of product included at no extra charge." /></div>
                                <Input type="number" value={bucketForm.included_quantity} onChange={e => setBucketForm(f => ({ ...f, included_quantity: Number(e.target.value) }))} className="mt-1" />
                              </div>
                              <div>
                                <label className={tokens.label.default}>Unit</label>
                                <Select value={bucketForm.included_unit} onValueChange={v => setBucketForm(f => ({ ...f, included_unit: v }))}>
                                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="g">Grams (g)</SelectItem>
                                    <SelectItem value="ml">Milliliters (ml)</SelectItem>
                                    <SelectItem value="oz">Ounces (oz)</SelectItem>
                                    <SelectItem value="units">Units</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <div className="flex items-center gap-1"><label className={tokens.label.default}>Overage Rate ($)</label><MetricInfoTooltip description="Price charged per unit when usage exceeds the included quantity." /></div>
                                <Input type="number" step="0.01" value={bucketForm.overage_rate} onChange={e => setBucketForm(f => ({ ...f, overage_rate: Number(e.target.value) }))} className="mt-1" />
                              </div>
                              <div>
                                <label className={tokens.label.default}>Overage Type</label>
                                <Select value={bucketForm.overage_rate_type} onValueChange={v => setBucketForm(f => ({ ...f, overage_rate_type: v }))}>
                                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="per_unit">Per Unit</SelectItem>
                                    <SelectItem value="flat">Flat Fee</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <div className="flex items-center gap-1"><label className={tokens.label.default}>Overage Cap ($, optional)</label><MetricInfoTooltip description="Maximum overage charge per service, regardless of how much extra was used." /></div>
                                <Input type="number" step="0.01" value={bucketForm.overage_cap} onChange={e => setBucketForm(f => ({ ...f, overage_cap: e.target.value }))} className="mt-1" placeholder="No cap" />
                              </div>
                              <div>
                                <label className={tokens.label.default}>Rounding Rule</label>
                                <Select value={bucketForm.rounding_rule} onValueChange={v => setBucketForm(f => ({ ...f, rounding_rule: v }))}>
                                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="round_up">Round Up</SelectItem>
                                    <SelectItem value="round_down">Round Down</SelectItem>
                                    <SelectItem value="round_nearest">Round Nearest</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 text-sm">
                                <Switch checked={bucketForm.is_taxable} onCheckedChange={c => setBucketForm(f => ({ ...f, is_taxable: c }))} />
                                Taxable
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <Switch checked={bucketForm.requires_manager_override} onCheckedChange={c => setBucketForm(f => ({ ...f, requires_manager_override: c }))} />
                                Manager Override Required
                              </label>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="ghost" size={tokens.button.card} onClick={resetBucketForm}>Cancel</Button>
                              <Button size={tokens.button.card} onClick={() => handleSaveBucket(policy.id)} disabled={!bucketForm.bucket_name}>
                                Save Bucket
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
