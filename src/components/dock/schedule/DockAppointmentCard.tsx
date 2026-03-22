/**
 * DockAppointmentCard — Appointment card with iOS Mail–style swipe-left
 * to reveal a "Finish Appt" action button.
 */

import { useRef, useState } from 'react';
import { FlaskConical, Users, CheckCircle2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { formatTime } from './DockScheduleTab';
import { DOCK_SHEET } from '@/components/dock/dock-ui-tokens';

function formatAssistantLabel(names: string[]): string {
  if (names.length === 1) return `Assisted by ${names[0]}`;
  if (names.length === 2) return `Assisted by ${names[0]} & ${names[1]}`;
  return `Assisted by ${names[0]}, ${names[1]} & ${names.length - 2} more`;
}

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
const OPEN_OFFSET = -128;
const SNAP_THRESHOLD = 50;

export function DockAppointmentCard({ appointment, accentColor, onTap, onComplete, onViewClient }: DockAppointmentCardProps) {
  const borderClass = BORDER_COLORS[accentColor];
  const isTerminal = TERMINAL_STATUSES.includes(appointment.status || '');
  const trayWidth = isTerminal ? 0 : 128;
  const openOffset = isTerminal ? 0 : OPEN_OFFSET;

  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);
  const isDragging = useRef(false);

  // Tray opacity fades in as card slides left
  const trayOpacity = useTransform(x, [0, openOffset / 2, openOffset], [0, 0.6, 1]);
  const contentOpacity = useTransform(x, [0, openOffset], [1, 0.4]);

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
    <div className="relative overflow-hidden rounded-xl" onClick={handleTap}>
      {/* Action tray behind the card */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center pl-2 pr-1 bg-gradient-to-l from-[hsl(var(--platform-bg)/0.8)] to-transparent"
        style={{ width: trayWidth, opacity: trayOpacity }}
      >
        {!isTerminal && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              close();
              onComplete?.(appointment);
            }}
            className="flex flex-col items-center justify-center gap-1 w-[112px] h-full rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 active:bg-emerald-500/25 active:scale-[0.97] transition-all"
            aria-label="Complete appointment"
          >
            <CheckCircle2 className="w-6 h-6" />
            <span className="text-[11px] tracking-wide uppercase font-display text-emerald-400 leading-tight">Finish Appt</span>
          </button>
        )}
      </motion.div>

      {/* Sliding card background — drags left to reveal tray */}
      <motion.div
        drag={isTerminal ? false : 'x'}
        dragConstraints={{ left: openOffset, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        style={{ x }}
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={handleDragEnd}
        className={cn(
          'relative z-10 w-full border-l-[3px] bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] rounded-xl cursor-grab active:cursor-grabbing',
          'touch-pan-y',
          borderClass
        )}
      >
        {/* Mix session indicator — inside sliding layer so it moves with card */}
        {appointment.has_mix_session && (
          <div className="absolute top-5 right-5 z-30 flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600/20">
            <FlaskConical className="w-4 h-4 text-violet-400" />
          </div>
        )}

        {/* Invisible spacer to maintain card height */}
        <div className="p-5 opacity-0 pointer-events-none" aria-hidden="true">
          <div className="flex items-start gap-2">
            <p className="font-medium text-base flex-1 min-w-0 truncate">
              {appointment.client_name || 'Walk-in'}
              <span className="font-normal ml-1.5">· {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}</span>
            </p>
            {appointment.has_mix_session && <div className="w-8 h-8" />}
          </div>
          <div className="mt-1">
            {appointment.service_name && <p className="text-sm truncate">{appointment.service_name}</p>}
            {appointment.assistant_names && appointment.assistant_names.length > 0 && <p className="text-sm mt-0.5">w/ {appointment.assistant_names.join(', ')}</p>}
          </div>
        </div>
      </motion.div>

      {/* Static text overlay — does NOT move */}
      <motion.div style={{ opacity: contentOpacity }} className="absolute inset-0 z-20 p-5 pointer-events-none">
        {/* Top row: client name · time */}
        <div className="flex items-start gap-2">
          <p className="font-medium text-base text-[hsl(var(--platform-foreground))] flex-1 min-w-0 truncate">
            {appointment.client_name || 'Walk-in'}
            <span className="font-normal text-[hsl(var(--platform-foreground-muted))] ml-1.5">
              · {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
            </span>
          </p>
        </div>

        {/* Bottom rows: service + assistant, left-aligned */}
        <div className="mt-1">
          {appointment.service_name && (
            <p className="text-sm text-[hsl(var(--platform-foreground-muted))] truncate">
              {appointment.service_name}
            </p>
          )}
          {appointment.assistant_names && appointment.assistant_names.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <Users className="w-3.5 h-3.5 text-[hsl(var(--platform-foreground-muted)/0.5)]" />
              <span className="text-sm text-[hsl(var(--platform-foreground-muted)/0.8)]">
                w/ {appointment.assistant_names.join(', ')}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
