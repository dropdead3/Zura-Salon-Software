/**
 * DockAppointmentCard — Appointment card with iOS Mail–style swipe-left
 * to reveal "Complete" and "View Client" action buttons.
 */

import { useRef, useState } from 'react';
import { Clock, FlaskConical, User, Users, CheckCircle2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { formatTime } from './DockScheduleTab';
import { DOCK_SHEET } from '@/components/dock/dock-ui-tokens';

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
const OPEN_OFFSET = -88;
const SNAP_THRESHOLD = 50;

export function DockAppointmentCard({ appointment, accentColor, onTap, onComplete, onViewClient }: DockAppointmentCardProps) {
  const borderClass = BORDER_COLORS[accentColor];
  const isTerminal = TERMINAL_STATUSES.includes(appointment.status || '');
  const canDrag = !isTerminal;
  const trayWidth = isTerminal ? 0 : 88;
  const openOffset = isTerminal ? 0 : OPEN_OFFSET;

  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);
  const isDragging = useRef(false);

  // Tray opacity fades in as card slides left
  const trayOpacity = useTransform(x, [0, openOffset / 2, openOffset], [0, 0.6, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -SNAP_THRESHOLD || velocity < -300) {
      animate(x, openOffset, { ...DOCK_SHEET.spring });
      setIsOpen(true);
    } else {
      animate(x, 0, { ...DOCK_SHEET.spring });
      setIsOpen(false);
    }
    // Small delay so the tap handler can check isDragging
    setTimeout(() => { isDragging.current = false; }, 50);
  };

  const close = () => {
    animate(x, 0, { ...DOCK_SHEET.spring });
    setIsOpen(false);
  };

  const handleTap = () => {
    if (isDragging.current) return;
    if (isOpen) {
      close();
      return;
    }
    onTap?.(appointment);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Action tray behind the card */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center gap-2 px-2.5 bg-gradient-to-l from-[hsl(var(--platform-bg)/0.8)] to-transparent"
        style={{ width: trayWidth, opacity: trayOpacity }}
      >
        {!isTerminal && (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                close();
                onComplete?.(appointment);
              }}
              className="flex items-center justify-center w-11 h-11 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 active:bg-emerald-500/25 active:scale-95 transition-all"
              aria-label="Complete appointment"
            >
              <CheckCircle2 className="w-[18px] h-[18px]" />
            </button>
            <span className="text-[8px] tracking-wide uppercase font-display text-emerald-400">Finish Appt</span>
          </div>
        )}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              close();
              onViewClient?.(appointment);
            }}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-400 active:bg-violet-500/25 active:scale-95 transition-all"
            aria-label="View client"
          >
            <UserCircle className="w-[18px] h-[18px]" />
          </button>
          <span className="text-[8px] tracking-wide uppercase font-display text-violet-400">Client Info</span>
        </div>
      </motion.div>

      {/* Swipeable card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: openOffset, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        style={{ x }}
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={handleDragEnd}
        onClick={handleTap}
        className={cn(
          'relative z-10 w-full text-left border-l-[3px] bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] p-4 rounded-xl cursor-grab active:cursor-grabbing',
          'touch-pan-y',
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
          </div>
        </div>
      </motion.div>
    </div>
  );
}
