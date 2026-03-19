import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useServiceAllowancePolicies, useUpsertAllowancePolicy, useDeleteAllowancePolicy } from '@/hooks/billing/useServiceAllowancePolicies';
import { useAllowanceBuckets, useUpsertAllowanceBucket, useDeleteAllowanceBucket } from '@/hooks/backroom/useAllowanceBuckets';
import { useBackroomBillingSettings, useUpsertBackroomBillingSettings } from '@/hooks/billing/useBackroomBillingSettings';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, Plus, Trash2, ChevronDown, ChevronRight, ArrowRight, X } from 'lucide-react';
import { Infotainer } from '@/components/ui/Infotainer';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

const WEIGHT_PRESETS = [15, 30, 45, 60, 90];
const DEVELOPER_RATIOS = [
  { label: '1×', value: 1 },
  { label: '1.5×', value: 1.5 },
  { label: '2×', value: 2 },
];

function buildSummary(policy: any, buckets: any[]): string {
  if ((policy as any).billing_mode === 'parts_and_labor') {
    return 'Parts & Labor — actual product cost passed through';
  }
  if (!buckets.length) {
    return `${policy.included_allowance_qty}${policy.allowance_unit || 'g'} included, overage at $${policy.overage_rate}/${policy.overage_rate_type === 'flat' ? 'flat' : policy.allowance_unit || 'g'}`;
  }
  return buckets.map(b =>
    `${b.bucket_name}: ${b.included_quantity}${b.included_unit} included, overage $${b.overage_rate}/${b.overage_rate_type === 'flat' ? 'flat' : b.included_unit}`
  ).join(' · ');
}

interface Props {
  onNavigate?: (section: string) => void;
}

