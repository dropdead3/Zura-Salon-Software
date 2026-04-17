import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { MessageCircle, Plus, Check, ChevronDown, ChevronUp } from 'lucide-react';
import {
  useClientCallbacks,
  useCreateCallback,
  useAcknowledgeCallback,
  useDeleteCallback,
} from '@/hooks/useClientCallbacks';
import { useCallbackLookup } from '@/contexts/CallbackLookupContext';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ClientCallbacksPanelProps {
  organizationId: string | null | undefined;
  clientId: string | null | undefined;
  clientFirstName?: string | null;
  /** Compact mode = no border/padding wrapper. */
  compact?: boolean;
  /** Hide the "Past follow-ups" toggle. */
  hidePast?: boolean;
}

/**
 * Render an author name as "First L." (first name + last initial) so multiple
 * "Jenna"s on a team are disambiguated. Falls back to first name only if no
 * last name available.
 */
function formatAuthor(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return null;
  const first = parts[0];
  const last = parts[1];
  if (!last) return first;
  return `${first} ${last[0].toUpperCase()}.`;
}

export function ClientCallbacksPanel({
  organizationId,
  clientId,
  clientFirstName,
  compact = false,
  hidePast = false,
}: ClientCallbacksPanelProps) {
  // Context-driven active set: when mounted under CallbackLookupProvider
  // (schedule grid), reuse the org-wide query instead of firing per-client.
  const lookup = useCallbackLookup();
  const { data: hookActive = [], isLoading: hookLoading } = useClientCallbacks(
    lookup ? null : clientId,
  );
  const active = lookup ? lookup.getActiveCallbacks(clientId) : hookActive;
  const isLoading = lookup ? !lookup.isLoaded : hookLoading;

  // Archived list stays per-client (cold path — only fetched when user expands).
  const { data: archived = [] } = useClientCallbacks(clientId, { includeArchived: true });

  // Team directory powers "added by / heard by" attribution. Cached 5m so
  // this is effectively free across the dashboard session.
  const { data: team = [] } = useTeamDirectory(undefined, {
    organizationId: organizationId || undefined,
  });
  const authorById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of team) {
      if (member.user_id && member.full_name) {
        map.set(member.user_id, member.full_name);
      }
    }
    return map;
  }, [team]);
  const authorLabel = (userId: string | null | undefined) =>
    userId ? formatAuthor(authorById.get(userId)) : null;

  const create = useCreateCallback();
  const ack = useAcknowledgeCallback();
  const remove = useDeleteCallback();

  const [adding, setAdding] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [hearingId, setHearingId] = useState<string | null>(null);
  const [outcomeNote, setOutcomeNote] = useState('');

  if (!clientId || !organizationId) return null;

  const past = archived.filter((c) => c.acknowledged_at != null);

  const handleSave = async () => {
    if (!draftPrompt.trim()) return;
    await create.mutateAsync({
      organization_id: organizationId,
      client_id: clientId,
      prompt: draftPrompt.trim(),
      trigger_date: useCustomDate && draftDate ? draftDate : null,
    });
    setDraftPrompt('');
    setDraftDate('');
    setUseCustomDate(false);
    setAdding(false);
  };

  const handleHeard = async (id: string) => {
    await ack.mutateAsync({
      id,
      client_id: clientId,
      outcome_note: outcomeNote.trim() || undefined,
    });
    setHearingId(null);
    setOutcomeNote('');
  };

  const wrapperCls = compact
    ? 'space-y-2'
    : 'rounded-xl border bg-card p-4 space-y-3';

  return (
    <div className={wrapperCls}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <h3 className="font-display text-xs tracking-wide uppercase">Follow Up</h3>
          {active.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {active.length} open
            </span>
          )}
        </div>
        {!adding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAdding(true)}
            className="h-7 px-2 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : active.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground italic leading-relaxed">
          No open follow-ups. Capture something to ask{' '}
          {clientFirstName || 'them'} about next visit.
        </p>
      ) : (
        <ul className="space-y-2">
          {active.map((cb) => {
            const by = authorLabel(cb.created_by);
            return (
              <li
                key={cb.id}
                className={cn(
                  'flex items-start gap-2 p-2 rounded-lg border cursor-default',
                  'bg-amber-50/40 border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/40',
                )}
              >
                <MessageCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{cb.prompt}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cb.trigger_date
                      ? `Trigger ${format(parseISO(cb.trigger_date), 'MMM d, yyyy')}`
                      : 'Next visit'}
                    {by && <span className="opacity-70"> · by {by}</span>}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Popover
                    open={hearingId === cb.id}
                    onOpenChange={(open) => {
                      if (open) {
                        setHearingId(cb.id);
                        setOutcomeNote('');
                      } else {
                        setHearingId(null);
                        setOutcomeNote('');
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        title="Mark heard"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Heard
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="end"
                      className="w-72 p-3 space-y-2"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-display tracking-wide uppercase text-muted-foreground">
                          How did it go?
                        </p>
                        <p className="text-[11px] text-muted-foreground italic">
                          Optional — capture the moment so it shows up later.
                        </p>
                      </div>
                      <Input
                        value={outcomeNote}
                        onChange={(e) => setOutcomeNote(e.target.value)}
                        placeholder="e.g. Loved Italy — going back next year"
                        className="h-8 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleHeard(cb.id);
                          if (e.key === 'Escape') {
                            setHearingId(null);
                            setOutcomeNote('');
                          }
                        }}
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setHearingId(null);
                            setOutcomeNote('');
                          }}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleHeard(cb.id)}
                          disabled={ack.isPending}
                          className="h-7 text-xs"
                        >
                          Mark heard
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <button
                    onClick={() => remove.mutate({ id: cb.id, client_id: clientId })}
                    className="text-xs text-muted-foreground hover:text-foreground px-1"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <div className="space-y-2 pt-2 border-t">
          <Textarea
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            placeholder="What should we ask about next time? (e.g. Ask how Italy was)"
            className="text-xs min-h-[60px]"
            autoFocus
          />
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomDate}
                onChange={(e) => {
                  setUseCustomDate(e.target.checked);
                  if (!e.target.checked) setDraftDate('');
                }}
                className="h-3 w-3"
              />
              <span>
                Trigger by specific date
                {!useCustomDate && (
                  <span className="ml-1 italic">— defaults to next visit</span>
                )}
              </span>
            </label>
            {useCustomDate && (
              <Input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="h-8 text-xs"
              />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground italic">
            We'll remind you at {clientFirstName || "this client's"} next appointment.
            Mark it heard once you've followed up.
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAdding(false);
                setDraftPrompt('');
                setDraftDate('');
                setUseCustomDate(false);
              }}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!draftPrompt.trim() || create.isPending}
              className="h-7 text-xs"
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {!hidePast && past.length > 0 && (
        <div className="pt-2 border-t">
          <button
            onClick={() => setShowPast((s) => !s)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showPast ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Past follow-ups ({past.length})
          </button>
          {showPast && (
            <ul className="mt-2 space-y-1.5">
              {past.map((cb) => {
                const heardBy = authorLabel(cb.acknowledged_by);
                return (
                  <li
                    key={cb.id}
                    className="text-xs text-muted-foreground flex items-start gap-2"
                  >
                    <Check className="w-3 h-3 mt-0.5 shrink-0 text-emerald-600" />
                    <div>
                      <span className="line-through opacity-70">{cb.prompt}</span>
                      {cb.acknowledged_at && (
                        <span className="ml-2 opacity-60">
                          {format(parseISO(cb.acknowledged_at), 'MMM d, yyyy')}
                        </span>
                      )}
                      {heardBy && <span className="ml-2 opacity-60">· heard by {heardBy}</span>}
                      {cb.outcome_note && (
                        <p className="mt-0.5 not-italic opacity-80">{cb.outcome_note}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
