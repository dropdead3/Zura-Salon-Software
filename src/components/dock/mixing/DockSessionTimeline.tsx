/**
 * DockSessionTimeline — Event log accordion showing session activity.
 * Reads from mix_session_events for full audit trail.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronRight, Clock, FlaskConical, Scale, Lock, AlertTriangle, Zap, Trash2, Play, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface DockSessionTimelineProps {
  sessionId: string;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  event_payload: Record<string, unknown>;
  source_mode: string;
  sequence_number: number;
  created_at: string;
  created_by: string | null;
}

const EVENT_DISPLAY: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  session_created: { label: 'Session Created', icon: Play, color: 'text-blue-400' },
  session_started: { label: 'Session Started', icon: Play, color: 'text-violet-400' },
  bowl_created: { label: 'Bowl Created', icon: FlaskConical, color: 'text-violet-400' },
  line_item_recorded: { label: 'Product Dispensed', icon: Zap, color: 'text-[hsl(var(--platform-foreground))]' },
  line_item_removed: { label: 'Product Removed', icon: Trash2, color: 'text-red-400' },
  weight_captured: { label: 'Weight Captured', icon: Scale, color: 'text-emerald-400' },
  bowl_sealed: { label: 'Bowl Sealed', icon: Lock, color: 'text-amber-400' },
  bowl_discarded: { label: 'Bowl Discarded', icon: Trash2, color: 'text-red-400' },
  reweigh_captured: { label: 'Reweigh Captured', icon: Scale, color: 'text-emerald-400' },
  waste_recorded: { label: 'Waste Recorded', icon: AlertTriangle, color: 'text-amber-400' },
  session_completed: { label: 'Session Completed', icon: Check, color: 'text-emerald-400' },
  session_marked_unresolved: { label: 'Flagged Unresolved', icon: AlertTriangle, color: 'text-amber-400' },
  manual_override_used: { label: 'Manual Override', icon: Zap, color: 'text-amber-400' },
  session_awaiting_reweigh: { label: 'Awaiting Reweigh', icon: Scale, color: 'text-amber-400' },
};

function useSessionEvents(sessionId: string | null) {
  return useQuery({
    queryKey: ['dock-session-events', sessionId],
    queryFn: async (): Promise<TimelineEvent[]> => {
      const { data, error } = await supabase
        .from('mix_session_events')
        .select('id, event_type, event_payload, source_mode, sequence_number, created_at, created_by')
        .eq('mix_session_id', sessionId!)
        .order('sequence_number', { ascending: true })
        .limit(100);

      if (error) throw error;
      return (data || []) as unknown as TimelineEvent[];
    },
    enabled: !!sessionId,
    staleTime: 15_000,
  });
}

export function DockSessionTimeline({ sessionId }: DockSessionTimelineProps) {
  const { data: events, isLoading } = useSessionEvents(sessionId);
  const [expanded, setExpanded] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allEvents = events || [];
  if (allEvents.length === 0) return null;

  const displayEvents = expanded ? allEvents : allEvents.slice(-5);

  return (
    <div className="rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[hsl(var(--platform-bg-elevated))] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.5)]" />
          <span className="font-display text-xs tracking-wide uppercase text-[hsl(var(--platform-foreground-muted))]">
            Activity Timeline
          </span>
          <span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.4)] ml-1">
            {allEvents.length} events
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.4)]" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.4)]" />
        )}
      </button>

      {/* Events list */}
      <div className="px-4 pb-3 space-y-0.5">
        {!expanded && allEvents.length > 5 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full text-center py-1.5 text-[10px] text-violet-400 hover:underline"
          >
            Show {allEvents.length - 5} earlier events
          </button>
        )}

        {displayEvents.map((event, idx) => {
          const display = EVENT_DISPLAY[event.event_type] || {
            label: event.event_type.replace(/_/g, ' '),
            icon: Clock,
            color: 'text-[hsl(var(--platform-foreground-muted))]',
          };
          const Icon = display.icon;
          const isExpanded = expandedEventId === event.id;
          const isLast = idx === displayEvents.length - 1;

          return (
            <div key={event.id}>
              <button
                onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                className="w-full flex items-center gap-2.5 py-1.5 text-left group"
              >
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center w-5 flex-shrink-0">
                  <div className={cn('w-2 h-2 rounded-full', display.color.replace('text-', 'bg-'))} />
                  {!isLast && <div className="w-px flex-1 min-h-[12px] bg-[hsl(var(--platform-border)/0.15)]" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn('w-3 h-3', display.color)} />
                    <span className="text-[11px] text-[hsl(var(--platform-foreground))]">{display.label}</span>
                  </div>
                </div>

                {/* Timestamp */}
                <span className="text-[9px] text-[hsl(var(--platform-foreground-muted)/0.4)] flex-shrink-0">
                  {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                </span>
              </button>

              {/* Expanded payload */}
              {isExpanded && event.event_payload && Object.keys(event.event_payload).length > 0 && (
                <div className="ml-7 mb-2 rounded-lg bg-[hsl(var(--platform-bg-elevated))] border border-[hsl(var(--platform-border)/0.1)] p-2.5 space-y-1">
                  {Object.entries(event.event_payload).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.5)]">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-[hsl(var(--platform-foreground))] truncate max-w-[140px]">
                        {typeof value === 'number' ? value.toFixed(2) : String(value)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[hsl(var(--platform-border)/0.1)]">
                    <span className="text-[9px] text-[hsl(var(--platform-foreground-muted)/0.3)]">
                      seq #{event.sequence_number} · {event.source_mode}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}