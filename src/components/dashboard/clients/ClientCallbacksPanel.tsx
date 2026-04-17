import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { MessageCircle, Plus, Check, ChevronDown, ChevronUp } from 'lucide-react';
import {
  useClientCallbacks,
  useCreateCallback,
  useAcknowledgeCallback,
  useDeleteCallback,
} from '@/hooks/useClientCallbacks';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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

export function ClientCallbacksPanel({
  organizationId,
  clientId,
  clientFirstName,
  compact = false,
  hidePast = false,
}: ClientCallbacksPanelProps) {
  const { data: active = [], isLoading } = useClientCallbacks(clientId);
  const { data: archived = [] } = useClientCallbacks(clientId, { includeArchived: true });
  const create = useCreateCallback();
  const ack = useAcknowledgeCallback();
  const remove = useDeleteCallback();

  const [adding, setAdding] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [showPast, setShowPast] = useState(false);

  if (!clientId || !organizationId) return null;

  const past = archived.filter((c) => c.acknowledged_at != null);

  const handleSave = async () => {
    if (!draftPrompt.trim()) return;
    await create.mutateAsync({
      organization_id: organizationId,
      client_id: clientId,
      prompt: draftPrompt.trim(),
      trigger_date: draftDate || null,
    });
    setDraftPrompt('');
    setDraftDate('');
    setAdding(false);
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
          {active.map((cb) => (
            <li
              key={cb.id}
              className={cn(
                'flex items-start gap-2 p-2 rounded-lg border',
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
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => ack.mutate({ id: cb.id, client_id: clientId })}
                  className="h-7 text-xs"
                  title="Mark heard"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Heard
                </Button>
                <button
                  onClick={() => remove.mutate({ id: cb.id, client_id: clientId })}
                  className="text-xs text-muted-foreground hover:text-foreground px-1"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
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
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground shrink-0">Trigger by</label>
            <Input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="h-8 text-xs"
            />
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
              {past.map((cb) => (
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
