/**
 * Policy Setup Wizard (Wave 28.3)
 *
 * 4-step wizard captures the business profile that drives recommendations.
 * Steps: Business · Services offered · Team & roles · Existing materials.
 * On finish: saves profile + adopts the recommended policy set.
 */
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

const SELECTABLE_ROW_CLASS =
  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors font-sans text-sm';
const SELECTABLE_ROW_CLASS_START =
  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors font-sans text-sm';
const ROW_SELECTED = 'border-primary bg-primary/5';
const ROW_UNSELECTED = 'border-border hover:bg-muted';

const formatCategoryLabel = (cat: string) =>
  cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
import { US_STATES, ROLE_OPTIONS } from '@/lib/handbook/brandTones';
import {
  usePolicyOrgProfile,
  useUpsertPolicyOrgProfile,
  useAdoptPoliciesFromLibrary,
  recommendedKeysForProfile,
  type PolicyOrgProfileInput,
} from '@/hooks/policy/usePolicyOrgProfile';
import { usePolicyLibrary } from '@/hooks/policy/usePolicyData';

interface Props {
  onClose: () => void;
  onCompleted?: () => void;
}

const BUSINESS_TYPES = [
  { key: 'salon', label: 'Salon' },
  { key: 'extensions_studio', label: 'Extensions studio' },
  { key: 'barbershop', label: 'Barbershop' },
  { key: 'spa', label: 'Spa / wellness' },
  { key: 'multi_service', label: 'Multi-service' },
] as const;

const TEAM_SIZE_BANDS = [
  { key: 'solo', label: 'Solo (1)' },
  { key: 'small', label: 'Small (2–5)' },
  { key: 'medium', label: 'Medium (6–15)' },
  { key: 'large', label: 'Large (16–40)' },
  { key: 'enterprise', label: 'Enterprise (40+)' },
] as const;

const SERVICE_CATEGORIES = [
  { key: 'cut', label: 'Cut & style' },
  { key: 'color', label: 'Color' },
  { key: 'extensions', label: 'Extensions' },
  { key: 'treatments', label: 'Treatments' },
  { key: 'barbering', label: 'Barbering' },
  { key: 'lash_brow', label: 'Lash & brow' },
  { key: 'nails', label: 'Nails' },
  { key: 'esthetics', label: 'Esthetics' },
] as const;

type WizardStep = 'business' | 'services' | 'team' | 'existing' | 'review';
const STEP_ORDER: WizardStep[] = ['business', 'services', 'team', 'existing', 'review'];

const STEP_META: Record<WizardStep, { label: string; description: string }> = {
  business: { label: 'Business', description: 'Type, location, and team size' },
  services: { label: 'Services', description: 'What you offer to clients' },
  team: { label: 'Team & roles', description: 'Who works in your business' },
  existing: { label: 'Existing materials', description: 'What you already have in place' },
  review: { label: 'Review', description: 'Confirm and adopt recommended policies' },
};

