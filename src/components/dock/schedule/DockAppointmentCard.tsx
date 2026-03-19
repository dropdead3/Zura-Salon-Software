/**
 * DockAppointmentCard — Appointment card with colored left border accent.
 */

import { Clock, FlaskConical, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { formatTime } from './DockScheduleTab';

interface DockAppointmentCardProps {
  appointment: DockAppointment;
  accentColor: 'violet' | 'blue' | 'slate';
  onTap?: (appointment: DockAppointment) => void;
}

const BORDER_COLORS = {
  violet: 'border-l-violet-500',
  blue: 'border-l-blue-500',
  slate: 'border-l-slate-500',
};

export function DockAppointmentCard({ appointment, accentColor, onTap }: DockAppointmentCardProps) {
  const borderClass = BORDER_COLORS[accentColor];

  return (
    <button
      onClick={() => onTap?.(appointment)}
      className={cn(
        'w-full text-left rounded-xl border-l-[3px] bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] p-4 transition-all duration-150',
        'hover:bg-[hsl(var(--platform-bg-hover))] hover:border-[hsl(var(--platform-border)/0.5)]',
        'active:scale-[0.99]',
        borderClass
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Client name */}
          <p className="font-medium text-sm text-[hsl(var(--platform-foreground))] truncate">
            {appointment.client_name || 'Walk-in'}
          </p>

          {/* Service */}
          {appointment.service_name && (
            <p className="text-xs text-[hsl(var(--platform-foreground-muted))] mt-0.5 truncate">
              {appointment.service_name}
            </p>
          )}

          {/* Time */}
          <div className="flex items-center gap-1.5 mt-2">
            <Clock className="w-3 h-3 text-[hsl(var(--platform-foreground-muted)/0.6)]" />
            <span className="text-[11px] text-[hsl(var(--platform-foreground-muted))]">
              {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mix session indicator */}
          {appointment.has_mix_session && (
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600/20">
              <FlaskConical className="w-3.5 h-3.5 text-violet-400" />
            </div>
          )}

          {/* Kebab */}
          <div className="text-[hsl(var(--platform-foreground-muted)/0.4)]">
            <MoreVertical className="w-4 h-4" />
          </div>
        </div>
      </div>
    </button>
  );
}
