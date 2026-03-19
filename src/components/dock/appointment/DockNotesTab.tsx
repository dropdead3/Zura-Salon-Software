/**
 * DockNotesTab — View/edit appointment notes.
 */

import { StickyNote } from 'lucide-react';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';

interface DockNotesTabProps {
  appointment: DockAppointment;
}

export function DockNotesTab({ appointment }: DockNotesTabProps) {
  const notes = appointment.notes;

  return (
    <div className="px-5 py-4">
      {notes ? (
        <div className="rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] p-4">
          <p className="text-sm text-[hsl(var(--platform-foreground))] leading-relaxed whitespace-pre-wrap">
            {notes}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center pt-16 text-center">
          <StickyNote className="w-10 h-10 text-violet-400/30 mb-3" />
          <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
            No notes
          </p>
        </div>
      )}
    </div>
  );
}
