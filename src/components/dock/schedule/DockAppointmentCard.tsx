/**
 * DockAppointmentCard — Appointment card with iOS Mail–style swipe-left
 * to reveal action buttons (Finish for active, Cancel/No-Show/Start for scheduled).
 *
 * 4-layer architecture:
 *   Layer 0: Invisible sizing shell (normal flow, sets card height)
 *   Layer 1: Action tray (absolute, behind everything)
 *   Layer 2: Sliding background shell (absolute z-10, drags left)
 *   Layer 3: Stationary content overlay (absolute z-20, dims only)
 */

import { useRef, useState } from 'react';
import { Users, CheckCircle2, Play, XCircle, UserX, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { differenceInMinutes, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { DockAppointment } from '@/hooks/dock/useDockAppointments';
import { formatTime } from './DockScheduleTab';
import { formatMinutesToDuration } from '@/lib/formatDuration';
import { DOCK_SHEET, DOCK_BADGE } from '@/components/dock/dock-ui-tokens';

function formatAssistantLabel(names: string[]): string {
  if (names.length === 1) return `Assisted by ${names[0]}`;
  if (names.length === 2) return `Assisted by ${names[0]} & ${names[1]}`;
  return `Assisted by ${names[0]}, ${names[1]} & ${names.length - 2} more`;
}

interface DockAppointmentCardProps {
  appointment: DockAppointment;
  accentColor: 'violet' | 'blue' | 'slate' | 'amber' | 'red';
  isChemical?: boolean;
  isRetrying?: boolean;
  onTap?: (appointment: DockAppointment) => void;
  onComplete?: (appointment: DockAppointment) => void;
  onStart?: (appointment: DockAppointment) => void;
  onCancel?: (appointment: DockAppointment) => void;
  onNoShow?: (appointment: DockAppointment) => void;
  onViewClient?: (appointment: DockAppointment) => void;
  onRetryCharge?: (appointment: DockAppointment) => void;
}

const BORDER_COLORS: Record<string, string> = {
  violet: 'border-l-violet-500',
  blue: 'border-l-blue-500',
  slate: 'border-l-slate-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
};

const STATUS_BADGE: Record<string, { label: string; variant: string }> = {
  no_show: { label: 'No Show', variant: DOCK_BADGE.noShow },
  cancelled: { label: 'Cancelled', variant: DOCK_BADGE.cancelled },
};

const PAYMENT_BADGE: Record<string, { label: string; variant: string }> = {
  paid: { label: 'Paid', variant: DOCK_BADGE.paid },
  unpaid: { label: 'Unpaid', variant: DOCK_BADGE.unpaid },
  failed: { label: 'Failed', variant: DOCK_BADGE.failed },
  refunded: { label: 'Refunded', variant: DOCK_BADGE.refunded },
  partially_refunded: { label: 'Partial Refund', variant: DOCK_BADGE.partiallyRefunded },
  comp: { label: 'Waived', variant: DOCK_BADGE.comp },
};

const TERMINAL_STATUSES = ['completed', 'cancelled', 'no_show'];
const ACTIVE_STATUSES = ['checked_in', 'in_progress'];
const ACTIVE_OPEN_OFFSET = -160;
const SCHEDULED_OPEN_OFFSET = -400;
const SNAP_THRESHOLD = 50;

export function DockAppointmentCard({ appointment, accentColor, isChemical = true, isRetrying = false, onTap, onComplete, onStart, onCancel, onNoShow, onViewClient, onRetryCharge }: DockAppointmentCardProps) {
  const borderClass = isChemical ? BORDER_COLORS[accentColor] : 'border-l-[hsl(var(--platform-foreground-muted)/0.3)]';
  const isTerminal = TERMINAL_STATUSES.includes(appointment.status || '');
  const isActive = ACTIVE_STATUSES.includes(appointment.status || '');
  const isScheduled = !isTerminal && !isActive;
  const canSwipe = !isTerminal;

  // Compute duration
  const refDate = new Date();
  const start = parse(appointment.start_time, 'HH:mm:ss', refDate);
  const end = parse(appointment.end_time, 'HH:mm:ss', refDate);
  const durationMinutes = differenceInMinutes(end, start);
  const durationText = durationMinutes > 0 ? formatMinutesToDuration(durationMinutes) : '';

  const openOffset = canSwipe ? (isScheduled ? SCHEDULED_OPEN_OFFSET : ACTIVE_OPEN_OFFSET) : 0;
  const trayWidth = canSwipe ? Math.abs(openOffset) : 0;

  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);
  const isDragging = useRef(false);

  // Tray opacity fades in as card slides left
  const trayOpacity = useTransform(x, [0, openOffset / 2, openOffset], [0, 0.6, 1]);
  // Content dims as card slides open
  const contentOpacity = useTransform(x, [openOffset, 0], [0.4, 1]);
  const contentClipRight = useTransform(x, (v) => `${Math.abs(v)}px`);

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

  /* ---- Shared content block (rendered invisible for sizing + visible for display) ---- */
  const cardContent = (visible: boolean) => (
    <div className="relative">
      {/* Badges pinned to top-right corner */}
      {visible && (
        <div className="absolute top-0 right-0 z-10 flex items-center gap-1.5">
          {STATUS_BADGE[appointment.status || ''] && (
            <span className={cn(DOCK_BADGE.base, STATUS_BADGE[appointment.status || ''].variant)}>
              {STATUS_BADGE[appointment.status || ''].label}
            </span>
          )}
          {/* Payment failed badge — shown for ALL statuses so staff see it early */}
          {appointment.payment_status === 'failed' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(DOCK_BADGE.base, DOCK_BADGE.failed, 'inline-flex items-center gap-1 cursor-help')}>
                  Failed
                  <AlertCircle className="w-3 h-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                {appointment.payment_failure_reason || 'Payment failed — no details available'}
              </TooltipContent>
            </Tooltip>
          )}
          {/* Retry button — only when failed + card on file */}
          {appointment.payment_status === 'failed' && appointment.has_card_on_file && onRetryCharge && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetryCharge(appointment);
              }}
              disabled={isRetrying}
              className={cn(DOCK_BADGE.base, DOCK_BADGE.retryAction, 'inline-flex items-center gap-1 pointer-events-auto')}
            >
              {isRetrying ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Retry
            </button>
          )}
          {/* Payment badge for completed appointments (non-failed) */}
          {appointment.status === 'completed' && appointment.payment_status !== 'failed' && PAYMENT_BADGE[appointment.payment_status || ''] && (
            <span className={cn(DOCK_BADGE.base, PAYMENT_BADGE[appointment.payment_status || ''].variant)}>
              {PAYMENT_BADGE[appointment.payment_status || ''].label}
            </span>
          )}
        </div>
      )}

      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {(() => {
            const services = (appointment.service_name || '').split(' + ').filter(Boolean);
            let serviceDisplay = '';
            if (services.length === 1) {
              serviceDisplay = services[0];
            } else if (services.length === 2) {
              serviceDisplay = services.join(' + ');
            } else if (services.length > 2) {
              serviceDisplay = `${services[0]} + ${services[1]} +${services.length - 2} more`;
            }
            return (
              <p className={cn('text-lg truncate', visible ? 'font-medium text-[hsl(var(--platform-foreground))]' : '')}>
                {appointment.client_name || 'Walk-in'}
                {serviceDisplay && (
                  <span className={cn('font-normal', visible ? 'text-[hsl(var(--platform-foreground-muted))]' : '')}>
                    {' · '}{serviceDisplay}
                  </span>
                )}
              </p>
            );
          })()}
        </div>
        {(appointment.mix_bowl_count ?? 0) > 0 && !isTerminal && <div className="w-28 h-6 shrink-0" />}
      </div>

      <div className="mt-0.5">
        <p className={cn(
          'text-base',
          visible ? 'text-[hsl(var(--platform-foreground-muted))]' : ''
        )}>
          {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}{durationText && ` · ${durationText}`}
        </p>
        {appointment.assistant_names && appointment.assistant_names.length > 0 && (
          <div className="flex items-start mt-1 ml-1">
            <div className={cn(
              'w-3 h-4 shrink-0 mr-1.5',
              visible ? 'border-l border-b border-[hsl(var(--platform-foreground-muted)/0.25)] rounded-bl-sm' : ''
            )} />
            <div className="flex items-center gap-1 pt-1">
              <Users className={cn(
                'w-4 h-4 shrink-0',
                visible ? 'text-[hsl(var(--platform-foreground-muted)/0.5)]' : ''
              )} />
              <span className={cn(
                'text-base',
                visible ? 'text-[hsl(var(--platform-foreground-muted)/0.8)]' : ''
              )}>
                {formatAssistantLabel(appointment.assistant_names)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative z-[1] overflow-hidden rounded-xl" onClick={handleTap}>
      {/* Layer 0: Invisible sizing shell — in normal flow, sets card height */}
      <div className="p-6 invisible" aria-hidden="true">
        {cardContent(false)}
      </div>

      {/* Layer 1: Action tray — behind everything */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center pl-3 pr-3 bg-gradient-to-l from-[hsl(var(--platform-bg)/0.8)] to-transparent"
        style={{ width: trayWidth, opacity: trayOpacity }}
      >
        {canSwipe && isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              close();
              onComplete?.(appointment);
            }}
            className="flex flex-col items-center justify-center gap-1 w-[144px] px-2 h-full rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 active:bg-emerald-500/25 active:scale-[0.97] transition-all"
            aria-label="Complete appointment"
          >
            <CheckCircle2 className="w-6 h-6" />
            <span className="text-[11px] tracking-wide uppercase font-display text-emerald-400 leading-tight">Finish Appt</span>
          </button>
        )}
        {canSwipe && isScheduled && (
          <div className="flex h-full gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                close();
                onCancel?.(appointment);
              }}
              className="flex flex-col items-center justify-center gap-1 w-[120px] px-2 h-full rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 active:bg-red-500/25 active:scale-[0.97] transition-all"
              aria-label="Cancel appointment"
            >
              <XCircle className="w-6 h-6" />
              <span className="text-[11px] tracking-wide uppercase font-display text-red-400 leading-tight">Cancel</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                close();
                onNoShow?.(appointment);
              }}
              className="flex flex-col items-center justify-center gap-1 w-[120px] px-2 h-full rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 active:bg-amber-500/25 active:scale-[0.97] transition-all"
              aria-label="Mark as no show"
            >
              <UserX className="w-6 h-6" />
              <span className="text-[11px] tracking-wide uppercase font-display text-amber-400 leading-tight">No Show</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                close();
                onStart?.(appointment);
              }}
              className="flex flex-col items-center justify-center gap-1 w-[120px] px-2 h-full rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 active:bg-blue-500/25 active:scale-[0.97] transition-all"
              aria-label="Start appointment"
            >
              <Play className="w-6 h-6" />
              <span className="text-[11px] tracking-wide uppercase font-display text-blue-400 leading-tight">Start Appt</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* Layer 2: Sliding background shell — absolute, drags left (z-10) */}
      <motion.div
        drag={canSwipe ? 'x' : false}
        dragConstraints={{ left: openOffset, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        style={{ x }}
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={handleDragEnd}
        className={cn(
          'absolute inset-0 z-10 border-l-[3px] border border-[hsl(var(--platform-border)/0.3)] rounded-xl cursor-grab active:cursor-grabbing',
          'touch-pan-y',
          isChemical ? 'bg-[hsl(var(--platform-bg-card))]' : 'bg-[hsl(var(--platform-bg-card)/0.7)]',
          borderClass
        )}
      >
        {/* Bowl count badge anchored to sliding layer */}
        {isActive && !isTerminal && (
          <div className={cn(
            "absolute top-5 right-5 py-1",
            DOCK_BADGE.base,
            !isChemical
              ? DOCK_BADGE.noChemical
              : (appointment.mix_bowl_count ?? 0) > 0
                ? DOCK_BADGE.bowlsMixed
                : DOCK_BADGE.noBowlsMixed
          )}>
            {!isChemical
              ? 'No color/chemical services'
              : (appointment.mix_bowl_count ?? 0) === 0
                ? 'No bowls mixed'
                : `${appointment.mix_bowl_count} bowl${appointment.mix_bowl_count === 1 ? '' : 's'} mixed`}
          </div>
        )}
        {!isActive && !isTerminal && isChemical && (appointment.mix_bowl_count ?? 0) > 0 && (
          <div className={cn("absolute top-5 right-5 py-1", DOCK_BADGE.base, DOCK_BADGE.bowlsMixed)}>
            {`${appointment.mix_bowl_count} bowl${appointment.mix_bowl_count === 1 ? '' : 's'} mixed`}
          </div>
        )}
      </motion.div>

      {/* Layer 3: Static content overlay — stays in place, dims on swipe (z-20) */}
      <motion.div
        className="absolute top-0 bottom-0 left-0 z-20 pointer-events-none p-6 overflow-hidden"
        style={{ opacity: contentOpacity, right: contentClipRight }}
      >
        {cardContent(true)}
      </motion.div>
    </div>
  );
}