export function PolicySetupWizard({ onClose, onCompleted }: Props) {
  const { data: existingProfile } = usePolicyOrgProfile();
  const { data: library = [] } = usePolicyLibrary();
  const upsert = useUpsertPolicyOrgProfile();
  const adopt = useAdoptPoliciesFromLibrary();

  const [step, setStep] = useState<WizardStep>('business');

  const [form, setForm] = useState<PolicyOrgProfileInput>(() => ({
    business_type: existingProfile?.business_type ?? null,
    primary_state: existingProfile?.primary_state ?? null,
    team_size_band: existingProfile?.team_size_band ?? null,
    offers_extensions: existingProfile?.offers_extensions ?? false,
    offers_retail: existingProfile?.offers_retail ?? false,
    offers_packages: existingProfile?.offers_packages ?? false,
    offers_memberships: existingProfile?.offers_memberships ?? false,
    serves_minors: existingProfile?.serves_minors ?? false,
    has_existing_handbook: existingProfile?.has_existing_handbook ?? false,
    has_existing_client_policies: existingProfile?.has_existing_client_policies ?? false,
    roles_used: existingProfile?.roles_used ?? [],
    service_categories: existingProfile?.service_categories ?? [],
  }));

  const recommendedKeys = useMemo(
    () =>
      recommendedKeysForProfile(library, {
        ...(existingProfile ?? ({} as any)),
        ...form,
        organization_id: '',
        id: '',
        setup_completed_at: null,
        created_at: '',
        updated_at: '',
      }),
    [library, form, existingProfile],
  );

  const recommendedByCategory = useMemo(() => {
    const map = new Map<string, number>();
    library
      .filter((l) => recommendedKeys.includes(l.key))
      .forEach((l) => map.set(l.category, (map.get(l.category) ?? 0) + 1));
    return map;
  }, [library, recommendedKeys]);

  /**
   * Wave 28.11.6 — expansion prompt.
   * Detect offers_* flags that flipped false → true since the existing profile.
   * Each flip unlocks new required + recommended policies that the operator
   * should review on the final step. Adopted policies always stay; only the
   * starter set grows. See mem://features/policy-os-applicability-doctrine.
   */
  type ExpansionFlag = 'offers_extensions' | 'offers_retail' | 'offers_packages' | 'serves_minors';
  const EXPANSION_FLAGS: Array<{
    key: ExpansionFlag;
    label: string;
    filter: (l: typeof library[number]) => boolean;
  }> = [
    { key: 'offers_extensions', label: 'extensions', filter: (l) => l.requires_extensions },
    { key: 'offers_retail', label: 'retail products', filter: (l) => l.requires_retail },
    { key: 'offers_packages', label: 'packages or memberships', filter: (l) => l.requires_packages },
    { key: 'serves_minors', label: 'minors (under 18)', filter: (l) => l.requires_minors },
  ];

  const expansionFlips = useMemo(() => {
    if (!existingProfile?.setup_completed_at) return [] as Array<{
      key: ExpansionFlag;
      label: string;
      requiredCount: number;
      recommendedCount: number;
    }>;
    return EXPANSION_FLAGS
      .filter((f) => !existingProfile[f.key] && form[f.key])
      .map((f) => {
        const matched = library.filter(f.filter);
        return {
          key: f.key,
          label: f.label,
          requiredCount: matched.filter((l) => l.recommendation === 'required').length,
          recommendedCount: matched.filter((l) => l.recommendation === 'recommended').length,
        };
      })
      .filter((f) => f.requiredCount + f.recommendedCount > 0);
  }, [existingProfile, form, library]);

  /**
   * Wave 28.11.7 — live "what changes" helper for the services step.
   * Computes per-toggle policy counts so operators see the impact of flipping
   * `offers_*` BEFORE they reach the review step. Only flags with library
   * content show live counts; the rest get a "(coming soon)" badge.
   */
  const flagImpacts = useMemo(() => {
    const FLAG_HAS_LIBRARY: Record<string, ((l: typeof library[number]) => boolean) | null> = {
      offers_extensions: (l) => l.requires_extensions,
      offers_retail: (l) => l.requires_retail,
      offers_packages: (l) => l.requires_packages,
      serves_minors: (l) => l.requires_minors,
      offers_memberships: null,
    };
    const result: Record<string, {
      hasLibrary: boolean;
      total: number;
      requiredCount: number;
      recommendedCount: number;
    }> = {};
    Object.entries(FLAG_HAS_LIBRARY).forEach(([key, filter]) => {
      if (!filter) {
        result[key] = { hasLibrary: false, total: 0, requiredCount: 0, recommendedCount: 0 };
        return;
      }
      const matched = library.filter(filter);
      result[key] = {
        hasLibrary: true,
        total: matched.length,
        requiredCount: matched.filter((l) => l.recommendation === 'required').length,
        recommendedCount: matched.filter((l) => l.recommendation === 'recommended').length,
      };
    });
    return result;
  }, [library]);

  const stepIndex = STEP_ORDER.indexOf(step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEP_ORDER.length - 1;
  const canProceed = (() => {
    if (step === 'business') return !!form.business_type && !!form.team_size_band;
    return true;
  })();

  const next = () => !isLast && setStep(STEP_ORDER[stepIndex + 1]);
  const back = () => !isFirst && setStep(STEP_ORDER[stepIndex - 1]);

  const handleFinish = async () => {
    await upsert.mutateAsync({
      ...form,
      setup_completed_at: new Date().toISOString(),
    });
    if (recommendedKeys.length > 0) {
      await adopt.mutateAsync(recommendedKeys);
    }
    onCompleted?.();
    onClose();
  };

  const toggleArrayItem = (field: 'roles_used' | 'service_categories', value: string) => {
    setForm((f) => {
      const set = new Set(f[field]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...f, [field]: Array.from(set) };
    });
  };

  const isSaving = upsert.isPending || adopt.isPending;

  return (
    <div className="space-y-6">
      {/* Step rail */}
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        {STEP_ORDER.map((s, idx) => {
          const isActive = s === step;
          const isDone = idx < stepIndex;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={cn(
                'flex items-center gap-2 transition-colors shrink-0',
                isActive && 'text-foreground',
                !isActive && isDone && 'text-foreground',
                !isActive && !isDone && 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-sans border shrink-0',
                  isDone && 'bg-primary text-primary-foreground border-primary',
                  isActive && 'border-primary text-primary',
                  !isActive && !isDone && 'border-border text-muted-foreground',
                )}
              >
                {isDone ? <Check className="w-3 h-3" /> : idx + 1}
              </span>
              <span className="font-sans text-sm">{STEP_META[s].label}</span>
            </button>
          );
        })}
      </div>

      <div>
        <p className={tokens.body.muted}>{STEP_META[step].description}</p>
      </div>

      {/* Step content */}
      <div className="space-y-5">
          {step === 'business' && (
            <>
              <div className="space-y-2">
                <Label className={tokens.body.emphasis}>Business type</Label>
                <Select
                  value={form.business_type ?? ''}
                  onValueChange={(v) => setForm((f) => ({ ...f, business_type: v }))}
                >
                  <SelectTrigger className="font-sans">
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((b) => (
                      <SelectItem key={b.key} value={b.key}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={tokens.body.emphasis}>Primary state</Label>
                <Select
                  value={form.primary_state ?? ''}
                  onValueChange={(v) => setForm((f) => ({ ...f, primary_state: v }))}
                >
                  <SelectTrigger className="font-sans">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className={tokens.body.emphasis}>Team size</Label>
                <RadioGroup
                  value={form.team_size_band ?? ''}
                  onValueChange={(v) => setForm((f) => ({ ...f, team_size_band: v }))}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  {TEAM_SIZE_BANDS.map((b) => (
                    <Label
                      key={b.key}
                      htmlFor={`team-${b.key}`}
                      className={cn(
                        SELECTABLE_ROW_CLASS,
                        form.team_size_band === b.key ? ROW_SELECTED : ROW_UNSELECTED,
                      )}
                    >
                      <RadioGroupItem value={b.key} id={`team-${b.key}`} />
                      {b.label}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </>
          )}

          {step === 'services' && (
            <>
              <div className="space-y-2">
                <Label className={tokens.body.emphasis}>Service categories offered</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SERVICE_CATEGORIES.map((s) => {
                    const checked = form.service_categories.includes(s.key);
                    return (
                      <Label
                        key={s.key}
                        htmlFor={`svc-${s.key}`}
                        className={cn(
                          SELECTABLE_ROW_CLASS,
                          checked ? ROW_SELECTED : ROW_UNSELECTED,
                        )}
                      >
                        <Checkbox
                          id={`svc-${s.key}`}
                          checked={checked}
                          onCheckedChange={() => toggleArrayItem('service_categories', s.key)}
                        />
                        {s.label}
                      </Label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/60">
                <Label className={tokens.body.emphasis}>Business model toggles</Label>
                <div className="space-y-2">
                  {[
                    { key: 'offers_extensions', label: 'We offer hair extensions', staticHelper: 'Unlocks extension-specific policies' },
                    { key: 'offers_retail', label: 'We sell retail products', staticHelper: 'Unlocks retail return / exchange policies' },
                    { key: 'offers_packages', label: 'We sell packages or memberships', staticHelper: 'Unlocks package expiration & membership policies' },
                    { key: 'offers_memberships', label: 'We offer ongoing memberships', staticHelper: 'Adds membership-specific terms' },
                    { key: 'serves_minors', label: 'We serve clients under 18', staticHelper: 'Adds guardian consent and minor-specific rules' },
                  ].map((row) => {
                    const checked = (form as any)[row.key] as boolean;
                    const previousValue = (existingProfile as any)?.[row.key] as boolean | undefined;
                    const hasChanged = previousValue !== undefined && previousValue !== checked;
                    const impact = flagImpacts[row.key];
                    let helper: string = row.staticHelper;
                    let helperEmphasis = false;
                    if (impact?.hasLibrary && impact.total > 0) {
                      if (checked) {
                        helper = `${impact.total} ${impact.total === 1 ? 'policy' : 'policies'} active in your library`;
                      } else {
                        const parts: string[] = [];
                        if (impact.requiredCount > 0) parts.push(`${impact.requiredCount} required`);
                        if (impact.recommendedCount > 0) parts.push(`${impact.recommendedCount} recommended`);
                        const breakdown = parts.length > 0 ? ` (${parts.join(' + ')})` : '';
                        helper = `Hides ${impact.total} ${impact.total === 1 ? 'policy' : 'policies'}${breakdown} from your library`;
                      }
                      helperEmphasis = hasChanged;
                    } else if (impact && !impact.hasLibrary) {
                      helper = `${row.staticHelper} (coming soon)`;
                    }
                    return (
                      <Label
                        key={row.key}
                        htmlFor={row.key}
                        className={cn(
                          SELECTABLE_ROW_CLASS_START,
                          checked ? ROW_SELECTED : ROW_UNSELECTED,
                        )}
                      >
                        <Checkbox
                          id={row.key}
                          checked={checked}
                          onCheckedChange={(v) => setForm((f) => ({ ...f, [row.key]: !!v }))}
                          className="mt-0.5"
                        />
                        <span className="flex-1">
                          <span className="block">{row.label}</span>
                          <span
                            className={cn(
                              'block text-xs mt-0.5 transition-colors',
                              helperEmphasis ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {helper}
                          </span>
                        </span>
                      </Label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {step === 'team' && (
            <div className="space-y-2">
              <Label className={tokens.body.emphasis}>Roles used in your business</Label>
              <p className={cn(tokens.body.muted, 'text-xs')}>
                Drives applicability for handbook sections and policy scoping.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {ROLE_OPTIONS.map((r) => {
                  const checked = form.roles_used.includes(r.key);
                  return (
                    <Label
                      key={r.key}
                      htmlFor={`role-${r.key}`}
                      className={cn(
                        SELECTABLE_ROW_CLASS,
                        checked ? ROW_SELECTED : ROW_UNSELECTED,
                      )}
                    >
                      <Checkbox
                        id={`role-${r.key}`}
                        checked={checked}
                        onCheckedChange={() => toggleArrayItem('roles_used', r.key)}
                      />
                      {r.label}
                    </Label>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'existing' && (
            <div className="space-y-3">
              <p className={tokens.body.muted}>
                Helps us prioritize what to draft fresh vs. what to adapt from your existing materials.
              </p>
              {[
                { key: 'has_existing_handbook', label: 'We already have an employee handbook' },
                { key: 'has_existing_client_policies', label: 'We already publish client-facing policies' },
              ].map((row) => {
                const checked = (form as any)[row.key] as boolean;
                return (
                  <Label
                    key={row.key}
                    htmlFor={row.key}
                    className={cn(
                      SELECTABLE_ROW_CLASS,
                      checked ? ROW_SELECTED : ROW_UNSELECTED,
                    )}
                  >
                    <Checkbox
                      id={row.key}
                      checked={checked}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, [row.key]: !!v }))}
                    />
                    {row.label}
                  </Label>
                );
              })}
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div>
                <Label className={cn(tokens.kpi.label)}>Recommended policy set</Label>
                <p className={cn(tokens.stat.xlarge, 'mt-1')}>{recommendedKeys.length}</p>
                <p className={cn(tokens.body.muted, 'mt-1')}>
                  Based on your profile. You can browse the full library and add more anytime.
                </p>
              </div>

              {expansionFlips.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <Label className={cn(tokens.kpi.label)}>What changed</Label>
                  <div className="space-y-2">
                    {expansionFlips.map((f) => (
                      <div
                        key={f.key}
                        className="rounded-lg border border-border/60 bg-muted/30 p-3"
                      >
                        <p className="font-sans text-sm text-foreground">
                          You now offer <span className="font-medium">{f.label}</span>.
                        </p>
                        <p className="font-sans text-xs text-muted-foreground mt-1">
                          We've added{' '}
                          {f.requiredCount > 0 && (
                            <>
                              <span className="text-foreground">{f.requiredCount} required</span>
                              {f.recommendedCount > 0 ? ' and ' : ''}
                            </>
                          )}
                          {f.recommendedCount > 0 && (
                            <>
                              <span className="text-foreground">
                                {f.recommendedCount} recommended
                              </span>
                            </>
                          )}{' '}
                          {f.requiredCount + f.recommendedCount === 1 ? 'policy' : 'policies'} to
                          your starter set. Already-adopted policies stay; only the recommended
                          set grows.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-border/60">
                <Label className={cn(tokens.kpi.label)}>Breakdown by category</Label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {Array.from(recommendedByCategory.entries()).map(([cat, count]) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50 font-sans text-sm"
                    >
                      <span className="text-muted-foreground">{formatCategoryLabel(cat)}</span>
                      <span className="text-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="font-sans text-xs text-muted-foreground pt-2 border-t border-border/60">
                Adopting a policy creates a draft you can configure. Nothing is published or wired
                automatically — you stay in control of what goes live.
              </p>
            </div>
          )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <Button variant="ghost" size={tokens.button.inline} onClick={onClose} disabled={isSaving} className="font-sans">
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button variant="outline" size={tokens.button.inline} onClick={back} disabled={isSaving} className="font-sans">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          )}
          {!isLast ? (
            <Button size={tokens.button.inline} onClick={next} disabled={!canProceed} className="font-sans">
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button size={tokens.button.page} onClick={handleFinish} disabled={isSaving} className="font-sans">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>Save & adopt {recommendedKeys.length}</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
