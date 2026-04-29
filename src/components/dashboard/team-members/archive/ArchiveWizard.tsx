import { useEffect, useMemo, useState } from 'react';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2, AlertTriangle, ChevronLeft, ChevronRight, Archive, CheckCircle2, X, Info, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useOrganizationUsers, type OrganizationUser } from '@/hooks/useOrganizationUsers';
import {
  useScanTeamMemberDependencies,
  useArchiveTeamMember,
  type ArchiveBucketKey,
  type ArchiveAction,
  type DependencyBucket,
  type DestinationRole,
  type Reassignment,
  type ClientPreferenceItem,
} from '@/hooks/useArchiveTeamMember';

// ============================================================
// Action verb tooltips — single source of truth so wording stays
// consistent across every bucket and bulk-vs-row variant.
// ============================================================
const ACTION_TOOLTIPS = {
  reassign: 'Move all open work to the selected teammate. They become responsible going forward.',
  reassign_row: 'Make this teammate responsible for this single item.',
  drop_all: "Clear the link to the archived stylist on every item in this bucket without notifying or reassigning. For client preferences this empties the 'preferred stylist' field — clients can re-pick on their next booking.",
  drop_row: "Clear the link on just this item. The client can re-pick a preferred stylist on their next visit.",
  cancel_all: 'Cancel every record in this bucket. Clients / counterparts are notified per your existing cancellation policy.',
  cancel_row: 'Cancel just this record. The client / counterpart is notified per your existing cancellation policy.',
  end_date_all: "Set an end date on every recurring schedule so they stop generating new shifts after the archive's effective day.",
  use_recommendation: 'Accept the recommended teammate for this client. You can still override below.',
} as const;

function HintedButton({
  hint, children, ...rest
}: React.ComponentProps<typeof Button> & { hint: string }) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <Button {...rest}>
          {children}
          <Info className="h-3 w-3 ml-1 opacity-50" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-xs">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}

interface ArchiveWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: OrganizationUser;
  onArchived?: () => void;
}

const REASONS: Array<{ value: string; label: string }> = [
  { value: 'terminated', label: 'Terminated' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'seasonal', label: 'Seasonal / temporary leave' },
  { value: 'transferred', label: 'Transferred to another organization' },
  { value: 'other', label: 'Other' },
];

const STYLIST_ROLES = ['stylist', 'lead_stylist', 'lead'];
const ASSISTANT_ROLES = ['stylist_assistant', 'assistant'];
const MANAGER_ROLES = ['admin', 'super_admin', 'manager', 'general_manager', 'assistant_manager', 'director_of_operations'];

function rosterMatchesRole(u: OrganizationUser, role: DestinationRole): boolean {
  if (role === 'any') return true;
  const r = u.roles ?? [];
  if (role === 'stylist') return r.some((x) => STYLIST_ROLES.includes(x));
  if (role === 'stylist_assistant') return r.some((x) => ASSISTANT_ROLES.includes(x));
  if (role === 'manager') return r.some((x) => MANAGER_ROLES.includes(x));
  return false;
}

/** True when every item in this bucket has a decision recorded. */
function isBucketHandled(
  b: DependencyBucket,
  picks: Record<string, Record<string, Reassignment>>,
): boolean {
  if (b.count === 0) return true;
  const m = picks[b.key] ?? {};
  // True bulk-only: no items returned (e.g. a recurring schedule bucket
  // with end_date as the only action).
  const isBulkOnly = b.items.length === 0;
  if (isBulkOnly) return !!m['__bulk__'];
  // Per-item: every visible item decided + bulk marker if there's overflow.
  const decidedCount = Object.keys(m).filter((k) => k !== '__bulk__').length;
  if (decidedCount < b.items.length) return false;
  if (b.count > b.items.length) return !!m['__bulk__'];
  return true;
}

