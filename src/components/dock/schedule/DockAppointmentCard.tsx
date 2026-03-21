/**
 * DockAppointmentCard — Appointment card with colored left border accent.
 * 3-dot kebab opens an inline dropdown menu with contextual actions.
 */

import { useState, useEffect, useRef } from 'react';
import { Clock, FlaskConical, MoreVertical, User, Users, CheckCircle2, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { formatTime } from './DockScheduleTab';

interface DockAppointmentCardProps {
  appointment: DockAppointment;
  accentColor: 'violet' | 'blue' | 'slate';
  onTap?: (appointment: DockAppointment) => void;
  onComplete?: (appointment: DockAppointment) => void;
  onViewClient?: (appointment: DockAppointment) => void;
}

const BORDER_COLORS = {
  violet: 'border-l-violet-500',
  blue: 'border-l-blue-500',
  slate: 'border-l-slate-500',
};

const TERMINAL_STATUSES = ['completed', 'cancelled', 'no_show'];

export function DockAppointmentCard({ appointment, accentColor, onTap, onComplete, onViewClient }: DockAppointmentCardProps) {
  const borderClass = BORDER_COLORS[accentColor];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isTerminal = TERMINAL_STATUSES.includes(appointment.status || '');

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [menuOpen]);

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

          {/* Stylist */}
          {appointment.stylist_name && (
            <div className="flex items-center gap-1 mt-1">
              <User className="w-3 h-3 text-[hsl(var(--platform-foreground-muted)/0.6)]" />
              <span className="text-[11px] text-[hsl(var(--platform-foreground-muted))]">
                {appointment.stylist_name}
              </span>
            </div>
          )}

          {/* Assistants */}
          {appointment.assistant_names && appointment.assistant_names.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3 text-[hsl(var(--platform-foreground-muted)/0.5)]" />
              <span className="text-[11px] text-[hsl(var(--platform-foreground-muted)/0.8)]">
                w/ {appointment.assistant_names.join(', ')}
              </span>
            </div>
          )}

          {/* Time */}
          <div className="flex items-center gap-1.5 mt-1.5">
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

          {/* Kebab menu — inline positioned, no portal */}
          <div className="relative" ref={menuRef}>
            <div
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
              className="p-1 rounded-lg hover:bg-[hsl(var(--platform-bg-hover))] text-[hsl(var(--platform-foreground-muted)/0.4)] hover:text-[hsl(var(--platform-foreground-muted))] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </div>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-50 w-52 p-1.5 rounded-xl bg-[hsl(var(--platform-bg-elevated))] border border-[hsl(var(--platform-border)/0.3)] shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Complete Appointment */}
                {!isTerminal && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onComplete?.(appointment);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-[hsl(var(--platform-foreground))] hover:bg-violet-500/10 hover:text-violet-400 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Appointment</span>
                  </button>
                )}

                {/* View Client Profile */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onViewClient?.(appointment);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-[hsl(var(--platform-foreground))] hover:bg-violet-500/10 hover:text-violet-400 transition-colors"
                >
                  <UserCircle className="w-4 h-4" />
                  <span>View Client Profile</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
