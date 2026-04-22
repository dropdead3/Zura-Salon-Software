/**
 * Policy Configurator panel — Wave 28.15 reframe.
 *
 * Square/Apple-inspired single-surface editor. The 4-step wizard, the
 * Interview/Expert toggle, and the "Adopt and configure" preview gate are
 * gone. The operator sees ONE scrolling page:
 *
 *   ┌─ Header ────── Status badge · [Publish policy ▾] ─┐
 *   │ Title · Why this matters · header links            │
 *   │ ─ Audience: [Clients ▾]                            │
 *   │ ─ Policy text (chips inline; click to edit value)  │
 *   │ ─ Where it shows                                   │
 *   │ ─ Footer: Edit all rules · History · Acks · Archv  │
 *
 * Doctrine preserved:
 *   • AI cannot invent rules — chips edit structured values, prose just renders them.
 *   • Adoption is lazy: no `policies` row is written until the operator
 *     commits an edit (chip change, text edit, surface mapping, publish, etc).
 *   • Audience drives variant filtering (internal-only hides surfaces step
 *     entirely; PublishPolicyAction greys out external publish).
 *   • Approval/publish/ack remain three database mutations — only the operator
 *     surface is consolidated into one button.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ExternalLink,
  Archive,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { LuxeLoader } from '@/components/ui/loaders/LuxeLoader';
import { PolicyVersionHistoryPanel } from './PolicyVersionHistoryPanel';
import { PolicyAcknowledgmentsPanel } from './PolicyAcknowledgmentsPanel';
import { InlineRuleEditor, variantsForAudience } from './InlineRuleEditor';
import { EditAllRulesSheet } from './EditAllRulesSheet';
import { PublishPolicyAction } from './PublishPolicyAction';
import { PolicySurfaceEditor } from './PolicySurfaceEditor';
import { PolicyConfiguratorMoreOptions } from './PolicyConfiguratorMoreOptions';
import { useUpdatePolicyAcknowledgmentFlag } from '@/hooks/policy/useUpdatePolicyAcknowledgmentFlag';
import { useArchivePolicy } from '@/hooks/policy/useArchivePolicy';
import { usePolicyAcknowledgmentCount } from '@/hooks/policy/usePolicyAcknowledgmentCount';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import {
  getConfiguratorSchema,
  type RuleField,
} from '@/lib/policy/configurator-schemas';
import {
  useAdoptAndInitPolicy,
  usePolicyConfiguratorData,
  useSavePolicyRuleBlocks,
} from '@/hooks/policy/usePolicyConfigurator';
import {
  usePolicySurfaceMappings,
  type SurfaceMappingRow,
  defaultVariantForSurface,
} from '@/hooks/policy/usePolicyApplicability';
import {
  usePolicyVariants,
  VARIANT_LABELS,
  type PolicyVariantType,
} from '@/hooks/policy/usePolicyDrafter';
import {
  POLICY_DISPLAY_STATUS_META,
  getDisplayStatus,
  type PolicyLibraryEntry,
} from '@/hooks/policy/usePolicyData';
import {
  usePolicyOrgProfile,
  applicabilityReason,
} from '@/hooks/policy/usePolicyOrgProfile';
import { interpolateBrandTokens, humanize } from '@/lib/policy/render-starter-draft';
import { getPolicySummaryDefaults } from '@/lib/policy/starter-drafts';
import { useLocations } from '@/hooks/useLocations';
import { PLATFORM_NAME } from '@/lib/brand';

interface PolicyConfiguratorPanelProps {
  entry: PolicyLibraryEntry & { configurator_schema_key?: string | null };
  alreadyAdopted: boolean;
  onClose: () => void;
  onEditProfile?: () => void;
}

function defaultsFromSchema(fields: RuleField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  fields.forEach((f) => {
    if (f.defaultValue !== undefined) out[f.key] = f.defaultValue;
  });
  return out;
}

/** Apply brand-token + rule-value substitution to schema defaults at hydration. */
function interpolateDefaults(
  defaults: Record<string, unknown>,
  ctx: { orgName?: string; platformName?: string; ruleValues?: Record<string, unknown> },
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(defaults)) {
    if (typeof value !== 'string') {
      out[key] = value;
      continue;
    }
    const branded = interpolateBrandTokens(value, ctx);
    out[key] = ctx.ruleValues
      ? substituteRuleTokens(branded, ctx.ruleValues)
      : branded;
  }
  return out;
}