export function AllowancesBillingSection({ onNavigate }: Props) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const { data: policies, isLoading } = useServiceAllowancePolicies();
  const { data: allBuckets } = useAllowanceBuckets();
  const upsertPolicy = useUpsertAllowancePolicy();
  const deletePolicy = useDeleteAllowancePolicy();
  const upsertBucket = useUpsertAllowanceBucket();
  const deleteBucket = useDeleteAllowanceBucket();

  const { data: servicesMap } = useQuery({
    queryKey: ['services-name-map', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .eq('organization_id', orgId!);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((s: any) => { map[s.id] = s.name; });
      return map;
    },
    enabled: !!orgId,
    staleTime: 120_000,
  });

  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [showNewPolicySelect, setShowNewPolicySelect] = useState(false);

  const { data: trackedServices } = useQuery({
    queryKey: ['tracked-services-for-allowances', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .eq('is_backroom_tracked', true)
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!orgId,
    staleTime: 120_000,
  });

  const eligibleServices = (trackedServices || []).filter(
    s => !(policies || []).some(p => p.service_id === s.id)
  );

  const handleCreatePolicy = (serviceId: string) => {
    if (!orgId) return;
    upsertPolicy.mutate({
      organization_id: orgId,
      service_id: serviceId,
      included_allowance_qty: 30,
      allowance_unit: 'g',
      overage_rate: 0.50,
      overage_rate_type: 'per_unit',
      billing_mode: 'allowance',
      is_active: true,
    } as any, {
      onSuccess: (data: any) => {
        setShowNewPolicySelect(false);
        if (data?.id) setExpandedPolicy(data.id);
      },
    });
  };
  const [showBucketForm, setShowBucketForm] = useState<string | null>(null);
  const [selectedDevRatio, setSelectedDevRatio] = useState<number | null>(null);
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
    setSelectedDevRatio(null);
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

  const getServiceName = (serviceId: string) => servicesMap?.[serviceId] || serviceId.slice(0, 8) + '…';

  const handleBillingModeToggle = (policy: any) => {
    if (!orgId) return;
    const newMode = policy.billing_mode === 'parts_and_labor' ? 'allowance' : 'parts_and_labor';
    upsertPolicy.mutate({
      organization_id: orgId,
      service_id: policy.service_id,
      included_allowance_qty: policy.included_allowance_qty,
      overage_rate: policy.overage_rate,
      billing_mode: newMode,
    } as any);
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
              <CardDescription>Configure service allowance policies and overage billing rules.</CardDescription>
            </div>
          </div>
          {eligibleServices.length > 0 && (
            showNewPolicySelect ? (
              <div className="flex items-center gap-2">
                <Select onValueChange={handleCreatePolicy}>
                  <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Select service…" /></SelectTrigger>
                  <SelectContent>
                    {eligibleServices.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => setShowNewPolicySelect(false)} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowNewPolicySelect(true)}>
                <Plus className="w-3.5 h-3.5" /> New Policy
              </Button>
            )
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {(!policies || policies.length === 0) ? (
            <div className={tokens.empty.container}>
              <DollarSign className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No allowance policies</h3>
              <p className={tokens.empty.description}>Allowances are created per tracked service. Track services first in Service Tracking, then define billing rules here.</p>
              {onNavigate && (
                <Button variant="outline" size="sm" className="mt-2" onClick={() => onNavigate('services')}>
                  Go to Service Tracking
                </Button>
              )}
            </div>
          ) : (
            <>
              {policies.map((policy) => {
                const buckets = (allBuckets || []).filter(b => b.policy_id === policy.id);
                const isExpanded = expandedPolicy === policy.id;
                const isPartsAndLabor = (policy as any).billing_mode === 'parts_and_labor';

                return (
                  <div key={policy.id} className="rounded-lg border bg-card/50 overflow-hidden">
                    <button
                      onClick={() => setExpandedPolicy(isExpanded ? null : policy.id)}
                      className="w-full p-4 flex items-center justify-between text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          <p className={cn(tokens.body.emphasis, 'text-foreground')}>{getServiceName(policy.service_id)}</p>
                          <Badge variant={policy.is_active ? 'default' : 'secondary'}>{policy.is_active ? 'Active' : 'Inactive'}</Badge>
                          {isPartsAndLabor && (
                            <Badge variant="default" className="text-xs">Parts & Labor</Badge>
                          )}
                        </div>
                        <p className={cn('text-sm text-muted-foreground', 'ml-6 mt-1')}>{buildSummary(policy, buckets)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{buckets.length} bucket{buckets.length !== 1 ? 's' : ''}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t p-4 space-y-3">
                        {/* Billing Mode Toggle */}
                        <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                          <div className="flex items-center gap-2">
                            <MetricInfoTooltip description="Parts & Labor passes through the actual product cost to the client instead of using a fixed allowance." />
                            <div>
                              <p className={cn(tokens.body.emphasis, 'text-foreground')}>Parts & Labor Mode</p>
                              <p className="text-xs text-muted-foreground">
                                {isPartsAndLabor
                                  ? 'Actual product cost is passed through to the client.'
                                  : 'Fixed allowance with overage billing.'}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={isPartsAndLabor}
                            onCheckedChange={() => handleBillingModeToggle(policy)}
                          />
                        </div>

                        {!isPartsAndLabor && (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <div className="flex items-center gap-1">
                                  <p className={tokens.label.tiny}>Included Qty</p>
                                  <MetricInfoTooltip description="Amount of product included in the service price at no extra charge." />
                                </div>
                                <p className={cn(tokens.body.emphasis, 'text-foreground')}>{policy.included_allowance_qty} {policy.allowance_unit}</p>
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <p className={tokens.label.tiny}>Overage Rate</p>
                                  <MetricInfoTooltip description="Price charged per unit when usage exceeds the included quantity." />
                                </div>
                                <p className={cn(tokens.body.emphasis, 'text-foreground')}>${policy.overage_rate} / {policy.overage_rate_type}</p>
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <p className={tokens.label.tiny}>Overage Cap</p>
                                  <MetricInfoTooltip description="Maximum overage charge per service, regardless of how much extra was used." />
                                </div>
                                <p className={cn(tokens.body.emphasis, 'text-foreground')}>{policy.overage_cap ? `$${policy.overage_cap}` : 'No cap'}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="destructive" size="sm" onClick={() => deletePolicy.mutate(policy.id)}>
                                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <span className={tokens.heading.subsection}>Buckets</span>
                                  <MetricInfoTooltip description="Separate billing tiers within one policy — e.g. one bucket for color, another for lightener." />
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setShowBucketForm(policy.id)}>
                                  <Plus className="w-3 h-3 mr-1" /> Add Bucket
                                </Button>
                              </div>

                              {buckets.map(bucket => (
                                <div key={bucket.id} className="rounded-lg border bg-muted/20 p-3 flex items-center justify-between">
                                  <div>
                                    <p className={cn(tokens.body.emphasis, 'text-foreground')}>{bucket.bucket_name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {bucket.included_quantity}{bucket.included_unit} included · ${bucket.overage_rate}/{bucket.overage_rate_type}
                                      {bucket.is_taxable && ' · Taxable'}
                                      {bucket.requires_manager_override && ' · Manager override required'}
                                    </p>
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => deleteBucket.mutate(bucket.id)} className="h-8 w-8">
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              ))}

                              {showBucketForm === policy.id && (
                                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className={tokens.label.default}>Bucket Name</label>
                                      <Input value={bucketForm.bucket_name} onChange={e => setBucketForm(f => ({ ...f, bucket_name: e.target.value }))} className="mt-1" placeholder="e.g. Color" />
                                    </div>
                                    <div>
                                      <label className={tokens.label.default}>Billing Label</label>
                                      <Input value={bucketForm.billing_label} onChange={e => setBucketForm(f => ({ ...f, billing_label: e.target.value }))} className="mt-1" placeholder="Label on invoice" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1">
                                        <label className={tokens.label.default}>Included Quantity</label>
                                        <MetricInfoTooltip description="Amount of product included at no extra charge." />
                                      </div>
                                      {/* Weight presets */}
                                      <div className="flex gap-1 mt-1 mb-1">
                                        {WEIGHT_PRESETS.map(w => (
                                          <Button
                                            key={w}
                                            type="button"
                                            variant={bucketForm.included_quantity === w ? 'default' : 'outline'}
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => setBucketForm(f => ({ ...f, included_quantity: w }))}
                                          >
                                            {w}g
                                          </Button>
                                        ))}
                                      </div>
                                      <Input type="number" value={bucketForm.included_quantity} onChange={e => setBucketForm(f => ({ ...f, included_quantity: Number(e.target.value) }))} />
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
                                    <div className="md:col-span-2">
                                      <div className="flex items-center gap-1">
                                        <label className={tokens.label.default}>Developer Ratio</label>
                                        <MetricInfoTooltip description="Auto-calculates developer quantity based on color weight. E.g. 30g color × 2× = 60g developer." />
                                      </div>
                                      <div className="flex gap-1 mt-1">
                                        {DEVELOPER_RATIOS.map(r => (
                                          <Button
                                            key={r.value}
                                            type="button"
                                            variant={selectedDevRatio === r.value ? 'default' : 'outline'}
                                            size="sm"
                                            className="h-7 px-3 text-xs"
                                            onClick={() => setSelectedDevRatio(r.value)}
                                          >
                                            {r.label}
                                          </Button>
                                        ))}
                                        {selectedDevRatio && bucketForm.included_quantity > 0 && (
                                          <span className="text-xs text-muted-foreground self-center ml-2">
                                            = {Math.round(bucketForm.included_quantity * selectedDevRatio)}g developer
                                          </span>
                                        )}
                                      </div>
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
                                      <div className="flex items-center gap-1"><label className={tokens.label.default}>Rounding Rule</label><MetricInfoTooltip description="How fractional overage amounts are rounded for billing." /></div>
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
                                    <label className="flex items-center gap-2 text-sm text-foreground">
                                      <Switch checked={bucketForm.is_taxable} onCheckedChange={c => setBucketForm(f => ({ ...f, is_taxable: c }))} />
                                      Taxable
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-foreground">
                                      <Switch checked={bucketForm.requires_manager_override} onCheckedChange={c => setBucketForm(f => ({ ...f, requires_manager_override: c }))} />
                                      <MetricInfoTooltip description="When on, a manager must approve the overage charge before it's applied." />
                                      Manager Override Required
                                    </label>
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" size="sm" onClick={resetBucketForm}>Cancel</Button>
                                    <Button size="sm" onClick={() => handleSaveBucket(policy.id)} disabled={!bucketForm.bucket_name}>
                                      Save Bucket
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {isPartsAndLabor && (
                          <div className="flex gap-2">
                            <Button variant="destructive" size="sm" onClick={() => deletePolicy.mutate(policy.id)}>
                              <Trash2 className="w-3 h-3 mr-1" /> Remove Policy
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Next step hint */}
              {onNavigate && (
                <div className="flex justify-end pt-2 border-t">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => onNavigate('stations')}>
                    Next: Stations & Hardware <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
