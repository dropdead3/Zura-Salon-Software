import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Clock, User, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LocationSelect } from '@/components/ui/location-select';
import { DRILLDOWN_DIALOG_CONTENT_CLASS, DRILLDOWN_OVERLAY_CLASS } from '@/components/dashboard/drilldownDialogStyles';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { parseISO, format, isValid, parse } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import type { DayForecast, AppointmentSummary } from '@/hooks/useWeekAheadRevenue';

interface DayProviderBreakdownPanelProps {
  day: DayForecast | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StylistGroup {
  name: string;
  revenue: number;
  count: number;
  appointments: AppointmentSummary[];
}

/** Format a time value that could be ISO datetime, HH:mm:ss, or HH:mm */
function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—';
  try {
    // Try ISO datetime first
    const isoDate = parseISO(timeStr);
    if (isValid(isoDate)) return format(isoDate, 'h:mm a');
    // Try bare time HH:mm:ss or HH:mm
    const timeParsed = parse(timeStr, 'HH:mm:ss', new Date());
    if (isValid(timeParsed)) return format(timeParsed, 'h:mm a');
    const timeShort = parse(timeStr, 'HH:mm', new Date());
    if (isValid(timeShort)) return format(timeShort, 'h:mm a');
    return timeStr;
  } catch {
    return timeStr;
  }
}

export function DayProviderBreakdownPanel({ day, open, onOpenChange }: DayProviderBreakdownPanelProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const [expandedStylist, setExpandedStylist] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Filter appointments by location
  const filteredAppointments = useMemo(() => {
    if (!day?.appointments?.length) return [];
    if (selectedLocation === 'all') return day.appointments;
    return day.appointments.filter((apt: any) => apt.location_id === selectedLocation);
  }, [day, selectedLocation]);

  const filteredCount = filteredAppointments.length;

  const groups = useMemo(() => {
    if (!filteredAppointments.length) return [];
    const map: Record<string, StylistGroup> = {};
    filteredAppointments.forEach(apt => {
      const name = apt.stylist_name || 'Unassigned';
      if (!map[name]) map[name] = { name, revenue: 0, count: 0, appointments: [] };
      map[name].revenue += Number(apt.total_price) || 0;
      map[name].count += 1;
      map[name].appointments.push(apt);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredAppointments]);

  const totalRevenue = groups.reduce((sum, g) => sum + g.revenue, 0) || 1;
  const visibleGroups = showAll ? groups : groups.slice(0, 5);
  const needsShowAll = groups.length > 5;

  return (
    <Dialog open={open && !!day} onOpenChange={onOpenChange}>
      <DialogContent className={DRILLDOWN_DIALOG_CONTENT_CLASS} overlayClassName={DRILLDOWN_OVERLAY_CLASS}>
        {day && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <DialogTitle className="text-base font-display">
                    {(() => {
                      try {
                        const parsed = parseISO(day.date);
                        return isValid(parsed) ? formatDate(parsed, 'EEEE, MMM d') : day.dayName || day.date;
                      } catch { return day.dayName || day.date; }
                    })()}
                  </DialogTitle>
                  <DialogDescription className={cn(tokens.body.muted, 'mt-1')}>
                    {filteredCount} appointment{filteredCount !== 1 ? 's' : ''} · By Provider
                  </DialogDescription>
                </div>
                <LocationSelect
                  value={selectedLocation}
                  onValueChange={setSelectedLocation}
                  includeAll={true}
                  allLabel="All Locations"
                  triggerClassName="h-8 w-[170px] text-xs"
                />
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 overflow-auto">
              <div className="px-6 pb-6 space-y-2">
                {groups.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No appointments for this location</p>
                )}
                {visibleGroups.map(group => (
                  <div key={group.name}>
                    <button
                      className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedStylist(prev => prev === group.name ? null : group.name)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <ChevronRight
                            className={cn(
                              'w-3.5 h-3.5 text-muted-foreground transition-transform',
                              expandedStylist === group.name && 'rotate-90'
                            )}
                          />
                          <span className="text-sm font-medium">{group.name}</span>
                          <span className={tokens.body.muted}>
                            {group.count} appointment{group.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <span className="text-sm font-display tabular-nums">
                          {formatCurrencyWhole(group.revenue)}
                        </span>
                      </div>
                      {/* Revenue bar */}
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary/60"
                          initial={{ width: 0 }}
                          animate={{ width: `${(group.revenue / totalRevenue) * 100}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                    </button>

                    {/* Expanded appointments */}
                    <AnimatePresence>
                      {expandedStylist === group.name && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-6 border-l-2 border-primary/20 ml-4 mt-1 mb-2 space-y-1.5">
                            {group.appointments
                              .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                              .map(apt => (
                                <div key={apt.id} className="flex items-center justify-between py-1 text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <span className="text-muted-foreground">
                                      {formatTime(apt.start_time)}
                                    </span>
                                    <span className="font-medium truncate">{apt.service_name || 'Service'}</span>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {apt.client_name || 'Walk-in'}
                                    </span>
                                    <span className="font-display tabular-nums">
                                      {formatCurrencyWhole(Number(apt.total_price) || 0)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {/* Show all toggle */}
                {needsShowAll && (
                  <button
                    onClick={() => setShowAll(prev => !prev)}
                    className="text-xs text-primary hover:underline"
                  >
                    {showAll ? 'Show less' : `Show all ${groups.length} providers`}
                  </button>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