function substituteRuleTokens(
  text: string,
  ruleValues: Record<string, unknown>,
): string {
  if (!text) return text;
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    if (key === 'ORG_NAME' || key === 'PLATFORM_NAME') return match;
    if (key in ruleValues) {
      const v = ruleValues[key];
      if (v === null || v === undefined || v === '') return match;
      return humanize(v);
    }
    return match;
  });
}

export function PolicyConfiguratorPanel({
  entry,
  alreadyAdopted,
  onClose,
  onEditProfile,
}: PolicyConfiguratorPanelProps) {
  const schema = getConfiguratorSchema(entry.configurator_schema_key);
  const adopt = useAdoptAndInitPolicy();
  const { data, isLoading, refetch } = usePolicyConfiguratorData(entry.key);
  const save = useSavePolicyRuleBlocks();
  const { effectiveOrganization } = useOrganizationContext();

  const { data: orgProfile } = usePolicyOrgProfile();
  const nonApplicable = applicabilityReason(entry, orgProfile);

  const [values, setValues] = useState<Record<string, unknown>>({});
  const userEditedFieldsRef = useRef<Set<string>>(new Set());
  const longtextDefaultsRef = useRef<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [acksOpen, setAcksOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [allRulesOpen, setAllRulesOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const updateAckFlag = useUpdatePolicyAcknowledgmentFlag();
  const archive = useArchivePolicy();

  const allFields = useMemo(() => schema.sections.flatMap((s) => s.fields), [schema]);
  const orgNameForTokens = effectiveOrganization?.name ?? undefined;
  const { data: locations = [] } = useLocations();
  const locationCount = locations.length;
  const schemaHasAuthorityRole = useMemo(
    () => allFields.some((f) => f.key === 'authority_role'),
    [allFields],
  );

  // ─── Lazy adoption ───────────────────────────────────────────────────────
  // Wave 28.15 doctrine: opening the panel is exploration, not commitment.
  // The first edit (chip change, text edit, surface mapping, publish) calls
  // adopt_and_init_policy if no row exists. Closing without edits writes nothing.
  const adoptingRef = useRef(false);
  const ensureAdopted = async (): Promise<boolean> => {
    if (data?.policyId) return true;
    if (adoptingRef.current) return false;
    adoptingRef.current = true;
    try {
      await adopt.mutateAsync(entry.key);
      await refetch();
      return true;
    } finally {
      adoptingRef.current = false;
    }
  };

  // Hydrate values once data arrives. Brand tokens in schema defaults are
  // resolved at this moment so the editor and the saved record both read
  // concretely. Operator-saved values (fromBlocks) are sacred.
  useEffect(() => {
    if (hydrated) return;
    // We hydrate even without a `data` row (lazy adoption case) so the editor
    // mounts immediately on first open. Schema defaults + brand tokens give
    // the operator a fully-rendered draft to react to.
    const fromBlocks: Record<string, unknown> = {};
    if (data) {
      data.blocks.forEach((b) => {
        const v = b.value as { v?: unknown } | unknown;
        fromBlocks[b.block_key] = v && typeof v === 'object' && 'v' in (v as object)
          ? (v as { v: unknown }).v
          : v;
      });
    }
    const schemaDefaults = defaultsFromSchema(allFields);
    const policySpecific = getPolicySummaryDefaults(entry.key, {
      category: entry.category,
      audience: entry.audience,
      locationCount,
      schemaHasAuthorityRole,
    });
    const mergedDefaults = { ...schemaDefaults, ...policySpecific };
    const longtextSnapshot: Record<string, string> = {};
    allFields.forEach((f) => {
      if (f.type === 'longtext') {
        const v = mergedDefaults[f.key];
        if (typeof v === 'string') longtextSnapshot[f.key] = v;
      }
    });
    longtextDefaultsRef.current = longtextSnapshot;
    const ruleValuesForTokens = { ...schemaDefaults, ...fromBlocks };
    const interpolated = interpolateDefaults(mergedDefaults, {
      orgName: orgNameForTokens,
      platformName: PLATFORM_NAME,
      ruleValues: ruleValuesForTokens,
    });
    const seeded = { ...interpolated, ...fromBlocks };
    setValues(seeded);
    Object.keys(fromBlocks).forEach((k) => {
      const field = allFields.find((f) => f.key === k);
      if (field?.type === 'longtext') userEditedFieldsRef.current.add(k);
    });
    // Only mark hydrated once we've either loaded data or confirmed there is
    // no row to load (i.e., the data fetch completed and returned null).
    if (!isLoading) setHydrated(true);
  }, [
    data,
    hydrated,
    isLoading,
    allFields,
    orgNameForTokens,
    entry.key,
    entry.category,
    entry.audience,
    locationCount,
    schemaHasAuthorityRole,
  ]);

  // Reactive re-substitution of longtext fields when role-type values change,
  // skipping any field the operator has manually edited.
  useEffect(() => {
    if (!hydrated) return;
    const longtextDefaults = longtextDefaultsRef.current;
    const editedFields = userEditedFieldsRef.current;
    setValues((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [fieldKey, template] of Object.entries(longtextDefaults)) {
        if (editedFields.has(fieldKey)) continue;
        const branded = interpolateBrandTokens(template, {
          orgName: orgNameForTokens,
          platformName: PLATFORM_NAME,
        });
        const resolved = substituteRuleTokens(branded, prev);
        if (resolved !== prev[fieldKey]) {
          next[fieldKey] = resolved;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hydrated,
    orgNameForTokens,
    ...allFields.filter((f) => f.type === 'role').map((f) => values[f.key]),
  ]);

  // Heal-on-open: an adopted policy without a draft version (legacy state)
  // gets a v1 draft materialized once.
  const healAttempted = useRef(false);
  useEffect(() => {
    if (
      alreadyAdopted &&
      !isLoading &&
      data &&
      data.policyId &&
      !data.versionId &&
      !healAttempted.current &&
      !adopt.isPending
    ) {
      healAttempted.current = true;
      adopt.mutate(entry.key, {
        onSuccess: () => refetch(),
      });
    }
  }, [alreadyAdopted, isLoading, data, adopt, entry.key, refetch]);

  const versionId = data?.versionId;
  const versionNumber = data?.versionNumber ?? 1;

  // ─── Persist a single rule chip edit ─────────────────────────────────────
  // Strategy: optimistic local update + debounced save_policy_rule_blocks.
  // Adoption happens lazily on the first chip change.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistAllRules = (next: Record<string, unknown>, vId: string) => {
    const blocks = allFields
      .map((f) => ({
        block_key: f.key,
        rule_type: f.type,
        value: { v: next[f.key] ?? null },
        required: !!f.required,
      }))
      .filter((b) => b.value.v !== null && b.value.v !== '');
    save.mutate({ versionId: vId, blocks });
  };

  const handleRuleChange = async (key: string, next: unknown) => {
    setValues((prev) => {
      const merged = { ...prev, [key]: next };
      // schedule save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const ok = await ensureAdopted();
        if (!ok) return;
        // re-read versionId via refetched data after adoption
        const liveVersionId = (await refetch()).data?.versionId;
        if (liveVersionId) persistAllRules(merged, liveVersionId);
      }, 400);
      return merged;
    });
  };

  // Audience selector — local state mirrors entry.audience (the library
  // entry is the source of truth for now). Wave 28.15 surfaces it as a
  // visible choice; a follow-up wave can persist per-policy overrides.
  // For this wave, audience is read-only display because flipping it
  // requires schema migration on per-policy audience overrides.
  const audience = entry.audience;
  const isInternalOnly = audience === 'internal';
  const isExternal = audience !== 'internal';

  // Surface mapping state
  const { data: surfaceRows = [] } = usePolicySurfaceMappings(versionId);
  const [surfaces, setSurfaces] = useState<SurfaceMappingRow[] | null>(null);
  useEffect(() => {
    if (!versionId) return;
    if (surfaces !== null) return;
    if (surfaceRows.length > 0) {
      setSurfaces(surfaceRows);
      return;
    }
    const seeded: SurfaceMappingRow[] = (entry.candidate_surfaces ?? []).map((s) => ({
      surface: s,
      variant_type: defaultVariantForSurface(s, entry.audience),
      enabled: true,
      surface_config: {},
    }));
    setSurfaces(seeded);
  }, [surfaceRows, surfaces, versionId, entry.candidate_surfaces, entry.audience]);

  // Variant + display state
  const { data: variantsData = [] } = usePolicyVariants(versionId);
  const hasApprovedClientVariant = variantsData.some(
    (v) => v.approved && v.variant_type === 'client',
  );
  const orgSlug = effectiveOrganization?.slug;
  const publicPolicyUrl = orgSlug ? `/org/${orgSlug}/policies` : null;
  const { data: ackCount = 0 } = usePolicyAcknowledgmentCount(data?.policyId ?? null);
  const showAcknowledgmentsLink = (!isInternalOnly || ackCount > 0) && !!data?.policyId;
  const isArchived = data?.status === 'archived';
  const categoryMeta = POLICY_CATEGORY_META[entry.category];

  const displayStatus = getDisplayStatus(data ?? null);
  const displayMeta = POLICY_DISPLAY_STATUS_META[displayStatus];

  // Loading guard — only show the loader while the initial fetch is in
  // flight on an already-adopted policy. Lazy-adopted policies render
  // immediately from schema defaults.
  const showInitialLoader = alreadyAdopted && !hydrated;

  const handleSaveAllRules = async (next: Record<string, unknown>) => {
    setValues(next);
    const ok = await ensureAdopted();
    if (!ok) return;
    const liveVersionId = (await refetch()).data?.versionId;
    if (!liveVersionId) return;
    persistAllRules(next, liveVersionId);
    setAllRulesOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="space-y-4 pb-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[260px] space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-sans text-xs">
                {categoryMeta.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'font-sans text-xs',
                  displayMeta.tone === 'success' && 'border-primary/40 text-primary',
                  displayMeta.tone === 'warning' && 'border-warning/40 text-warning',
                )}
              >
                {displayMeta.label}
              </Badge>
              {data?.policyId && (
                <Badge variant="outline" className="font-sans text-xs text-muted-foreground">
                  v{versionNumber}
                </Badge>
              )}
              {isArchived && (
                <Badge variant="outline" className="font-sans text-xs text-muted-foreground">
                  Archived
                </Badge>
              )}
            </div>
            <h3 className={cn(tokens.heading.section)}>{entry.title}</h3>
            <p className="font-sans text-sm text-muted-foreground">
              {entry.short_description}
            </p>
          </div>
          {/* ─── Single CTA ─── */}
          {!showInitialLoader && (
            <PublishPolicyAction
              policyId={data?.policyId ?? ''}
              versionId={versionId ?? ''}
              libraryKey={entry.key}
              audience={audience}
              ruleValues={values}
              isPublishedExternal={!!data?.isPublishedExternal}
              requiresAcknowledgment={!!data?.requiresAcknowledgment}
              onAfter={async () => {
                await ensureAdopted();
                refetch();
              }}
              disabled={isArchived}
            />
          )}
        </div>

        {entry.why_it_matters && (
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="font-sans text-xs text-muted-foreground">
                <span className="text-foreground font-medium">Why this matters:</span>{' '}
                {entry.why_it_matters}
              </p>
            </div>
          </div>
        )}

        {nonApplicable && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="font-sans text-xs text-muted-foreground">
              This policy applies to businesses that offer{' '}
              <span className="text-foreground">{nonApplicable.label}</span>. Your
              business profile says you don't currently offer this — you can
              still configure and adopt it
              {onEditProfile ? (
                <>
                  , or{' '}
                  <button
                    type="button"
                    onClick={onEditProfile}
                    className="text-foreground underline-offset-2 hover:underline"
                  >
                    update your profile
                  </button>{' '}
                  if this changed
                </>
              ) : null}
              .
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap text-xs">
          {hasApprovedClientVariant && publicPolicyUrl && (
            <a
              href={publicPolicyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-sans text-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View on public policy page
            </a>
          )}
          {data?.policyId && (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 font-sans text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              Version history
            </button>
          )}
          {showAcknowledgmentsLink && (
            <button
              type="button"
              onClick={() => setAcksOpen(true)}
              className="inline-flex items-center gap-1.5 font-sans text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileSignature className="w-3.5 h-3.5" />
              View client acknowledgments{ackCount > 0 ? ` (${ackCount})` : ''}
            </button>
          )}
        </div>
      </div>

      {showInitialLoader ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <LuxeLoader size="md" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* ─── Audience ─── */}
          <section className="space-y-3">
            <SectionHeader
              icon={<Users className="w-4 h-4" />}
              title="Who sees this"
              note="Audience controls which surfaces this policy can render on. Internal-only policies skip the public policy page."
            />
            <div className="rounded-xl border border-border bg-card/60 p-4 flex items-center gap-4 flex-wrap">
              <Select value={audience} disabled>
                <SelectTrigger className="font-sans w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal" className="font-sans">Internal team</SelectItem>
                  <SelectItem value="external" className="font-sans">Clients</SelectItem>
                  <SelectItem value="both" className="font-sans">Both</SelectItem>
                </SelectContent>
              </Select>
              <p className="font-sans text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Audience is set by the policy library and locked for this wave.
              </p>
            </div>
          </section>

          {/* ─── Policy text (inline chips) ─── */}
          <section className="space-y-3">
            <SectionHeader
              icon={<MessageSquare className="w-4 h-4" />}
              title="Policy text"
              note="Click any pill to change the underlying rule. Click 'Edit text' to rewrite the prose directly. AI cannot invent rules — pills are the source of truth."
            />
            <InlineRuleEditor
              versionId={versionId ?? ''}
              libraryKey={entry.key}
              audience={audience}
              fields={allFields}
              values={values}
              onRuleChange={handleRuleChange}
              disabled={isArchived}
            />
            <div className="flex items-center justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAllRulesOpen(true)}
                className="font-sans text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                Edit all rules
              </Button>
            </div>
          </section>

          {/* ─── Where it shows (external-touching only) ─── */}
          {isExternal && versionId && surfaces !== null && (
            <section className="space-y-3">
              <SectionHeader
                icon={<MapPin className="w-4 h-4" />}
                title="Where it shows"
                note="Surfaces this policy renders on. Toggle each on or off and pick the voice variant per surface."
              />
              <PolicySurfaceEditor
                versionId={versionId}
                candidateSurfaces={entry.candidate_surfaces ?? []}
                policyAudience={entry.audience}
                rows={surfaces}
                onChange={setSurfaces}
              />
            </section>
          )}
        </div>
      )}

      {/* ─── Drawers ─── */}
      <PremiumFloatingPanel open={historyOpen} onOpenChange={setHistoryOpen} maxWidth="640px">
        <div className={tokens.drawer.header}>
          <h2 className={cn(tokens.heading.section)}>Version history</h2>
          <p className="font-sans text-sm text-muted-foreground mt-1">
            Every saved version of {entry.title}, newest first.
          </p>
        </div>
        <div className={tokens.drawer.body}>
          <PolicyVersionHistoryPanel policyId={data?.policyId ?? null} />
        </div>
      </PremiumFloatingPanel>

      {data?.policyId && (
        <PremiumFloatingPanel open={acksOpen} onOpenChange={setAcksOpen} maxWidth="720px">
          <div className={tokens.drawer.header}>
            <h2 className={cn(tokens.heading.section)}>Client acknowledgments</h2>
            <p className="font-sans text-sm text-muted-foreground mt-1">
              Read-only audit log of every signature collected for {entry.title}.
            </p>
          </div>
          <div className={tokens.drawer.body}>
            <PolicyAcknowledgmentsPanel
              policyId={data.policyId}
              policyTitle={entry.title}
            />
          </div>
        </PremiumFloatingPanel>
      )}

      <EditAllRulesSheet
        open={allRulesOpen}
        onOpenChange={setAllRulesOpen}
        schema={schema}
        values={values}
        audience={audience}
        saving={save.isPending || adopt.isPending}
        onSave={handleSaveAllRules}
        onFieldEdit={(field) => {
          if (field.type === 'longtext') {
            userEditedFieldsRef.current.add(field.key);
          }
        }}
      />

      {/* ─── Footer (lifecycle actions) ─── */}
      <Separator />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {data?.policyId && !isArchived && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchiveDialogOpen(true)}
              disabled={archive.isPending}
              className="font-sans text-muted-foreground hover:text-destructive"
            >
              <Archive className="w-4 h-4 mr-2" />
              Archive policy
            </Button>
          )}
          {data?.policyId && isArchived && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                archive.mutate(
                  {
                    policyId: data.policyId,
                    currentVersionId: data.versionId || null,
                    nextStatus: 'drafting',
                  },
                  { onSuccess: () => refetch() },
                )
              }
              disabled={archive.isPending}
              className="font-sans"
            >
              {archive.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Reactivate
            </Button>
          )}
          {isArchived && (
            <Badge
              variant="outline"
              className="font-sans text-xs text-muted-foreground border-border/60"
            >
              Archived — not rendering on any surface
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onClose} className="font-sans">
          Close
        </Button>
      </div>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-wide">
              Archive this policy?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans space-y-2">
              <span className="block">
                {entry.title} will stop rendering on all client-facing surfaces
                immediately. Internal handbook references will also pause.
              </span>
              <span className="block text-xs text-muted-foreground">
                History — versions, approved variants, and acknowledgments — is
                preserved. You can reactivate any time from this panel.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-sans">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-sans bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!data?.policyId) return;
                archive.mutate(
                  {
                    policyId: data.policyId,
                    currentVersionId: data.versionId || null,
                    nextStatus: 'archived',
                  },
                  {
                    onSuccess: () => {
                      setArchiveDialogOpen(false);
                      refetch();
                    },
                  },
                );
              }}
            >
              {archive.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Archive className="w-4 h-4 mr-2" />
              )}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Section header for the three editor blocks. */
function SectionHeader({
  icon,
  title,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground/70 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5 pt-0.5">
        <h4 className="font-display text-xs tracking-wider uppercase text-foreground">
          {title}
        </h4>
        <p className="font-sans text-xs text-muted-foreground leading-relaxed">{note}</p>
      </div>
    </div>
  );
}
