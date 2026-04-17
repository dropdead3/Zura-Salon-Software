import { tokens, APPOINTMENT_STATUS_BADGE } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, ChevronRight, UserPlus, Phone, Star, StickyNote, CalendarDays, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { VisibilityGate } from '@/components/visibility';
import { useTodayPrep } from '@/hooks/useTodayPrep';
import { CLV_TIERS, type CLVTier } from '@/lib/clv-calculator';
import { useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useAuth } from '@/contexts/AuthContext';
import { useStylistRebookRate } from '@/hooks/useStylistRebookRate';

/** Material gap (percentage points) below org average that triggers coaching nudge. */
const REBOOK_COACHING_GAP_PP = 15;


const NEEDS_CONFIRM = new Set(['booked', 'pending']);

function formatTime(time: string | null): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

const TIER_KEY_MAP: Record<string, CLVTier> = {
  Platinum: 'platinum',
  Gold: 'gold',
  Silver: 'silver',
  Bronze: 'bronze',
};

function isBirthdayToday(birthday: string | null): boolean {
  if (!birthday) return false;
  const today = format(new Date(), 'MM-dd');
  // birthday could be YYYY-MM-DD or MM-DD
  const bday = birthday.length > 5 ? birthday.slice(5) : birthday;
  return bday === today;
}

type TemporalTag = 'now' | 'next' | null;

function getTemporalTags(appointments: { startTime: string; endTime: string; status: string | null }[]): Map<number, TemporalTag> {
  const tags = new Map<number, TemporalTag>();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let foundNext = false;

  for (let i = 0; i < appointments.length; i++) {
    const appt = appointments[i];
    if (appt.status === 'completed' || appt.status === 'checked_in') continue;

    const [sh, sm] = (appt.startTime || '').split(':').map(Number);
    const [eh, em] = (appt.endTime || '').split(':').map(Number);
    const startMin = (sh || 0) * 60 + (sm || 0);
    const endMin = (eh || 0) * 60 + (em || 0);

    if (nowMinutes >= startMin && nowMinutes < endMin) {
      tags.set(i, 'now');
    } else if (!foundNext && nowMinutes < startMin) {
      tags.set(i, 'next');
      foundNext = true;
    }
  }

  return tags;
}

function hasNotes(appt: { clientDirectoryNotes: any[]; previousAppointmentNotes: any[]; clientNotes: string | null }): boolean {
  return (appt.clientDirectoryNotes?.length > 0) || (appt.previousAppointmentNotes?.length > 0) || !!appt.clientNotes;
}