/** One-line summary of decisions made on a bucket, for the Step 2 tile. */
function summarizeBucketDecisions(
  b: DependencyBucket,
  picks: Record<string, Record<string, Reassignment>>,
  roster: OrganizationUser[],
): string {
  const m = picks[b.key] ?? {};
  const entries = Object.values(m);
  if (entries.length === 0) return '';
  const reassign = entries.filter((r) => r.action === 'reassign' && r.destinationUserId);
  const cancel = entries.filter((r) => r.action === 'cancel').length;
  const drop = entries.filter((r) => r.action === 'drop').length;
  const endDate = entries.filter((r) => r.action === 'end_date').length;

  const destSet = new Set(reassign.map((r) => r.destinationUserId));
  const parts: string[] = [];
  if (reassign.length > 0) {
    if (destSet.size === 1) {
      const dest = reassign[0].destinationUserId!;
      const u = roster.find((r) => r.user_id === dest);
      const name = u?.display_name || u?.full_name || 'teammate';
      parts.push(`Reassigned to ${name}`);
    } else {
      parts.push(`${reassign.length} reassigned across ${destSet.size}`);
    }
  }
  if (cancel > 0) parts.push(`${cancel} cancelled`);
  if (drop > 0) parts.push(`${drop} dropped`);
  if (endDate > 0) parts.push(`${endDate} end-dated`);
  return parts.join(' · ');
}

type Step = 1 | 2 | 3 | 4;

