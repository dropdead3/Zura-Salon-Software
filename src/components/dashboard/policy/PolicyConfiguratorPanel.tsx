/**
 * Policy Configurator panel (Wave 28.4 → expanded in 28.5)
 *
 * Three-tab editor:
 *  - Rules: schema-driven decision tree (28.4)
 *  - Applicability: who this policy applies to (28.5)
 *  - Surfaces: where it renders + tone variant (28.5)
 *
 * One panel handles all 47 policies via the configurator_schema_key on each
 * library entry. Adopts the policy if it hasn't been adopted yet, then loads
 * existing rule blocks, applicability, and surface mappings for editing.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Sparkles, Settings, Users, MapPin, FileText, ExternalLink, History, FileSignature, Archive, Check, RotateCcw } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { PolicyVersionHistoryPanel } from './PolicyVersionHistoryPanel';
import { PolicyAcknowledgmentsPanel } from './PolicyAcknowledgmentsPanel';
import { useUpdatePolicyAcknowledgmentFlag } from '@/hooks/policy/useUpdatePolicyAcknowledgmentFlag';
import { usePublishPolicyExternally } from '@/hooks/policy/usePublishPolicyExternally';
import { useArchivePolicy } from '@/hooks/policy/useArchivePolicy';
import { usePolicyAcknowledgmentCount } from '@/hooks/policy/usePolicyAcknowledgmentCount';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { PolicyRuleField } from './PolicyRuleField';
import { PolicyApplicabilityEditor } from './PolicyApplicabilityEditor';
import { PolicySurfaceEditor } from './PolicySurfaceEditor';
import { PolicyDraftWorkspace } from './PolicyDraftWorkspace';
import { PolicyAudienceBanner } from './PolicyAudienceBanner';
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
  usePolicyApplicability,
  usePolicySurfaceMappings,
  type ApplicabilityRow,
  type SurfaceMappingRow,
  SURFACE_META,
  defaultVariantForSurface,
} from '@/hooks/policy/usePolicyApplicability';
import { usePolicyVariants } from '@/hooks/policy/usePolicyDrafter';
import type { PolicyLibraryEntry } from '@/hooks/policy/usePolicyData';
import { POLICY_CATEGORY_META } from '@/hooks/policy/usePolicyData';
import {
  usePolicyOrgProfile,
  applicabilityReason,
} from '@/hooks/policy/usePolicyOrgProfile';

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

  // Wave 28.11.6 — applicability banner. When this policy requires a service
  // the operator's profile says they don't offer (e.g., extensions for a solo
  // stylist), surface a soft "no longer applies" note. Adoption is still
  // permitted — operator chose to deep-link here. See doctrine:
  // mem://features/policy-os-applicability-doctrine
  const { data: orgProfile } = usePolicyOrgProfile();
  const nonApplicable = applicabilityReason(entry, orgProfile);

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<'rules' | 'applicability' | 'surfaces' | 'drafts' | 'acknowledgments'>('rules');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const updateAckFlag = useUpdatePolicyAcknowledgmentFlag();
  const publish = usePublishPolicyExternally();
  const archive = useArchivePolicy();

  // Wave 28.11.5 — autonomy boundary: NEVER silently adopt on configurator
  // open. The library is segmented by audience (28.11.3) which incentivizes
  // exploration; auto-adopt would write a `policies` row for every card the
  // operator inspects. Adoption now requires explicit consent (CTA below).
  // The `adopt` mutation is invoked from `handleAdopt` only.

  const allFields = useMemo(() => schema.sections.flatMap((s) => s.fields), [schema]);

  // Hydrate values once data arrives.
  useEffect(() => {
    if (!data || hydrated) return;
    const fromBlocks: Record<string, unknown> = {};
    data.blocks.forEach((b) => {
      const v = b.value as { v?: unknown } | unknown;
      fromBlocks[b.block_key] = v && typeof v === 'object' && 'v' in (v as object)
        ? (v as { v: unknown }).v
        : v;
    });
    const seeded = { ...defaultsFromSchema(allFields), ...fromBlocks };
    setValues(seeded);
    setHydrated(true);
  }, [data, hydrated, allFields]);

  const versionId = data?.versionId;
  const versionNumber = data?.versionNumber ?? 1;
  const ready = !isLoading && !!versionId && hydrated;

  /* ---- Applicability state (28.5) ---- */
  const { data: applicabilityRows = [] } = usePolicyApplicability(versionId);
  const [applicability, setApplicability] = useState<ApplicabilityRow[] | null>(null);
  useEffect(() => {
    if (versionId && applicability === null) {
      setApplicability(applicabilityRows);
    }
  }, [applicabilityRows, applicability, versionId]);

  /* ---- Surface mapping state (28.5) ---- */
  const { data: surfaceRows = [] } = usePolicySurfaceMappings(versionId);
  const [surfaces, setSurfaces] = useState<SurfaceMappingRow[] | null>(null);
  useEffect(() => {
    if (!versionId) return;
    if (surfaces !== null) return;
    if (surfaceRows.length > 0) {
      setSurfaces(surfaceRows);
      return;
    }
    // Wave 28.11.5 — audience-aware seed: use `defaultVariantForSurface` so
    // 'both'-audience surfaces (intake) seed an internal-only policy with
    // the `internal` variant rather than the meta default `client`, which
    // the audience filter would otherwise strip.
    const seeded: SurfaceMappingRow[] = (entry.candidate_surfaces ?? []).map((s) => ({
      surface: s,
      variant_type: defaultVariantForSurface(s, entry.audience),
      enabled: true,
      surface_config: {},
    }));
    setSurfaces(seeded);
  }, [surfaceRows, surfaces, versionId, entry.candidate_surfaces, entry.audience]);

  const handleSaveRules = () => {
    if (!versionId) return;
    const blocks = allFields
      .map((f) => ({
        block_key: f.key,
        rule_type: f.type,
        value: { v: values[f.key] ?? null },
        required: !!f.required,
      }))
      .filter((b) => b.value.v !== null && b.value.v !== '');
    save.mutate({ versionId, blocks }); // stay open so operator can move to Applicability tab
  };

  const categoryMeta = POLICY_CATEGORY_META[entry.category];

  /* Wave 28.11.5 — historical-aware tab visibility.
     Internal-only policies hide the Surfaces tab (dead UI). Acknowledgments
     tab now follows audit-immutability: visible if the audience touches
     external OR if there's at least one historical ack row (audience may
     have changed `both`→`internal` after acks were collected). */
  const isInternalOnly = entry.audience === 'internal';
  const showSurfacesTab = !isInternalOnly;

  // Clamp tab if operator is on a tab the audience doesn't allow
  // (e.g., shared deep link previously landed on `surfaces`).
  useEffect(() => {
    if (isInternalOnly && (tab === 'surfaces' || tab === 'acknowledgments')) {
      setTab('rules');
    }
  }, [isInternalOnly, tab]);

  /* Counters for tab badges */
  const applicabilityCount = applicability?.length ?? 0;
  const surfacesActiveCount = (surfaces ?? []).filter((s) => s.enabled).length;
  const { data: variantsData = [] } = usePolicyVariants(versionId);
  const approvedVariantCount = variantsData.filter((v) => v.approved).length;
  const hasApprovedClientVariant = variantsData.some(
    (v) => v.approved && v.variant_type === 'client',
  );
  const { effectiveOrganization } = useOrganizationContext();
  const orgSlug = effectiveOrganization?.slug;
  const publicPolicyUrl = orgSlug ? `/org/${orgSlug}/policies` : null;

  /* Wave 28.11.5 — historical ack visibility (audit immutability).
     Show acks tab whenever count > 0 even if audience changed to internal-only. */
  const { data: ackCount = 0 } = usePolicyAcknowledgmentCount(data?.policyId ?? null);
  const showAcknowledgmentsTab = !isInternalOnly || ackCount > 0;
  const isArchived = data?.status === 'archived';
  const ackToggleAllowed =
    !!data?.isPublishedExternal && hasApprovedClientVariant && !isArchived;

  /* Required-rule readiness for drafter */
  const rulesReady = useMemo(() => {
    return allFields
      .filter((f) => f.required)
      .every((f) => {
        const v = values[f.key];
        return v !== null && v !== undefined && v !== '';
      });
  }, [allFields, values]);

  return (
    <div className="space-y-6">
      {/* Header context */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-sans text-xs">
            {categoryMeta.label}
          </Badge>
          {ready && (
            <Badge variant="outline" className="font-sans text-xs">
              v{versionNumber} · draft
            </Badge>
          )}
        </div>
        <div>
          <h3 className={cn(tokens.heading.section, 'mb-1')}>{entry.title}</h3>
          <p className="font-sans text-sm text-muted-foreground">
            {entry.short_description}
          </p>
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
        <div className="flex items-center gap-4 flex-wrap">
          {hasApprovedClientVariant && publicPolicyUrl && (
            <a
              href={publicPolicyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-sans text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View on public policy page
            </a>
          )}
          {data?.policyId && (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              Version history
            </button>
          )}
        </div>

        {/* Wave 28.11.3 — Audience-aware banner replaces the stacked
            Publish + Require-ack toggles. Renders only the actions that
            apply to this policy's audience, killing dead UI for handbook
            policies and grouping client-facing actions under one context. */}
        {data?.policyId && (
          <PolicyAudienceBanner
            audience={entry.audience}
            publicPolicyUrl={publicPolicyUrl}
            isPublishedExternal={!!data.isPublishedExternal}
            publishDisabled={publish.isPending || !hasApprovedClientVariant}
            onPublishChange={(checked) =>
              publish.mutate(
                { policyId: data.policyId, publish: checked },
                { onSuccess: () => refetch() },
              )
            }
            requiresClientAck={!!data.requiresAcknowledgment}
            ackDisabled={updateAckFlag.isPending || (!data.requiresAcknowledgment && !ackToggleAllowed)}
            onClientAckChange={(checked) =>
              updateAckFlag.mutate(
                { policyId: data.policyId, requiresAcknowledgment: checked },
                { onSuccess: () => refetch() },
              )
            }
            hasApprovedClientVariant={hasApprovedClientVariant}
          />
        )}
      </div>

      {/* Version History side-sheet */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className={cn(tokens.heading.section)}>Version history</SheetTitle>
            <SheetDescription className="font-sans">
              Every saved version of {entry.title}, newest first. Expand any version to see
              what changed.
            </SheetDescription>
          </SheetHeader>
          <PolicyVersionHistoryPanel policyId={data?.policyId ?? null} />
        </SheetContent>
      </Sheet>

      <Separator />

      {/* Wave 28.11.5 — Adopt-and-configure gate. Operators browsing the
          audience-segmented library should not silently write `policies` rows
          on every card click. Until they explicitly click "Adopt and
          configure", we render a read-only schema preview instead of mounting
          the editor surface. */}
      {!alreadyAdopted && !data?.policyId ? (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
            <div className="space-y-1">
              <h4 className="font-display text-xs tracking-wider uppercase text-muted-foreground">
                Preview — not yet adopted
              </h4>
              <p className="font-sans text-sm text-foreground">
                Review the rules this policy will configure. Adoption creates a
                draft version you can edit, publish, and archive — nothing is
                surfaced to staff or clients until you choose to.
              </p>
            </div>
            <div className="space-y-3">
              {schema.sections.map((section) => (
                <div
                  key={section.title}
                  className="rounded-lg border border-border/60 bg-card/60 p-3"
                >
                  <h5 className="font-display text-[11px] tracking-wider uppercase text-foreground">
                    {section.title}
                  </h5>
                  {section.description && (
                    <p className="font-sans text-xs text-muted-foreground mt-1">
                      {section.description}
                    </p>
                  )}
                  <ul className="mt-2 space-y-1">
                    {section.fields.map((f) => (
                      <li
                        key={f.key}
                        className="font-sans text-xs text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-foreground">•</span>
                        <span>
                          <span className="text-foreground">{f.label}</span>
                          {f.required && (
                            <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                              required
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="font-sans"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() =>
                adopt.mutate(entry.key, {
                  onSuccess: () => refetch(),
                })
              }
              disabled={adopt.isPending}
              className="font-sans"
            >
              {adopt.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Adopt and configure
            </Button>
          </div>
        </div>
      ) : !ready ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className={tokens.loading.spinner} />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="rules" className="font-sans">
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="applicability" className="font-sans">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Applicability
              {applicabilityCount > 0 && (
                <Badge variant="secondary" className="ml-2 font-sans text-[10px]">
                  {applicabilityCount}
                </Badge>
              )}
            </TabsTrigger>
            {showSurfacesTab && (
              <TabsTrigger value="surfaces" className="font-sans">
                <MapPin className="w-3.5 h-3.5 mr-1.5" />
                Surfaces
                {surfacesActiveCount > 0 && (
                  <Badge variant="secondary" className="ml-2 font-sans text-[10px]">
                    {surfacesActiveCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="drafts" className="font-sans">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Drafts
              {approvedVariantCount > 0 && (
                <Badge variant="secondary" className="ml-2 font-sans text-[10px]">
                  {approvedVariantCount}
                </Badge>
              )}
            </TabsTrigger>
            {data?.policyId && showAcknowledgmentsTab && (
              <TabsTrigger value="acknowledgments" className="font-sans">
                <FileSignature className="w-3.5 h-3.5 mr-1.5" />
                Client acknowledgments
              </TabsTrigger>
            )}
          </TabsList>

          {/* ---- Rules tab ---- */}
          <TabsContent value="rules" className="mt-6">
            <div className="space-y-6">
              <div>
                <h4 className="font-sans text-sm font-medium mb-1">{schema.label}</h4>
                <p className="font-sans text-xs text-muted-foreground">
                  {schema.description}
                </p>
              </div>

              <div className="space-y-6">
                {schema.sections.map((section) => (
                  <div key={section.title} className="space-y-4">
                    <div>
                      <h5 className="font-display text-xs tracking-wider uppercase text-foreground">
                        {section.title}
                      </h5>
                      {section.description && (
                        <p className="font-sans text-xs text-muted-foreground mt-1">
                          {section.description}
                        </p>
                      )}
                    </div>
                    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                      {section.fields.map((field) => (
                        <PolicyRuleField
                          key={field.key}
                          field={field}
                          value={values[field.key]}
                          onChange={(v) =>
                            setValues((prev) => ({ ...prev, [field.key]: v }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />
              <div className="flex items-center justify-between gap-3">
                <p className="font-sans text-xs text-muted-foreground">
                  After saving rules, define applicability and surfaces in the next tabs.
                </p>
                <Button
                  size="sm"
                  onClick={handleSaveRules}
                  disabled={save.isPending}
                  className="font-sans"
                >
                  {save.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save rules
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ---- Applicability tab ---- */}
          <TabsContent value="applicability" className="mt-6">
            {versionId && applicability !== null && (
              <PolicyApplicabilityEditor
                versionId={versionId}
                rows={applicability}
                onChange={setApplicability}
              />
            )}
          </TabsContent>

          {/* ---- Surfaces tab ---- */}
          <TabsContent value="surfaces" className="mt-6">
            {versionId && surfaces !== null && (
              <PolicySurfaceEditor
                versionId={versionId}
                candidateSurfaces={entry.candidate_surfaces ?? []}
                policyAudience={entry.audience}
                rows={surfaces}
                onChange={setSurfaces}
              />
            )}
          </TabsContent>

          {/* ---- Drafts tab (Wave 28.6) ---- */}
          <TabsContent value="drafts" className="mt-6">
            {versionId && (
              <PolicyDraftWorkspace
                versionId={versionId}
                rulesReady={rulesReady}
                audience={entry.audience}
              />
            )}
          </TabsContent>

          {/* ---- Acknowledgments tab (Wave 28.10) — always render so historical
                acks remain visible even after the require-ack toggle is turned off
                (audit immutability per Wave 28.10.1). */}
          {data?.policyId && (
            <TabsContent value="acknowledgments" className="mt-6">
              <PolicyAcknowledgmentsPanel
                policyId={data.policyId}
                policyTitle={entry.title}
              />
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Footer — Wave 28.11.5 lifecycle actions (archive / reactivate). Only
          shown after adoption since archive applies to existing policies only. */}
      <Separator />
      <div className="flex items-center justify-between gap-3">
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

      {/* Archive confirmation — destructive-ish action: disables surface
          mappings and stops client-facing renders. Reversible via Reactivate. */}
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
