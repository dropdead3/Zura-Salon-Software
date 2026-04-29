import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertTriangle, Archive, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useArchiveTeamMember } from '@/hooks/useArchiveTeamMember';
import { cn } from '@/lib/utils';

export interface BulkArchiveTarget {
  user_id: string;
  display_name: string | null;
  full_name: string;
  photo_url: string | null;
}

interface BulkArchiveWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | undefined;
  members: BulkArchiveTarget[];
  /** Names of members that were filtered out of the selection upstream
   *  (self, super_admin, already-archived). Surfaces as a one-line note. */
  skippedSummary?: string | null;
  onComplete?: () => void;
}

const REASONS = [
  { value: 'terminated', label: 'Terminated' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'seasonal', label: 'Seasonal / temporary leave' },
  { value: 'transferred', label: 'Transferred to another organization' },
  { value: 'other', label: 'Other' },
];

type ResultRow = { user_id: string; name: string; ok: boolean; error?: string };

/**
 * Slim, single-step bulk archive flow for the homogeneous case
 * (seasonal layoff, location closure). Sends a shared reason +
 * effective date for every selected member. Reassignments are NOT
 * collected here — the per-member dependency-bucket flow lives in
 * ArchiveWizard. Operators wanting nuanced reassignment fall back to
 * the per-row chip.
 *
 * Doctrine: archive is the operational stop (member becomes
 * unschedulable per useStaffSchedulability the moment archived_at is
 * set), so it's safe to defer downstream cleanup to a follow-up flow.
 * The receipt makes that contract explicit so operators don't assume
 * appointments were reassigned.
 */
export function BulkArchiveWizard({ open, onOpenChange, organizationId, members, skippedSummary, onComplete }: BulkArchiveWizardProps) {
  const [reason, setReason] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);

  const archive = useArchiveTeamMember(organizationId);

  // Reset on close so the wizard always opens clean.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setReason('');
        setReasonNote('');
        setEffectiveDate(new Date().toISOString().slice(0, 10));
        setSubmitting(false);
        setResults(null);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  const canSubmit = reason !== '' && members.length > 0 && !submitting;

  const okCount = useMemo(() => results?.filter(r => r.ok).length ?? 0, [results]);
  const failCount = useMemo(() => results?.filter(r => !r.ok).length ?? 0, [results]);

  async function handleConfirm() {
    if (!canSubmit || !organizationId) return;
    setSubmitting(true);
    const composedReason = reason === 'other' && reasonNote.trim()
      ? `other: ${reasonNote.trim()}`
      : reason;
    const out: ResultRow[] = [];
    // Serial loop so we don't hammer the edge function and we get
    // attributable per-member errors for the receipt.
    for (const m of members) {
      const name = m.display_name || m.full_name || 'Team member';
      try {
        await archive.mutateAsync({
          userId: m.user_id,
          reason: composedReason,
          effectiveDate,
          // No reassignments — homogeneous bulk path. Edge function
          // tolerates [] and proceeds straight to archive.
          reassignments: [],
          notifyReassignedClients: false,
          suppressedClientIds: [],
        });
        out.push({ user_id: m.user_id, name, ok: true });
      } catch (err) {
        out.push({
          user_id: m.user_id,
          name,
          ok: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
    setResults(out);
    setSubmitting(false);
    if (out.every(r => r.ok)) {
      toast.success(`Archived ${out.length} team member${out.length === 1 ? '' : 's'}`);
      onComplete?.();
    } else {
      toast.error(`Archived ${out.filter(r => r.ok).length} of ${out.length}`, {
        description: 'See receipt for failures.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-destructive" />
            {results ? 'Bulk Archive — Receipt' : `Archive ${members.length} team member${members.length === 1 ? '' : 's'}`}
          </DialogTitle>
          <DialogDescription>
            {results
              ? 'Per-member outcomes below.'
              : 'Shared reason and effective date apply to every selected member. Per-member work reassignment is not handled here — open an individual member afterwards if specific appointments need a destination.'}
          </DialogDescription>
        </DialogHeader>

        {!results && (
          <div className="space-y-4">
            {skippedSummary && (
              <Alert variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">{skippedSummary}</AlertDescription>
              </Alert>
            )}

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Archived members are immediately removed from rosters and pickers and become
                unschedulable. Existing appointments and tasks remain assigned to them until you
                reassign manually. Restore is available for 90 days.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Members ({members.length})
              </Label>
              <ScrollArea className="h-32 rounded-lg border border-border/60 p-2">
                <div className="space-y-1">
                  {members.map((m) => {
                    const name = m.display_name || m.full_name || 'Unnamed';
                    const initials = name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <div key={m.user_id} className="flex items-center gap-2 px-2 py-1 rounded">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={m.photo_url ?? undefined} alt={name} />
                          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-sans text-xs text-foreground truncate">{name}</span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bulk-reason" className="text-xs">Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="bulk-reason">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-effective" className="text-xs">Effective date</Label>
                <Input
                  id="bulk-effective"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </div>
            </div>

            {reason === 'other' && (
              <div className="space-y-1.5">
                <Label htmlFor="bulk-note" className="text-xs">Note (optional)</Label>
                <Textarea
                  id="bulk-note"
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value)}
                  placeholder="Briefly describe the reason…"
                  rows={2}
                />
              </div>
            )}
          </div>
        )}

        {results && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {okCount} archived
              </span>
              {failCount > 0 && (
                <span className="flex items-center gap-1.5 text-destructive">
                  <XCircle className="h-4 w-4" /> {failCount} failed
                </span>
              )}
            </div>
            <ScrollArea className="h-48 rounded-lg border border-border/60 p-2">
              <div className="space-y-1">
                {results.map((r) => (
                  <div
                    key={r.user_id}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded text-xs',
                      r.ok ? 'text-foreground' : 'text-destructive bg-destructive/5',
                    )}
                  >
                    {r.ok
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                    <span className="font-sans truncate">{r.name}</span>
                    {!r.ok && r.error && (
                      <span className="ml-auto text-[10px] opacity-80 truncate max-w-[40%]">{r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-[11px] text-muted-foreground font-sans">
              Appointments and tasks for archived members were not reassigned. Open each member
              individually to handle dependency cleanup.
            </p>
          </div>
        )}

        <DialogFooter>
          {!results ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirm} disabled={!canSubmit}>
                {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {submitting
                  ? `Archiving ${members.length}…`
                  : `Archive ${members.length}`}
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
