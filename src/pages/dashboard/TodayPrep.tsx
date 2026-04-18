import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { useTodayPrep, type PrepAppointment } from '@/hooks/useTodayPrep';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Loader2, Sparkles, Star, Clock, User, StickyNote, ShoppingBag, Scissors, CalendarDays, Crown, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, parseISO, isToday, isBefore } from 'date-fns';
import { motion } from 'framer-motion';
import { CLV_TIERS } from '@/lib/clv-calculator';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  // Handle HH:mm:ss or HH:mm format
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m} ${ampm}`;
}

function TierBadge({ tier }: { tier: string }) {
  const config = CLV_TIERS[tier.toLowerCase() as keyof typeof CLV_TIERS];
  if (!config) return null;
  return (
    <Badge 
      variant="outline" 
      className={cn('text-xs font-sans border', config.color, config.bgColor)}
    >
      <Crown className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function PrepCard({ appointment, formatCurrency }: { appointment: PrepAppointment; formatCurrency: (v: number) => string }) {
  const now = new Date();
  const apptTime = appointment.startTime ? new Date(`${appointment.appointmentDate}T${appointment.startTime}`) : null;
  const isUpcoming = apptTime && isBefore(now, apptTime);
  const isActive = apptTime && !isUpcoming && appointment.status !== 'completed';

  const hasNotes = appointment.clientDirectoryNotes.length > 0 || appointment.previousAppointmentNotes.length > 0 || appointment.clientNotes;
  const hasProducts = appointment.recentProducts.length > 0;
  const hasServices = appointment.recentServices.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className={cn(
        'overflow-hidden transition-all',
        isActive && 'ring-2 ring-primary/40',
        appointment.status === 'completed' && 'opacity-60',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col items-center text-center shrink-0">
              <span className="font-display text-sm tracking-wide text-foreground">
                {formatTime(appointment.startTime)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTime(appointment.endTime)}
              </span>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-base tracking-wide text-foreground truncate">
                  {appointment.clientName || 'Walk-in'}
                </h3>
                {appointment.isNewClient && (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                    <Sparkles className="h-3 w-3 mr-1" />
                    New Client
                  </Badge>
                )}
                {appointment.isVip && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                    <Star className="h-3 w-3 mr-1" />
                    VIP
                  </Badge>
                )}
                {appointment.clvTier && <TierBadge tier={appointment.clvTier} />}
              </div>
              <p className="text-sm text-muted-foreground font-sans mt-0.5">
                {appointment.serviceName || appointment.serviceCategory || 'Service'}
                {appointment.totalPrice != null && ` · ${formatCurrency(appointment.totalPrice)}`}
              </p>
            </div>
          </div>
          {isActive && (
            <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0">
              <Clock className="h-3 w-3 mr-1" />
              Now
            </Badge>
          )}
        </div>

        <CardContent className="px-5 py-4 space-y-4">
          {/* Client Stats Row */}
          {!appointment.isNewClient && appointment.visitCount > 0 && (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground font-sans">Visits</p>
                <p className="font-display text-lg tracking-wide text-foreground">{appointment.visitCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">Total Spend</p>
                <p className="font-display text-lg tracking-wide text-foreground">{formatCurrency(appointment.totalSpend)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-sans">Avg Ticket</p>
                <p className="font-display text-lg tracking-wide text-foreground">
                  {appointment.visitCount > 0 ? formatCurrency(appointment.totalSpend / appointment.visitCount) : '—'}
                </p>
              </div>
            </div>
          )}

          {/* Birthday alert */}
          {appointment.birthday && (() => {
            const bday = parseISO(appointment.birthday);
            const todayDate = new Date();
            return bday.getMonth() === todayDate.getMonth() && bday.getDate() === todayDate.getDate();
          })() && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800">
              <span className="text-lg">🎂</span>
              <span className="text-sm font-sans text-amber-800 dark:text-amber-300">
                It&apos;s {appointment.clientName?.split(' ')[0]}&apos;s birthday today
              </span>
            </div>
          )}

          {/* Notes Section */}
          {hasNotes && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-display tracking-wide text-muted-foreground">Notes</span>
              </div>
              
              {/* Inline appointment notes */}
              {appointment.clientNotes && (
                <div className="text-sm font-sans text-foreground bg-muted/40 rounded-md px-3 py-2 border border-border/40">
                  {appointment.clientNotes}
                </div>
              )}

              {/* Client directory notes */}
              {appointment.clientDirectoryNotes.map((n, i) => (
                <div key={`cn-${i}`} className="text-sm font-sans text-foreground bg-muted/40 rounded-md px-3 py-2 border border-border/40">
                  <p>{n.note}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {n.authorName} · {format(parseISO(n.createdAt), 'MMM d')}
                    {n.isPrivate && ' · Private'}
                  </p>
                </div>
              ))}

              {/* Previous appointment notes */}
              {appointment.previousAppointmentNotes.map((n, i) => (
                <div key={`an-${i}`} className="text-sm font-sans text-muted-foreground bg-muted/20 rounded-md px-3 py-2 border border-border/40 italic">
                  <p>{n.note}</p>
                  <p className="text-xs mt-1">
                    {n.authorName} · {format(parseISO(n.createdAt), 'MMM d')} · Appointment note
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Recent Services */}
          {hasServices && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Scissors className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-display tracking-wide text-muted-foreground">Recent Services</span>
              </div>
              <div className="space-y-1">
                {appointment.recentServices.slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm font-sans">
                    <span className="text-foreground truncate">{s.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {format(parseISO(s.date), 'MMM d')}
                      {s.staffName && ` · ${s.staffName}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Products */}
          {hasProducts && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-display tracking-wide text-muted-foreground">Recent Products</span>
              </div>
              <div className="space-y-1">
                {appointment.recentProducts.slice(0, 3).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm font-sans">
                    <span className="text-foreground truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {format(parseISO(p.date), 'MMM d')}
                      {p.quantity > 1 && ` · ×${p.quantity}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New client — minimal info */}
          {appointment.isNewClient && !hasNotes && !hasServices && (
            <div className="flex items-center gap-2 text-sm font-sans text-muted-foreground py-2">
              <User className="h-4 w-4" />
              <span>First visit — no history available yet</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function TodayPrep() {
  const { data: appointments, isLoading } = useTodayPrep();
  const { formatCurrencyWhole } = useFormatCurrency();

  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardLoader fullPage />
      </DashboardLayout>
    );
  }

  const appts = appointments || [];
  const completedCount = appts.filter(a => a.status === 'completed').length;

  return (
    <DashboardLayout>
      <div className="px-4 md:px-8 py-6 md:py-8 max-w-[900px] mx-auto">
        <DashboardPageHeader
          title="Today's Prep"
        />
        <PageExplainer pageId="today-prep" />

        {appts.length === 0 ? (
          <div className={tokens.empty.container}>
            <CalendarDays className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No appointments today</h3>
            <p className={tokens.empty.description}>Your schedule is clear. Enjoy the day.</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-sans text-muted-foreground mb-6">
              {appts.length} appointment{appts.length !== 1 ? 's' : ''} today
              {completedCount > 0 && ` · ${completedCount} completed`}
            </p>
            <div className="space-y-4">
              {appts.map((appt) => (
                <PrepCard
                  key={appt.id}
                  appointment={appt}
                  formatCurrency={formatCurrencyWhole}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
