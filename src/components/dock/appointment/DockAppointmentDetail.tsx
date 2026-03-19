/**
 * DockAppointmentDetail — Full-screen appointment view with Services/Notes/Summary tabs.
 */

import { useState } from 'react';
import { ArrowLeft, FlaskConical, StickyNote, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DockStaffSession } from '@/pages/Dock';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { formatTime } from '../schedule/DockScheduleTab';
import { DockServicesTab } from './DockServicesTab';
import { DockNotesTab } from './DockNotesTab';
import { DockSummaryTab } from './DockSummaryTab';

type DetailTab = 'services' | 'notes' | 'summary';

interface DockAppointmentDetailProps {
  appointment: DockAppointment;
  staff: DockStaffSession;
  onBack: () => void;
}

const TABS: { id: DetailTab; label: string; icon: typeof FlaskConical }[] = [
  { id: 'services', label: 'Services', icon: FlaskConical },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'summary', label: 'Summary', icon: Receipt },
];

export function DockAppointmentDetail({ appointment, staff, onBack }: DockAppointmentDetailProps) {
  const [tab, setTab] = useState<DetailTab>('services');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-6 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))] truncate">
              {appointment.client_name || 'Walk-in'}
            </h1>
            <p className="text-xs text-[hsl(var(--platform-foreground-muted))] mt-0.5">
              {appointment.service_name && <span>{appointment.service_name} · </span>}
              {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-[hsl(var(--platform-bg-card))] rounded-xl p-1 border border-[hsl(var(--platform-border)/0.2)]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center justify-center gap-1.5 flex-1 h-9 rounded-lg text-xs font-medium transition-all duration-150',
                tab === id
                  ? 'bg-violet-600/30 text-violet-300'
                  : 'text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'services' && <DockServicesTab appointment={appointment} staff={staff} />}
        {tab === 'notes' && <DockNotesTab appointment={appointment} />}
        {tab === 'summary' && <DockSummaryTab appointment={appointment} staff={staff} />}
      </div>
    </div>
  );
}
