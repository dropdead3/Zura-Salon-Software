/**
 * Policy Setup Wizard (Wave 28.12 — Derived-by-default)
 *
 * 3 steps. Confirmation + judgment, not data entry.
 *  1. Confirm — pre-filled from org data; operator corrects only if needed.
 *  2. Business model — judgment toggles {{PLATFORM_NAME}} cannot infer.
 *  3. Materials & review — existing materials + recommended set.
 *
 * Doctrine: mem://features/policy-os-applicability-doctrine.md
 *           ("Wizard inputs must be derived-by-default.")
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, ArrowLeft, ArrowRight, Check, Pencil, AlertCircle, MapPin } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  usePolicyOrgProfile,
  useUpsertPolicyOrgProfile,
  useAdoptPoliciesFromLibrary,
  recommendedKeysForProfile,
  type PolicyOrgProfileInput,
} from '@/hooks/policy/usePolicyOrgProfile';
import { usePolicyLibrary } from '@/hooks/policy/usePolicyData';
import {
  usePolicyProfileDefaults,
  TEAM_BAND_LABELS,
  BUSINESS_TYPE_LABELS,
  ROLE_LABELS,
  type TeamSizeBand,
} from '@/hooks/policy/usePolicyProfileDefaults';

const SELECTABLE_ROW_CLASS =
  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors font-sans text-sm';
const SELECTABLE_ROW_CLASS_START =
  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors font-sans text-sm';
const ROW_SELECTED = 'border-primary bg-primary/5';
const ROW_UNSELECTED = 'border-border hover:bg-muted';

const formatCategoryLabel = (cat: string) =>
  cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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

const TEAM_SIZE_BANDS: Array<{ key: TeamSizeBand; label: string }> = [
  { key: 'solo', label: TEAM_BAND_LABELS.solo },
  { key: 'small', label: TEAM_BAND_LABELS.small },
  { key: 'medium', label: TEAM_BAND_LABELS.medium },
  { key: 'large', label: TEAM_BAND_LABELS.large },
  { key: 'enterprise', label: TEAM_BAND_LABELS.enterprise },
];

type WizardStep = 'confirm' | 'model' | 'materials';
const STEP_ORDER: WizardStep[] = ['confirm', 'model', 'materials'];

const STEP_META: Record<WizardStep, { label: string; description: string }> = {
  confirm: {
    label: 'Confirm',
    description: 'What we know about your business — confirm or correct.',
  },
  model: {
    label: 'Business model',
    description: 'Tell us how you operate — drives which policies apply.',
  },
  materials: {
    label: 'Materials & review',
    description: 'What you already have, and what we’ll adopt.',
  },
};

export function PolicySetupWizard({ onClose, onCompleted }: Props) {
  const { data: existingProfile } = usePolicyOrgProfile();
  const { data: library = [] } = usePolicyLibrary();
  const defaults = usePolicyProfileDefaults();
  const upsert = useUpsertPolicyOrgProfile();
  const adopt = useAdoptPoliciesFromLibrary();

  const [step, setStep] = useState<WizardStep>('confirm');

  // Inline-edit toggles for Step 1 (default to read-only)
  const [editBusinessType, setEditBusinessType] = useState(false);
  const [editTeamSize, setEditTeamSize] = useState(false);

  /**
   * Form state — seeds from existing profile first, then derived defaults
   * (existing always wins; operator's prior overrides are preserved).
   * Roles + service categories + operating states are derived-only (read-only chips).
   */
  const [form, setForm] = useState<PolicyOrgProfileInput>(() => ({
    business_type: existingProfile?.business_type ?? null,
    primary_state: existingProfile?.primary_state ?? null,
    operating_states: existingProfile?.operating_states ?? [],
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

  // Hydrate derived-by-default values once they load (existing profile values win)
  useEffect(() => {
    if (defaults.isLoading) return;
    setForm((f) => ({
      ...f,
      business_type: existingProfile?.business_type ?? f.business_type ?? defaults.business_type,
      // States: always reflect derived (operator can't edit — they edit locations instead)
      operating_states:
        defaults.derived_states.length > 0 ? defaults.derived_states : (existingProfile?.operating_states ?? []),
      primary_state:
        defaults.derived_states[0] ?? existingProfile?.primary_state ?? f.primary_state ?? defaults.primary_state,
      team_size_band: existingProfile?.team_size_band ?? f.team_size_band ?? defaults.team_size_band,
      // Read-only mirrors of catalog/team — always reflect current state for accurate recommendations
      service_categories:
        defaults.service_categories.length > 0 ? defaults.service_categories : f.service_categories,
      roles_used: defaults.roles_used.length > 0 ? defaults.roles_used : f.roles_used,
      // Heuristic toggle defaults — only seed when no existing profile and operator hasn't touched them
      offers_retail: existingProfile?.offers_retail ?? defaults.detected_offers_retail,
      offers_extensions: existingProfile?.offers_extensions ?? defaults.detected_offers_extensions,
      offers_packages: existingProfile?.offers_packages ?? defaults.detected_offers_packages,
      offers_memberships: existingProfile?.offers_memberships ?? defaults.detected_offers_memberships,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults.isLoading]);

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
   * Wave 28.11.6 — expansion prompt (preserved).
   * Detect offers_* flags that flipped false → true since the existing profile.
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
   * Wave 28.11.7 — live "what changes" helper for the model step (preserved).
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

  // Step 1 readiness summary — counts auto-detected facts vs. structural gaps
  const step1Facts = useMemo(() => {
    const facts = [
      { key: 'business_type', ready: !!form.business_type, gated: false },
      { key: 'states', ready: defaults.derived_states.length > 0, gated: defaults.needs_location_setup || defaults.needs_state_resolution },
      { key: 'team_size', ready: !!form.team_size_band, gated: defaults.needs_team_setup },
      { key: 'services', ready: defaults.service_categories.length > 0, gated: defaults.needs_services_setup },
      { key: 'roles', ready: defaults.roles_used.length > 0, gated: defaults.needs_team_setup },
    ];
    const ready = facts.filter((f) => f.ready).length;
    const gaps = facts.filter((f) => f.gated).length;
    return { ready, total: facts.length, gaps };
  }, [
    form.business_type,
    form.team_size_band,
    defaults.derived_states.length,
    defaults.needs_location_setup,
    defaults.needs_state_resolution,
    defaults.needs_team_setup,
    defaults.needs_services_setup,
    defaults.service_categories.length,
    defaults.roles_used.length,
  ]);

  const canProceed =
    !!form.business_type &&
    !!form.team_size_band &&
    (step !== 'confirm' || step1Facts.gaps === 0);

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

  const isSaving = upsert.isPending || adopt.isPending;

  // ── helper sub-components (local) ────────────────────────────────────
  const ConfirmRow = ({
    label,
    value,
    detail,
    isEditing,
    onEdit,
    children,
    structuralGate,
  }: {
    label: string;
    value: string | null;
    detail?: string | null;
    isEditing?: boolean;
    onEdit?: () => void;
    children?: React.ReactNode;
    structuralGate?: { message: string; ctaLabel: string; ctaPath: string } | null;
  }) => (
    <div className="space-y-2 py-3 border-b border-border/60 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <Label className={tokens.body.emphasis}>{label}</Label>
        {onEdit && !structuralGate && (
          <button
            type="button"
            onClick={onEdit}
            className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" />
            {isEditing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>
      {structuralGate ? (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 space-y-1">
            <p className={cn(tokens.body.muted, 'text-xs')}>{structuralGate.message}</p>
            <Link
              to={structuralGate.ctaPath}
              className="font-sans text-xs text-primary hover:underline"
            >
              {structuralGate.ctaLabel} →
            </Link>
          </div>
        </div>
      ) : isEditing && children ? (
        children
      ) : value !== null ? (
        <div className="space-y-0.5">
          <p className="font-sans text-sm text-foreground">{value}</p>
          {detail && <p className={cn(tokens.body.muted, 'text-xs')}>{detail}</p>}
        </div>
      ) : (
        // value === null + no structural gate + not editing → render children inline (chips)
        children ?? null
      )}
    </div>
  );

  const teamBandLabel = form.team_size_band
    ? TEAM_BAND_LABELS[form.team_size_band as TeamSizeBand] ?? form.team_size_band
    : null;
  const businessTypeLabel = form.business_type
    ? BUSINESS_TYPE_LABELS[form.business_type] ?? form.business_type
    : null;

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
        {/* ── STEP 1 — CONFIRM ─────────────────────────────────────── */}
        {step === 'confirm' && (
          <div>
            {defaults.isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className={tokens.loading.spinner} />
              </div>
            ) : (
              <>
                <ConfirmRow
                  label="Business type"
                  value={businessTypeLabel}
                  isEditing={editBusinessType}
                  onEdit={() => setEditBusinessType((v) => !v)}
                >
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
                </ConfirmRow>

                <ConfirmRow
                  label="Operating states"
                  value={null}
                  structuralGate={
                    defaults.needs_location_setup
                      ? {
                          message: 'No locations configured — set up at least one location to capture your operating states.',
                          ctaLabel: 'Set up a location',
                          ctaPath: '/dashboard/admin/settings?category=locations',
                        }
                      : defaults.needs_state_resolution
                        ? {
                            message: 'Locations exist but no state could be detected from their addresses. Add a state or full city/ZIP to each location.',
                            ctaLabel: 'Edit locations',
                            ctaPath: '/dashboard/admin/settings?category=locations',
                          }
                        : null
                  }
                >
                  <div>
                    <div className="flex flex-wrap gap-1.5">
                      {defaults.derived_states.map((code, idx) => (
                        <span
                          key={code}
                          className="inline-flex items-center gap-1.5 font-sans text-xs px-2 py-1 rounded-md bg-muted text-foreground"
                        >
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {defaults.derived_state_names[idx] ?? code}
                        </span>
                      ))}
                    </div>
                    <p className={cn(tokens.body.muted, 'text-xs mt-2')}>
                      {defaults.derived_states.length > 1
                        ? `Operating in ${defaults.derived_states.length} states — applicable policies will respect all jurisdictions. Edit a location to change.`
                        : 'Detected from your locations. Edit a location to change.'}
                    </p>
                  </div>
                </ConfirmRow>

                <ConfirmRow
                  label="Team size"
                  value={teamBandLabel}
                  detail={defaults.team_size_reason}
                  isEditing={editTeamSize}
                  onEdit={() => setEditTeamSize((v) => !v)}
                  structuralGate={
                    defaults.needs_team_setup
                      ? {
                          message: 'No active staff — add team members so we can scope handbook policies correctly.',
                          ctaLabel: 'Add team members',
                          ctaPath: '/dashboard/admin/team',
                        }
                      : null
                  }
                >
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
                </ConfirmRow>

                <ConfirmRow
                  label="Services offered"
                  value={null}
                  structuralGate={
                    defaults.needs_services_setup
                      ? {
                          message: 'No services in your catalog — add services so we can scope service policies correctly.',
                          ctaLabel: 'Manage services',
                          ctaPath: '/dashboard/admin/services',
                        }
                      : null
                  }
                >
                  <div>
                    <TooltipProvider delayDuration={150}>
                      <div className="flex flex-wrap gap-1.5">
                        {defaults.service_categories.map((c) => {
                          const count = defaults.service_category_counts[c] ?? 0;
                          return (
                            <Tooltip key={c}>
                              <TooltipTrigger asChild>
                                <span className="font-sans text-xs px-2 py-1 rounded-md bg-muted text-foreground cursor-help">
                                  {defaults.service_category_labels[c] ?? formatCategoryLabel(c)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="font-sans text-xs">
                                {count} {count === 1 ? 'service' : 'services'} in this category
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </TooltipProvider>
                    <p className={cn(tokens.body.muted, 'text-xs mt-2')}>
                      From your service catalog. Edit services in the catalog itself.
                    </p>
                  </div>
                </ConfirmRow>

                <ConfirmRow
                  label="Roles in use"
                  value={null}
                  structuralGate={
                    defaults.needs_team_setup
                      ? {
                          message: 'Roles will appear once team members are added.',
                          ctaLabel: 'Add team members',
                          ctaPath: '/dashboard/admin/team',
                        }
                      : null
                  }
                >
                  {defaults.roles_used.length > 0 ? (
                    <div>
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="font-sans text-sm text-foreground">
                          {defaults.team_size_count} {defaults.team_size_count === 1 ? 'team member' : 'team members'}
                        </span>
                        <span className={cn(tokens.body.muted, 'text-xs')}>
                          {defaults.roles_used.length} {defaults.roles_used.length === 1 ? 'role' : 'roles'}
                        </span>
                      </div>
                      <TooltipProvider delayDuration={150}>
                        <div className="flex flex-wrap gap-1.5">
                          {defaults.roles_used
                            .slice()
                            .sort((a, b) => (defaults.role_counts[b] ?? 0) - (defaults.role_counts[a] ?? 0))
                            .map((r) => {
                              const count = defaults.role_counts[r] ?? 0;
                              return (
                                <Tooltip key={r}>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1.5 font-sans text-xs px-2 py-1 rounded-md bg-muted text-foreground cursor-help">
                                      <span>{ROLE_LABELS[r] ?? formatCategoryLabel(r)}</span>
                                      <span className="font-sans text-xs px-1.5 py-0.5 rounded bg-background/60 text-muted-foreground">
                                        {count}
                                      </span>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="font-sans text-xs">
                                    {count} active staff with this role
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                        </div>
                      </TooltipProvider>
                      <p className={cn(tokens.body.muted, 'text-xs mt-2')}>
                        From your team. Edit roles in Access &amp; Permissions.
                      </p>
                    </div>
                  ) : null}
                </ConfirmRow>
              </>
            )}
          </div>
        )}

        {/* ── STEP 2 — BUSINESS MODEL ──────────────────────────────── */}
        {step === 'model' && (
          <div className="space-y-2">
            {[
              {
                key: 'offers_extensions',
                label: 'We offer hair extensions',
                staticHelper: 'Unlocks extension-specific policies',
                detected: defaults.detected_offers_extensions,
                detectedReason: defaults.extensions_reason,
              },
              {
                key: 'offers_retail',
                label: 'We sell retail products',
                staticHelper: 'Unlocks retail return / exchange policies',
                detected: defaults.detected_offers_retail,
                detectedReason: defaults.retail_reason,
              },
              {
                key: 'offers_packages',
                label: 'We sell packages or memberships',
                staticHelper: 'Unlocks package expiration & membership policies',
                detected: defaults.detected_offers_packages,
                detectedReason: defaults.packages_reason,
              },
              {
                key: 'offers_memberships',
                label: 'We offer ongoing memberships',
                staticHelper: 'Adds membership-specific terms',
                detected: defaults.detected_offers_memberships,
                detectedReason: defaults.memberships_reason,
              },
              {
                key: 'serves_minors',
                label: 'We serve clients under 18',
                staticHelper: 'Adds guardian consent and minor-specific rules',
                detected: false,
                detectedReason: null,
              },
            ].map((row) => {
              const checked = (form as any)[row.key] as boolean;
              const previousValue = (existingProfile as any)?.[row.key] as boolean | undefined;
              const hasChanged = previousValue !== undefined && previousValue !== checked;
              const impact = flagImpacts[row.key];
              let helper: string = row.staticHelper;
              let helperEmphasis = false;
              if (impact?.hasLibrary && impact.total > 0) {
                const noun = impact.total === 1 ? 'policy' : 'policies';
                if (checked) {
                  helper = `${impact.total} ${noun} active in your library`;
                } else {
                  const parts: string[] = [];
                  if (impact.requiredCount > 0) parts.push(`${impact.requiredCount} required`);
                  if (impact.recommendedCount > 0) parts.push(`${impact.recommendedCount} recommended`);
                  const breakdown = parts.length > 0 ? ` (${parts.join(' + ')})` : '';
                  helper = `Adds ${impact.total} ${noun}${breakdown} to your library`;
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
                    <span className="flex items-center gap-2 flex-wrap">
                      <span>{row.label}</span>
                      {row.detected && row.detectedReason && (
                        <span className="font-sans text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          auto-detected · {row.detectedReason}
                        </span>
                      )}
                    </span>
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
        )}

        {/* ── STEP 3 — MATERIALS & REVIEW ──────────────────────────── */}
        {step === 'materials' && (
          <div className="space-y-5">
            <div className="space-y-3">
              <div>
                <Label className={tokens.body.emphasis}>Existing materials</Label>
                <p className={cn(tokens.body.muted, 'text-xs mt-1')}>
                  Helps us prioritize what to draft fresh vs. what to adapt from your existing materials.
                </p>
              </div>
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

            <div className="pt-4 border-t border-border/60 space-y-4">
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

              {recommendedByCategory.size > 0 && (
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
              )}

              <p className="font-sans text-xs text-muted-foreground pt-2 border-t border-border/60">
                Adopting a policy creates a draft you can configure. Nothing is published or wired
                automatically — you stay in control of what goes live.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Step 1 confirmation summary */}
      {step === 'confirm' && !defaults.isLoading && (
        <p className={cn(tokens.body.muted, 'text-xs pt-2')}>
          {step1Facts.gaps === 0
            ? `${step1Facts.ready} of ${step1Facts.total} facts auto-detected. Edit if anything's wrong, or continue.`
            : `${step1Facts.ready} of ${step1Facts.total} facts ready. Resolve ${step1Facts.gaps} setup gap${step1Facts.gaps === 1 ? '' : 's'} above to continue.`}
        </p>
      )}

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
                <>Save &amp; adopt {recommendedKeys.length}</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