export function ArchiveWizard({ open, onOpenChange, member, onArchived }: ArchiveWizardProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id;
  const [step, setStep] = useState<Step>(1);
  const [reason, setReason] = useState<string>('');
  const [reasonNote, setReasonNote] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [confirmed, setConfirmed] = useState(false);
  // bucket -> itemId -> assignment
  const [picks, setPicks] = useState<Record<string, Record<string, Reassignment>>>({});
  // bucket -> bulk destination
  const [bulkDest, setBulkDest] = useState<Record<string, string>>({});
  // When set on Step 2, swaps the tile grid for the per-bucket workspace.
  const [activeBucket, setActiveBucket] = useState<ArchiveBucketKey | null>(null);

  const { data: roster = [] } = useOrganizationUsers(orgId);
  const eligibleRoster = useMemo(
    () => roster.filter((u) => u.user_id !== member.user_id && u.is_active && !u.archived_at),
    [roster, member.user_id],
  );

  const { data: scan, isLoading: scanLoading, refetch } = useScanTeamMemberDependencies(
    orgId, member.user_id, open && step >= 2,
  );

  const archive = useArchiveTeamMember(orgId);

  // Reset wizard when reopening.
  useEffect(() => {
    if (open) {
      setStep(1);
      setReason('');
      setReasonNote('');
      setEffectiveDate(new Date().toISOString().slice(0, 10));
      setConfirmed(false);
      setPicks({});
      setBulkDest({});
      setActiveBucket(null);
    }
  }, [open, member.user_id]);

  // Clear bucket workspace whenever we leave Step 2.
  useEffect(() => {
    if (step !== 2) setActiveBucket(null);
  }, [step]);

  const buckets = scan?.buckets ?? [];
  const nonEmptyBuckets = buckets.filter((b) => b.count > 0);

  const totalAssignments = useMemo(
    () => Object.values(picks).reduce((s, m) => s + Object.keys(m).length, 0),
    [picks],
  );

  const handledCount = useMemo(
    () => nonEmptyBuckets.filter((b) => isBucketHandled(b, picks)).length,
    [nonEmptyBuckets, picks],
  );

  const allHandled = useMemo(
    () => nonEmptyBuckets.every((b) => isBucketHandled(b, picks)),
    [nonEmptyBuckets, picks],
  );

  const activeBucketData = useMemo(
    () => (activeBucket ? buckets.find((b) => b.key === activeBucket) ?? null : null),
    [activeBucket, buckets],
  );

  // ---------- assignment helpers ----------

  function setItemPick(b: DependencyBucket, itemId: string, action: ArchiveAction, destinationUserId: string | null) {
    setPicks((prev) => ({
      ...prev,
      [b.key]: { ...(prev[b.key] ?? {}), [itemId]: { bucket: b.key, itemId, action, destinationUserId } },
    }));
  }

  function applyBulk(b: DependencyBucket, action: ArchiveAction, destinationUserId: string | null) {
    setPicks((prev) => {
      const next: Record<string, Reassignment> = {};
      // For per-item buckets, write a row per visible item.
      if (b.items.length > 0) {
        for (const it of b.items) {
          const id = (it as { id: string }).id;
          if (!id) continue;
          next[id] = { bucket: b.key, itemId: id, action, destinationUserId };
        }
        // If count exceeds visible items, also store a bulk marker so the
        // server applies the same action to overflow rows.
        if (b.count > b.items.length) {
          next['__bulk__'] = { bucket: b.key, itemId: '__bulk__', action, destinationUserId };
        }
      } else {
        // Truly bulk-only buckets (no items returned).
        next['__bulk__'] = { bucket: b.key, itemId: '__bulk__', action, destinationUserId };
      }
      return { ...prev, [b.key]: next };
    });
  }

  // ---------- submit ----------

  function buildLedger(): Reassignment[] {
    const out: Reassignment[] = [];
    for (const bucket of nonEmptyBuckets) {
      const m = picks[bucket.key] ?? {};
      for (const [itemId, r] of Object.entries(m)) {
        // Skip the synthetic '__bulk__' marker for per-item buckets where we
        // already enumerated each item; only keep it for true bulk buckets.
        if (itemId === '__bulk__' && bucket.items.length > 0) {
          continue;
        }
        out.push(r);
      }
    }
    return out;
  }

  async function handleConfirm() {
    if (!orgId || !reason || !confirmed) return;
    const ledger = buildLedger();
    await archive.mutateAsync({
      userId: member.user_id,
      reason,
      effectiveDate,
      reassignments: ledger,
    });
    onArchived?.();
    onOpenChange(false);
  }

  // ---------- render ----------

  const name = member.display_name || member.full_name || 'this team member';

  return (
    <PremiumFloatingPanel
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="720px"
      side="right"
      showCloseButton={false}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Archive · Step {step} of 4
              </p>
              <h2 className="font-display text-xl tracking-wide mt-1">
                ARCHIVE {name.toUpperCase()}
              </h2>
              <p className="font-sans text-xs text-muted-foreground mt-1">
                Historical data is preserved. You can un-archive within 90 days.
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {step === 1 && (
            <Step1
              reason={reason} setReason={setReason}
              reasonNote={reasonNote} setReasonNote={setReasonNote}
              effectiveDate={effectiveDate} setEffectiveDate={setEffectiveDate}
            />
          )}

          {step === 2 && !activeBucketData && (
            <Step2
              loading={scanLoading}
              buckets={buckets}
              totalBlocking={scan?.totalBlocking ?? 0}
              onRescan={refetch}
              picks={picks}
              roster={eligibleRoster}
              handledCount={handledCount}
              onOpenBucket={(key) => setActiveBucket(key)}
            />
          )}

          {step === 2 && activeBucketData && (
            <BucketWorkspace
              bucket={activeBucketData}
              roster={eligibleRoster}
              picks={picks}
              bulkDest={bulkDest}
              setBulkDest={setBulkDest}
              onItemPick={setItemPick}
              onApplyBulk={applyBulk}
            />
          )}

          {step === 3 && (
            <Step3
              buckets={nonEmptyBuckets.filter((b) => !isBucketHandled(b, picks))}
              roster={eligibleRoster}
              picks={picks}
              bulkDest={bulkDest}
              setBulkDest={setBulkDest}
              onItemPick={setItemPick}
              onApplyBulk={applyBulk}
            />
          )}

          {step === 4 && (
            <Step4
              name={name}
              reason={REASONS.find((r) => r.value === reason)?.label ?? reason}
              effectiveDate={effectiveDate}
              ledger={buildLedger()}
              roster={eligibleRoster}
              confirmed={confirmed}
              setConfirmed={setConfirmed}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-border/50 flex items-center justify-between bg-card/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (activeBucketData) {
                setActiveBucket(null);
              } else {
                setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
              }
            }}
            disabled={(step === 1 && !activeBucketData) || archive.isPending}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {activeBucketData ? 'Back to impact preview' : 'Back'}
          </Button>

          <div className="flex items-center gap-2">
            {activeBucketData ? (
              <Button
                size="sm"
                disabled={!isBucketHandled(activeBucketData, picks)}
                onClick={() => setActiveBucket(null)}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Done
              </Button>
            ) : step < 4 ? (
              <Button
                size="sm"
                disabled={
                  (step === 1 && !reason) ||
                  (step === 2 && scanLoading) ||
                  (step === 3 && !allHandled)
                }
                onClick={() => {
                  // Step 2 routing: skip Step 3 entirely when there's nothing
                  // left to decide. Step 3 only shows up when buckets are
                  // partially handled (acts as a cleanup view).
                  if (step === 2 && (nonEmptyBuckets.length === 0 || allHandled)) {
                    setStep(4);
                  } else {
                    setStep((s) => ((s + 1) as Step));
                  }
                }}
              >
                {step === 2 && nonEmptyBuckets.length === 0
                  ? 'Continue (no dependencies)'
                  : step === 2 && allHandled
                    ? 'Continue to review'
                    : 'Continue'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                disabled={!confirmed || archive.isPending}
                onClick={handleConfirm}
              >
                {archive.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Archive className="h-4 w-4 mr-1" />}
                Archive {name}
              </Button>
            )}
          </div>
        </footer>
      </div>
    </PremiumFloatingPanel>
  );
}

// ============================================================
// Step 1 — Reason + effective date
// ============================================================

function Step1({
  reason, setReason, reasonNote, setReasonNote, effectiveDate, setEffectiveDate,
}: {
  reason: string; setReason: (v: string) => void;
  reasonNote: string; setReasonNote: (v: string) => void;
  effectiveDate: string; setEffectiveDate: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="font-sans text-sm">Reason for archive</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger className="rounded-full">
            <SelectValue placeholder="Select reason…" />
          </SelectTrigger>
          <SelectContent>
            {REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="font-sans text-sm">Last day worked</Label>
        <Input
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          className="rounded-full"
        />
        <p className={cn(tokens.body.muted, 'text-xs')}>
          Drives schedule end-date and payroll cutoff.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="font-sans text-sm">Internal note (optional)</Label>
        <Textarea
          value={reasonNote}
          onChange={(e) => setReasonNote(e.target.value)}
          placeholder="For your records — not shared with the archived user."
          rows={3}
        />
      </div>
    </div>
  );
}

// ============================================================
// Step 2 — Dependency scan
// ============================================================

function Step2({
  loading, buckets, totalBlocking, onRescan, picks, roster, handledCount, onOpenBucket,
}: {
  loading: boolean;
  buckets: DependencyBucket[];
  totalBlocking: number;
  onRescan: () => void;
  picks: Record<string, Record<string, Reassignment>>;
  roster: OrganizationUser[];
  handledCount: number;
  onOpenBucket: (key: ArchiveBucketKey) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const nonEmpty = buckets.filter((b) => b.count > 0);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card/60 p-4">
        <p className="font-display text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Impact preview
        </p>
        <p className="font-sans text-sm text-foreground mt-1">
          {nonEmpty.length === 0
            ? 'No upcoming work to reassign. Safe to archive.'
            : `${nonEmpty.length} ${nonEmpty.length === 1 ? 'bucket' : 'buckets'} of work need attention before this team member is archived.`}
        </p>
        {totalBlocking > 0 && (
          <div className="flex items-center gap-2 mt-3 text-xs text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{totalBlocking} time-sensitive items (appointments / pairings) require reassignment.</span>
          </div>
        )}
        {nonEmpty.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full bg-emerald-500/70 transition-all"
                style={{ width: `${(handledCount / nonEmpty.length) * 100}%` }}
              />
            </div>
            <span className="font-sans text-[11px] text-muted-foreground tabular-nums">
              {handledCount} / {nonEmpty.length} handled
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {buckets.map((b) => {
          const handled = isBucketHandled(b, picks);
          const summary = handled && b.count > 0 ? summarizeBucketDecisions(b, picks, roster) : '';
          const interactive = b.count > 0;

          if (!interactive) {
            return (
              <div
                key={b.key}
                className="rounded-lg border border-border/40 bg-muted/20 opacity-60 px-3 py-2 flex items-center justify-between"
              >
                <span className="font-sans text-xs text-foreground">{b.label}</span>
                <Badge variant="outline" className="text-[11px]">0</Badge>
              </div>
            );
          }

          return (
            <button
              key={b.key}
              type="button"
              onClick={() => onOpenBucket(b.key)}
              className={cn(
                'group rounded-lg border bg-card/60 hover:bg-card/80 text-left px-3 py-2.5 transition-colors',
                handled ? 'border-emerald-500/40' : 'border-border',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-sans text-xs text-foreground truncate">{b.label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {handled ? (
                    <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-500 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {b.count}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[11px]">{b.count}</Badge>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                </div>
              </div>
              {handled ? (
                <p className="font-sans text-[11px] text-emerald-500/90 mt-1 truncate">
                  {summary || 'Handled'}
                </p>
              ) : (
                <p className="font-sans text-[11px] text-muted-foreground mt-1">
                  Tap to reassign
                </p>
              )}
            </button>
          );
        })}
      </div>

      <Button variant="ghost" size="sm" onClick={onRescan} className="text-xs">
        Re-scan
      </Button>
    </div>
  );
}

// ============================================================
// BucketWorkspace — focused per-bucket reassignment view
// (rendered in-place on Step 2 when a bucket is opened)
// ============================================================

function BucketWorkspace({
  bucket: b, roster, picks, bulkDest, setBulkDest, onItemPick, onApplyBulk,
}: {
  bucket: DependencyBucket;
  roster: OrganizationUser[];
  picks: Record<string, Record<string, Reassignment>>;
  bulkDest: Record<string, string>;
  setBulkDest: (v: Record<string, string>) => void;
  onItemPick: (b: DependencyBucket, itemId: string, action: ArchiveAction, dest: string | null) => void;
  onApplyBulk: (b: DependencyBucket, action: ArchiveAction, dest: string | null) => void;
}) {
  const eligible = roster.filter((u) => rosterMatchesRole(u, b.destinationRole));
  const decidedCount = Object.keys(picks[b.key] ?? {}).filter((k) => k !== '__bulk__').length;
  const isBulkBucket = b.key === 'client_preferences' || b.items.length === 0;
  const overflow = b.count - b.items.length;
  const handled = isBucketHandled(b, picks);

  return (
    <section className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
      <header className="px-4 py-3 border-b border-border/50 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="font-display text-xs tracking-wider uppercase text-foreground">
            {b.label}
          </p>
          <p className="font-sans text-[11px] text-muted-foreground mt-0.5">
            {b.count} {b.count === 1 ? 'item' : 'items'}
            {b.destinationRole !== 'any' && ` · destination role: ${b.destinationRole.replace('_', ' ')}`}
          </p>
        </div>
        {handled ? (
          <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-500 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Handled
          </Badge>
        ) : !isBulkBucket ? (
          <Badge variant="outline" className="text-[10px]">
            {decidedCount} / {b.items.length} decided
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">Needs decision</Badge>
        )}
      </header>

      {/* Bulk control */}
      <div className="px-4 py-3 bg-muted/20 border-b border-border/40 flex items-center gap-2 flex-wrap">
        <span className="font-sans text-xs text-muted-foreground">
          {isBulkBucket ? 'Reassign all to' : 'Bulk reassign to'}
        </span>
        <Select
          value={bulkDest[b.key] ?? ''}
          onValueChange={(v) => setBulkDest({ ...bulkDest, [b.key]: v })}
        >
          <SelectTrigger className="h-8 w-[200px] rounded-full text-xs">
            <SelectValue placeholder="Pick a teammate…" />
          </SelectTrigger>
          <SelectContent>
            {eligible.length === 0 && (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                No eligible {b.destinationRole.replace('_', ' ')}.
              </div>
            )}
            {eligible.map((u) => (
              <SelectItem key={u.user_id} value={u.user_id}>
                {u.display_name || u.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 text-xs"
          disabled={!bulkDest[b.key]}
          onClick={() => onApplyBulk(b, 'reassign', bulkDest[b.key])}
        >
          Apply
        </Button>
        {b.actions.includes('cancel') && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-destructive"
            onClick={() => onApplyBulk(b, 'cancel', null)}
          >
            Cancel all
          </Button>
        )}
        {b.actions.includes('drop') && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => onApplyBulk(b, 'drop', null)}
          >
            Drop all
          </Button>
        )}
        {b.actions.includes('end_date') && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => onApplyBulk(b, 'end_date', null)}
          >
            End-date all
          </Button>
        )}
      </div>

      {/* Per-item rows */}
      {!isBulkBucket && (
        <ul className="divide-y divide-border/40 max-h-[420px] overflow-y-auto">
          {b.items.map((raw) => {
            const item = raw as Record<string, unknown>;
            const id = String(item.id);
            const decided = picks[b.key]?.[id];
            return (
              <li key={id} className="px-4 py-2 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-xs text-foreground truncate">
                    {describeItem(b.key, item)}
                  </p>
                  {decided && (
                    <p className="font-sans text-[11px] text-muted-foreground mt-0.5">
                      {decided.action === 'reassign'
                        ? `→ ${roster.find((u) => u.user_id === decided.destinationUserId)?.display_name || roster.find((u) => u.user_id === decided.destinationUserId)?.full_name || 'Selected'}`
                        : decided.action === 'cancel' ? 'Will be cancelled'
                        : decided.action === 'drop' ? 'Will be dropped'
                        : 'Will be end-dated'}
                    </p>
                  )}
                </div>
                <Select
                  value={decided?.destinationUserId ?? ''}
                  onValueChange={(v) => onItemPick(b, id, 'reassign', v)}
                >
                  <SelectTrigger className="h-7 w-[160px] rounded-full text-[11px]">
                    <SelectValue placeholder="Reassign to…" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligible.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.display_name || u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {b.actions.includes('cancel') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => onItemPick(b, id, 'cancel', null)}
                  >
                    Cancel
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {overflow > 0 && (
        <p className="px-4 py-2 text-[11px] text-muted-foreground bg-muted/10">
          +{overflow} more items beyond preview — bulk action will apply to all.
        </p>
      )}
    </section>
  );
}

// ============================================================
// Step 3 — Reassignment picker
// ============================================================

function Step3({
  buckets, roster, picks, bulkDest, setBulkDest, onItemPick, onApplyBulk,
}: {
  buckets: DependencyBucket[];
  roster: OrganizationUser[];
  picks: Record<string, Record<string, Reassignment>>;
  bulkDest: Record<string, string>;
  setBulkDest: (v: Record<string, string>) => void;
  onItemPick: (b: DependencyBucket, itemId: string, action: ArchiveAction, dest: string | null) => void;
  onApplyBulk: (b: DependencyBucket, action: ArchiveAction, dest: string | null) => void;
}) {
  if (buckets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-3" />
        <p className="font-sans text-sm text-foreground">All buckets handled.</p>
        <p className="font-sans text-xs text-muted-foreground mt-1">Continue to review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {buckets.map((b) => {
        const eligible = roster.filter((u) => rosterMatchesRole(u, b.destinationRole));
        const handledCount = Object.keys(picks[b.key] ?? {}).filter((k) => k !== '__bulk__').length;
        const isBulkBucket = b.key === 'client_preferences' || b.items.length === 0;
        const overflow = b.count - b.items.length;

        return (
          <section key={b.key} className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
            <header className="px-4 py-3 border-b border-border/50 flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="font-display text-xs tracking-wider uppercase text-foreground">
                  {b.label}
                </p>
                <p className="font-sans text-[11px] text-muted-foreground mt-0.5">
                  {b.count} {b.count === 1 ? 'item' : 'items'}
                  {b.destinationRole !== 'any' && ` · destination role: ${b.destinationRole.replace('_', ' ')}`}
                </p>
              </div>
              {!isBulkBucket && (
                <Badge variant="outline" className="text-[10px]">
                  {handledCount} / {b.items.length} decided
                </Badge>
              )}
            </header>

            {/* Bulk control */}
            <div className="px-4 py-3 bg-muted/20 border-b border-border/40 flex items-center gap-2 flex-wrap">
              <span className="font-sans text-xs text-muted-foreground">
                {isBulkBucket ? 'Reassign all to' : 'Bulk reassign to'}
              </span>
              <Select
                value={bulkDest[b.key] ?? ''}
                onValueChange={(v) => setBulkDest({ ...bulkDest, [b.key]: v })}
              >
                <SelectTrigger className="h-8 w-[200px] rounded-full text-xs">
                  <SelectValue placeholder="Pick a teammate…" />
                </SelectTrigger>
                <SelectContent>
                  {eligible.length === 0 && (
                    <div className="px-2 py-2 text-xs text-muted-foreground">
                      No eligible {b.destinationRole.replace('_', ' ')}.
                    </div>
                  )}
                  {eligible.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.display_name || u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs"
                disabled={!bulkDest[b.key]}
                onClick={() => onApplyBulk(b, 'reassign', bulkDest[b.key])}
              >
                Apply
              </Button>
              {b.actions.includes('cancel') && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-destructive"
                  onClick={() => onApplyBulk(b, 'cancel', null)}
                >
                  Cancel all
                </Button>
              )}
              {b.actions.includes('drop') && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => onApplyBulk(b, 'drop', null)}
                >
                  Drop all
                </Button>
              )}
              {b.actions.includes('end_date') && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => onApplyBulk(b, 'end_date', null)}
                >
                  End-date all
                </Button>
              )}
            </div>

            {/* Per-item rows */}
            {!isBulkBucket && (
              <ul className="divide-y divide-border/40 max-h-[280px] overflow-y-auto">
                {b.items.map((raw) => {
                  const item = raw as Record<string, unknown>;
                  const id = String(item.id);
                  const decided = picks[b.key]?.[id];
                  return (
                    <li key={id} className="px-4 py-2 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-xs text-foreground truncate">
                          {describeItem(b.key, item)}
                        </p>
                        {decided && (
                          <p className="font-sans text-[11px] text-muted-foreground mt-0.5">
                            {decided.action === 'reassign'
                              ? `→ ${roster.find((u) => u.user_id === decided.destinationUserId)?.display_name || roster.find((u) => u.user_id === decided.destinationUserId)?.full_name || 'Selected'}`
                              : decided.action === 'cancel' ? 'Will be cancelled'
                              : decided.action === 'drop' ? 'Will be dropped'
                              : 'Will be end-dated'}
                          </p>
                        )}
                      </div>
                      <Select
                        value={decided?.destinationUserId ?? ''}
                        onValueChange={(v) => onItemPick(b, id, 'reassign', v)}
                      >
                        <SelectTrigger className="h-7 w-[160px] rounded-full text-[11px]">
                          <SelectValue placeholder="Reassign to…" />
                        </SelectTrigger>
                        <SelectContent>
                          {eligible.map((u) => (
                            <SelectItem key={u.user_id} value={u.user_id}>
                              {u.display_name || u.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {b.actions.includes('cancel') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => onItemPick(b, id, 'cancel', null)}
                        >
                          Cancel
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {overflow > 0 && (
              <p className="px-4 py-2 text-[11px] text-muted-foreground bg-muted/10">
                +{overflow} more items beyond preview — bulk action will apply to all.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function describeItem(bucket: ArchiveBucketKey, it: Record<string, unknown>): string {
  switch (bucket) {
    case 'appointments':
      return `${formatDate(it.start_time)} · ${(it.client_name as string) ?? 'Client'} · ${(it.service_name as string) ?? 'Service'}`;
    case 'service_assignments':
      return `${(it.service_name as string) ?? 'Service'}`;
    case 'appointment_assistants':
      return `Pairing on appointment ${String(it.appointment_id).slice(0, 8)}`;
    case 'assistant_requests':
      return `${(it.client_name as string) ?? 'Request'} · ${(it.request_date as string) ?? ''} ${(it.start_time as string) ?? ''}`;
    case 'operational_tasks':
    case 'seo_tasks':
      return `${(it.title as string) ?? (it.template_key as string) ?? 'Task'} · due ${formatDate(it.due_at)}`;
    case 'shift_swaps':
      return `Swap on ${(it.original_date as string) ?? ''}`;
    case 'meeting_requests':
      return `${(it.reason as string) ?? 'Meeting'}`;
    case 'employee_location_schedules':
      return `Recurring schedule (location ${String(it.location_id).slice(0, 8)})`;
    case 'walk_in_queue':
      return `Walk-in: ${(it.client_name as string) ?? 'guest'}`;
    default:
      return String(it.id);
  }
}

function formatDate(v: unknown): string {
  if (!v) return '—';
  try {
    const d = new Date(String(v));
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return String(v);
  }
}

// ============================================================
// Step 4 — Review & confirm
// ============================================================

function Step4({
  name, reason, effectiveDate, ledger, roster, confirmed, setConfirmed,
}: {
  name: string;
  reason: string;
  effectiveDate: string;
  ledger: Reassignment[];
  roster: OrganizationUser[];
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
}) {
  const summaryByBucket = useMemo(() => {
    const m = new Map<string, { reassign: Map<string, number>; cancel: number; drop: number; endDate: number }>();
    for (const r of ledger) {
      let entry = m.get(r.bucket);
      if (!entry) {
        entry = { reassign: new Map(), cancel: 0, drop: 0, endDate: 0 };
        m.set(r.bucket, entry);
      }
      if (r.action === 'reassign' && r.destinationUserId) {
        entry.reassign.set(r.destinationUserId, (entry.reassign.get(r.destinationUserId) ?? 0) + 1);
      } else if (r.action === 'cancel') entry.cancel += 1;
      else if (r.action === 'drop') entry.drop += 1;
      else if (r.action === 'end_date') entry.endDate += 1;
    }
    return m;
  }, [ledger]);

  const nameOf = (id: string) =>
    roster.find((u) => u.user_id === id)?.display_name ||
    roster.find((u) => u.user_id === id)?.full_name ||
    'Selected teammate';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs text-muted-foreground">Reason</span>
          <span className="font-sans text-sm text-foreground">{reason}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs text-muted-foreground">Last day worked</span>
          <span className="font-sans text-sm text-foreground">{effectiveDate}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs text-muted-foreground">Total reassignments</span>
          <span className="font-sans text-sm text-foreground">{ledger.length}</span>
        </div>
      </div>

      {summaryByBucket.size > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/40">
          {Array.from(summaryByBucket.entries()).map(([bucket, entry]) => (
            <div key={bucket} className="px-4 py-3 space-y-1">
              <p className="font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                {bucket.replace(/_/g, ' ')}
              </p>
              {Array.from(entry.reassign.entries()).map(([uid, count]) => (
                <p key={uid} className="font-sans text-xs text-foreground">
                  {count} → {nameOf(uid)}
                </p>
              ))}
              {entry.cancel > 0 && <p className="font-sans text-xs text-destructive">{entry.cancel} cancelled</p>}
              {entry.drop > 0 && <p className="font-sans text-xs text-muted-foreground">{entry.drop} dropped</p>}
              {entry.endDate > 0 && <p className="font-sans text-xs text-muted-foreground">{entry.endDate} end-dated</p>}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs text-foreground space-y-1">
            <p>
              {name} will be removed from rosters and pickers. Their PIN is wiped and they can't log in.
            </p>
            <p className="text-muted-foreground">
              Historical sales, payroll, and completed appointments stay intact. You can un-archive within 90 days.
            </p>
          </div>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(!!v)} />
        <span className="font-sans text-xs text-foreground">
          I've reviewed the reassignments above and want to archive {name}.
        </span>
      </label>
    </div>
  );
}
