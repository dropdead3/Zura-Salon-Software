/**
 * Promo Schedule card — queue of timed creative rotations.
 *
 * Lets the operator pre-stage saved-library promos to swap into the live
 * popup over a fixed window without re-publishing the wrapper. Resolver
 * lives in `@/lib/promo-schedule`; this card is pure UI over
 * `formData.schedule`.
 *
 * Doctrine alignment:
 *   - Visibility contract: empty queue renders an inline empty hint instead
 *     of `null` — this surface is operator-toggled (an operator who's looked
 *     for it expects an "Add rotation" affordance, not silence).
 *   - Signal preservation: schedule entries require BOTH startsAt and endsAt.
 *     An open-ended entry would be indistinguishable from "no schedule" at
 *     resolve time.
 *   - Library is the source of truth: each entry stores `savedPromoId` (not
 *     the snapshot itself) so renaming/editing a saved promo updates every
 *     queued rotation it powers.
 *   - Currency / financial values: none on this surface.
 */
import { useMemo, useState } from 'react';
import { Calendar, Trash2, Plus, ArrowRight, Sparkles, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePromoLibrary } from '@/hooks/usePromoLibrary';
import {
  type PromotionalPopupSettings,
  type SavedPromoScheduleEntry,
} from '@/hooks/usePromotionalPopup';
import { pickActiveEntry, detectScheduleConflicts } from '@/lib/promo-schedule';

interface PromoScheduleCardProps {
  formData: PromotionalPopupSettings;
  setFormData: (next: PromotionalPopupSettings) => void;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Convert ISO -> `YYYY-MM-DDTHH:mm` (the value <input type="datetime-local"> expects). */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert local datetime input string -> ISO (UTC). */
function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatWindow(startsAt: string, endsAt: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  return `${fmt(startsAt)} → ${fmt(endsAt)}`;
}

type EntryStatus = 'active' | 'queued' | 'past' | 'invalid';

function statusOf(entry: SavedPromoScheduleEntry, now: Date): EntryStatus {
  const s = Date.parse(entry.startsAt);
  const en = Date.parse(entry.endsAt);
  if (!Number.isFinite(s) || !Number.isFinite(en) || en <= s) return 'invalid';
  const t = now.getTime();
  if (t < s) return 'queued';
  if (t > en) return 'past';
  return 'active';
}

const STATUS_COPY: Record<EntryStatus, { label: string; tone: string }> = {
  active: { label: 'Live now', tone: 'bg-primary/10 text-primary border-primary/30' },
  queued: { label: 'Queued', tone: 'bg-muted text-muted-foreground border-border' },
  past: { label: 'Past', tone: 'bg-muted/40 text-muted-foreground border-border/60' },
  invalid: {
    label: 'Invalid window',
    tone: 'bg-destructive/10 text-destructive border-destructive/30',
  },
};

export function PromoScheduleCard({ formData, setFormData }: PromoScheduleCardProps) {
  const { data: library } = usePromoLibrary();
  const saved = library?.saved ?? [];

  const schedule = formData.schedule ?? [];
  const now = new Date();

  // Add-row state — kept inline (no modal) so operators can author a rotation
  // in three taps without losing context.
  const [draftPromoId, setDraftPromoId] = useState<string>('');
  const [draftStart, setDraftStart] = useState<string>('');
  const [draftEnd, setDraftEnd] = useState<string>('');

  const sortedSchedule = useMemo(
    () =>
      [...schedule].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [schedule],
  );

  const activeEntry = pickActiveEntry(schedule, now);
  const activeName = activeEntry
    ? saved.find((s) => s.id === activeEntry.savedPromoId)?.name ?? '(deleted snapshot)'
    : null;

  const updateSchedule = (next: SavedPromoScheduleEntry[]) => {
    setFormData({ ...formData, schedule: next });
  };

  const handleAdd = () => {
    if (!draftPromoId) {
      toast.error('Pick a saved promo to rotate in.');
      return;
    }
    const startsAt = localInputToIso(draftStart);
    const endsAt = localInputToIso(draftEnd);
    if (!startsAt || !endsAt) {
      toast.error('Pick a start and end date.');
      return;
    }
    if (Date.parse(endsAt) <= Date.parse(startsAt)) {
      toast.error('End must be after start.');
      return;
    }
    const entry: SavedPromoScheduleEntry = {
      id: generateId(),
      savedPromoId: draftPromoId,
      startsAt,
      endsAt,
    };
    updateSchedule([...schedule, entry]);
    setDraftPromoId('');
    setDraftStart('');
    setDraftEnd('');
    toast.success('Rotation queued — Save to publish.');
  };

  const handleRemove = (id: string) => {
    updateSchedule(schedule.filter((e) => e.id !== id));
  };

  const hasSavedPromos = saved.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className={tokens.card.title}>
                Scheduled Rotation
              </CardTitle>
              <CardDescription>
                Queue saved promos to swap into the live popup over a fixed window. The
                wrapper toggle still controls on/off; rotations only change the creative.
              </CardDescription>
            </div>
          </div>
          {activeEntry ? (
            <Badge variant="outline" className="border-primary/40 text-primary shrink-0">
              <Sparkles className="w-3 h-3 mr-1" />
              Live: {activeName}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasSavedPromos ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            Save a promo to the library first — rotations swap saved snapshots in
            and out, so there's nothing to queue until you have at least one.
          </div>
        ) : (
          <>
            {sortedSchedule.length > 0 ? (
              <ul className="space-y-2">
                {sortedSchedule.map((entry) => {
                  const snap = saved.find((s) => s.id === entry.savedPromoId);
                  const status = statusOf(entry, now);
                  const meta = STATUS_COPY[status];
                  return (
                    <li
                      key={entry.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5',
                        status === 'active'
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border/60',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-sans text-sm text-foreground truncate">
                            {snap?.name ?? '(deleted snapshot)'}
                          </span>
                          <Badge variant="outline" className={cn('text-[10px]', meta.tone)}>
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatWindow(entry.startsAt, entry.endsAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(entry.id)}
                        aria-label="Remove rotation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No rotations queued. The base config below renders for every visitor.
              </p>
            )}

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Saved promo</Label>
                  <Select value={draftPromoId} onValueChange={setDraftPromoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a snapshot" />
                    </SelectTrigger>
                    <SelectContent>
                      {saved.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Starts</Label>
                  <Input
                    type="datetime-local"
                    value={draftStart}
                    onChange={(e) => setDraftStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Ends</Label>
                  <Input
                    type="datetime-local"
                    value={draftEnd}
                    onChange={(e) => setDraftEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAdd} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add to queue
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground/80">
              Rotations override creative fields (headline, body, imagery, accent)
              from the chosen snapshot. Targeting, frequency cap, and the offer code
              stay on the wrapper so funnel attribution is consistent across rotations.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