export function TodaysPrepSection() {
  const { dashPath } = useOrgDashboardPath();
  const { data: appointments, isLoading } = useTodayPrep();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { user } = useAuth();

  // Coaching nudge — 30-day rebook rate vs org. Hook returns null if sample <10
  // (visibility contract). Nudge surfaces only on material gap (>15pp lag).
  const dateFrom = useMemo(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'), []);
  const dateTo = today;
  const { data: rebookSignal } = useStylistRebookRate(user?.id, dateFrom, dateTo);
  const showRebookNudge =
    rebookSignal !== null &&
    rebookSignal !== undefined &&
    rebookSignal.deltaVsOrg <= -REBOOK_COACHING_GAP_PP;

  const temporalTags = useMemo(() => {
    if (!appointments) return new Map<number, TemporalTag>();
    return getTemporalTags(appointments);
  }, [appointments]);

  const confirmCount = useMemo(() => {
    if (!appointments) return 0;
    return appointments.filter(a => NEEDS_CONFIRM.has(a.status || '')).length;
  }, [appointments]);

  return (
    <VisibilityGate
      elementKey="todays_prep"
      elementName="Today's Prep"
      elementCategory="Dashboard Home"
    >
      <Card className="rounded-xl">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className={tokens.card.iconBox}>
            <ClipboardCheck className={tokens.card.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className={tokens.card.title}>TODAY'S PREP</CardTitle>
            {appointments && appointments.length > 0 && (
              <CardDescription className="font-sans text-xs text-muted-foreground">
                {appointments.length} today{confirmCount > 0 ? ` · ${confirmCount} to confirm` : ''}
              </CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Coaching nudge — surfaces only on material rebook gap (>15pp lag, ≥10 sample) */}
          {showRebookNudge && rebookSignal && (
            <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 p-3">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm text-foreground leading-snug">
                  Your rebook rate is{' '}
                  <span className="font-medium">{rebookSignal.rebookRate.toFixed(0)}%</span>
                  {' '}— team average is{' '}
                  <span className="font-medium">{rebookSignal.orgRebookRate.toFixed(0)}%</span>.
                </p>
                <p className="font-sans text-xs text-muted-foreground mt-0.5">
                  Try the new commitment script at checkout: <span className="italic">"I'd like to see you back in X weeks. How does [date] at [time] work?"</span>
                </p>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : !appointments || appointments.length === 0 ? (
            <div className={tokens.empty.container}>
              <ClipboardCheck className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No appointments today</h3>
              <p className={tokens.empty.description}>Enjoy your day off</p>
            </div>
          ) : (
            <div className="space-y-1">
              {appointments.slice(0, 5).map((appt, idx) => {
                const tierKey = appt.clvTier ? TIER_KEY_MAP[appt.clvTier] : null;
                const tierConfig = tierKey ? CLV_TIERS[tierKey] : null;
                const tag = temporalTags.get(idx);
                const isCompleted = appt.status === 'completed';
                const birthdayToday = isBirthdayToday(appt.birthday);
                const notesExist = hasNotes(appt);

                return (
                  <div
                    key={appt.id}
                    onClick={() => navigate(dashPath('/schedule'), { state: { focusDate: today, focusAppointmentId: appt.id } })}
                    className={cn(
                      'flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group',
                      tag === 'now' && 'border-l-2 border-primary bg-primary/5',
                      tag === 'next' && 'border-l-2 border-accent',
                      isCompleted && 'opacity-50'
                    )}
                  >
                    {/* Time */}
                    <span className="font-display text-xs tracking-wide text-muted-foreground w-[72px] shrink-0">
                      {formatTime(appt.startTime)}
                    </span>

                    {/* Status badge */}
                    {(() => {
                      const statusKey = (appt.status || 'booked') as keyof typeof APPOINTMENT_STATUS_BADGE;
                      const statusConfig = APPOINTMENT_STATUS_BADGE[statusKey] || APPOINTMENT_STATUS_BADGE.booked;
                      return (
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full border font-sans whitespace-nowrap shrink-0',
                            statusConfig.bg,
                            statusConfig.text,
                            statusConfig.border
                          )}
                        >
                          {statusConfig.label}
                        </span>
                      );
                    })()}

                    {/* Client name + indicators */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-sans text-sm truncate">
                          {appt.clientName || 'Walk-in'}
                        </span>
                        {appt.isNewClient && (
                          <UserPlus className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                        {appt.isVip && (
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        {birthdayToday && (
                          <span className="text-xs shrink-0" title="Birthday today!">🎂</span>
                        )}
                        {notesExist && (
                          <StickyNote className="w-3 h-3 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      {appt.serviceName && (
                        <p className="font-sans text-[11px] text-muted-foreground truncate">
                          {appt.serviceName}
                        </p>
                      )}
                    </div>

                    {/* CLV tier badge */}
                    {tierConfig && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0 h-5 font-sans',
                          tierConfig.bgColor,
                          tierConfig.color,
                          'border-transparent'
                        )}
                      >
                        {tierConfig.label}
                      </Badge>
                    )}

                    {/* Action prompt, visit count, or schedule icon */}
                    {NEEDS_CONFIRM.has(appt.status || '') ? (
                      <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-sans whitespace-nowrap shrink-0">
                        <Phone className="w-3 h-3" />
                        Confirm
                      </span>
                    ) : appt.visitCount > 0 ? (
                      <span className="text-xs text-muted-foreground font-sans whitespace-nowrap shrink-0">
                        {appt.visitCount} visits
                      </span>
                    ) : null}
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-primary transition-colors shrink-0" />
                  </div>
                );
              })}

              {appointments.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{appointments.length - 5} more
                </p>
              )}
            </div>
          )}

          {/* Footer link */}
          <div className="pt-3 border-t border-border/50 mt-3">
            <Button
              variant="ghost"
              size={tokens.button.card}
              className={tokens.button.cardFooter}
              asChild
            >
              <Link to={dashPath('/today-prep')}>
                View Full Prep <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </VisibilityGate>
  );
}
