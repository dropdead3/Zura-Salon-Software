/**
 * DockNotesTab — Consolidated notes view: Booking Note, Profile Notes, Formulation Notes, Team Notes.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CalendarPlus, FileText, FlaskConical, MessageSquare, Send, Trash2, Lock, ChevronDown, ChevronUp, StickyNote, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DOCK_CONTENT } from '@/components/dock/dock-ui-tokens';
import { useAppointmentNotes } from '@/hooks/useAppointmentNotes';
import { useClientFormulaHistory } from '@/hooks/color-bar/useClientFormulaHistory';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';

interface DockNotesTabProps {
  appointment: DockAppointment;
}

const isDemoClientId = (id: string | null | undefined) => id?.startsWith('demo-') ?? false;

const DEMO_CLIENT_MOCK = {
  notes: 'Prefers low-ammonia formulas. Sensitive scalp — patch test recommended.',
};

export function DockNotesTab({ appointment }: DockNotesTabProps) {
  const [newNote, setNewNote] = useState('');
  const [notesExpanded, setNotesExpanded] = useState(false);

  const phorestClientId = appointment.phorest_client_id;
  const clientId = appointment.client_id;
  const usingDemo = isDemoClientId(phorestClientId) || isDemoClientId(clientId);

  // Client profile notes query (shares cache with banner)
  const { data: client } = useQuery({
    queryKey: ['dock-client-profile', phorestClientId, clientId, usingDemo],
    queryFn: async () => {
      if (usingDemo) return { ...DEMO_CLIENT_MOCK };
      if (phorestClientId) {
        const { data } = await supabase
          .from('v_all_clients' as any)
          .select('notes')
          .eq('phorest_client_id', phorestClientId)
          .maybeSingle();
        return data;
      }
      if (clientId) {
        const { data } = await supabase
          .from('clients')
          .select('notes')
          .eq('id', clientId)
          .maybeSingle();
        return data;
      }
      return null;
    },
    enabled: !!(phorestClientId || clientId),
  });

  // Formula history
  const formulaClientId = clientId || phorestClientId || null;
  const { data: formulaHistory } = useClientFormulaHistory(formulaClientId);
  const formulasWithNotes = formulaHistory?.filter(f => f.notes?.trim()) ?? [];

  // Team notes (threaded)
  const { notes: teamNotes, isLoading: teamLoading, addNote, deleteNote, isAdding } = useAppointmentNotes(appointment.id);

  const bookingNotes = appointment.notes?.trim() || null;
  const profileNotes = client?.notes?.trim() || null;
  const profileNotesIsLong = profileNotes ? profileNotes.length > 120 : false;

  const hasAnyContent = bookingNotes || profileNotes || formulasWithNotes.length > 0 || teamNotes.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addNote({ note: newNote.trim() });
    setNewNote('');
  };

  return (
    <div className="px-7 py-4 space-y-5">
      {/* Booking Note (from scheduling) */}
      {bookingNotes && (
        <div>
          <p className={cn(DOCK_CONTENT.sectionHeader, 'mb-2')}>Booking Note</p>
          <div className={cn('flex items-start gap-2.5 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)]', DOCK_CONTENT.cardPadding)}>
            <CalendarPlus className={cn(DOCK_CONTENT.sectionIcon, 'text-violet-400/60 shrink-0 mt-0.5')} />
            <p className={cn(DOCK_CONTENT.bodyMuted, 'leading-relaxed whitespace-pre-wrap')}>
              {bookingNotes}
            </p>
          </div>
        </div>
      )}

      {/* Profile Notes (from client record) */}
      {profileNotes && (
        <div>
          <p className={cn(DOCK_CONTENT.sectionHeader, 'mb-2')}>Profile Notes</p>
          <div className={cn('flex items-start gap-2.5 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)]', DOCK_CONTENT.cardPadding)}>
            <FileText className={cn(DOCK_CONTENT.sectionIcon, 'text-[hsl(var(--platform-foreground-muted)/0.5)] shrink-0 mt-0.5')} />
            <div className="min-w-0 flex-1">
              <p className={cn(
                DOCK_CONTENT.bodyMuted, 'leading-relaxed whitespace-pre-wrap',
                !notesExpanded && profileNotesIsLong && 'line-clamp-2',
              )}>
                {profileNotes}
              </p>
              {profileNotesIsLong && (
                <button
                  onClick={() => setNotesExpanded(!notesExpanded)}
                  className="flex items-center gap-1 mt-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  {notesExpanded ? (
                    <>Show less <ChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>Show more <ChevronDown className="w-3 h-3" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formulation Notes (from formula history) */}
      {formulasWithNotes.length > 0 && (
        <div>
          <p className={cn(DOCK_CONTENT.sectionHeader, 'mb-2')}>Formulation Notes</p>
          <div className="space-y-2">
            {formulasWithNotes.map((formula) => (
              <div
                key={formula.id}
                className={cn('rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)]', DOCK_CONTENT.cardPadding)}
              >
                {/* Date + service row */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-violet-400/60 shrink-0" />
                    <span className={DOCK_CONTENT.body}>
                      {formula.service_name || 'Formula'}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-[hsl(var(--platform-foreground-muted))]">
                    <Clock className="w-3 h-3" />
                    {format(new Date(formula.created_at), 'MMM d, yyyy')}
                  </span>
                </div>

                {/* Stylist */}
                {formula.staff_name && (
                  <p className={cn(DOCK_CONTENT.caption, 'mb-1.5')}>
                    by {formula.staff_name}
                  </p>
                )}

                {/* Note text */}
                <p className={cn(DOCK_CONTENT.bodyMuted, 'leading-relaxed italic')}>
                  {formula.notes}
                </p>

                {/* Ingredient chips */}
                {formula.formula_data.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formula.formula_data.slice(0, 4).map((line, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[11px]"
                      >
                        {line.product_name} · {line.quantity}{line.unit}
                      </span>
                    ))}
                    {formula.formula_data.length > 4 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[hsl(var(--platform-bg-elevated))] text-[hsl(var(--platform-foreground-muted))] text-[11px]">
                        +{formula.formula_data.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Notes (threaded, interactive) */}
      <div>
        <p className={cn(DOCK_CONTENT.sectionHeader, 'mb-2')}>Team Notes</p>

        {/* Add note form */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note…"
            className={cn(DOCK_CONTENT.input, 'flex-1 bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.4)] focus:outline-none focus:ring-1 focus:ring-violet-500/50')}
          />
          <button
            type="submit"
            disabled={!newNote.trim() || isAdding}
            className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className={DOCK_CONTENT.iconBox} />
          </button>
        </form>

        {/* Notes list */}
        {teamNotes.length > 0 ? (
          <div className="space-y-2">
            {teamNotes.map((note) => {
              const authorName = note.author?.display_name || note.author?.full_name || 'Unknown';
              const initials = authorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

              return (
                <div
                  key={note.id}
                  className={cn('flex items-start gap-2.5 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)]', DOCK_CONTENT.cardPadding)}
                >
                  <Avatar className={cn(DOCK_CONTENT.avatar, 'shrink-0 mt-0.5')}>
                    {note.author?.photo_url && <AvatarImage src={note.author.photo_url} />}
                    <AvatarFallback className={cn(DOCK_CONTENT.avatarFallback, 'bg-violet-500/20 text-violet-300')}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn(DOCK_CONTENT.body, 'font-medium')}>
                        {authorName}
                      </span>
                      <span className={DOCK_CONTENT.captionDim}>
                        {format(new Date(note.created_at), 'MMM d, h:mm a')}
                      </span>
                      {note.is_private && (
                        <Lock className="w-3 h-3 text-amber-400/60" />
                      )}
                    </div>
                    <p className={cn(DOCK_CONTENT.bodyMuted, 'leading-relaxed whitespace-pre-wrap')}>
                      {note.note}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="shrink-0 p-1 rounded text-[hsl(var(--platform-foreground-muted)/0.3)] hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-8 text-center">
            <MessageSquare className="w-10 h-10 text-violet-400/20 mb-2" />
            <p className={DOCK_CONTENT.bodyMuted}>
              No team notes yet
            </p>
          </div>
        )}
      </div>

      {/* Global empty state — only if nothing at all */}
      {!hasAnyContent && !teamLoading && (
        <div className="flex flex-col items-center justify-center pt-12 text-center">
          <StickyNote className="w-10 h-10 text-violet-400/20 mb-3" />
          <p className={DOCK_CONTENT.bodyMuted}>
            No notes
          </p>
        </div>
      )}
    </div>
  );
}
