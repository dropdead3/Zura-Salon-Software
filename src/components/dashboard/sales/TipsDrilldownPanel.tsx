import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, User, DollarSign, ChevronRight, ChevronDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useTipsDrilldown, type StylistTipMetrics, type RawTipAppointment, type ClientMap } from '@/hooks/useTipsDrilldown';
import { format, parseISO } from 'date-fns';
import { useActiveLocations } from '@/hooks/useLocations';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface TipsDrilldownPanelProps {
  isOpen: boolean;
  parentLocationId?: string;
  dateFrom: string;
  dateTo: string;
}

export function TipsDrilldownPanel({ isOpen, parentLocationId, dateFrom, dateTo }: TipsDrilldownPanelProps) {
  const [regionFilter, setRegionFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState(parentLocationId || 'all');
  const [showAll, setShowAll] = useState(false);
  const [showAllTotalTips, setShowAllTotalTips] = useState(false);
  const [expandedStylist, setExpandedStylist] = useState<string | null>(null);

  const { data: locations } = useActiveLocations();
  const { effectiveOrganization } = useOrganizationContext();
  const { user, roles } = useAuth();
  const { formatCurrency, formatCurrencyWhole } = useFormatCurrency();

  const isMultiLocation = effectiveOrganization?.is_multi_location ?? false;
  const isLeadership = roles.includes('admin') || roles.includes('super_admin') || roles.includes('manager');

  // Derive regions from locations — only for multi-location orgs
  const availableRegions = useMemo(() => {
    if (!isMultiLocation || !locations) return [];
    const regions = new Set<string>();
    locations.forEach(loc => {
      const region = loc.state_province || loc.city?.split(',')[1]?.trim().split(' ')[0] || '';
      if (region) regions.add(region);
    });
    return Array.from(regions).sort();
  }, [locations, isMultiLocation]);

  // Build location→region map
  const locationRegionMap = useMemo(() => {
    const map: Record<string, string> = {};
    locations?.forEach(loc => {
      map[loc.id] = loc.state_province || loc.city?.split(',')[1]?.trim().split(' ')[0] || '';
    });
    return map;
  }, [locations]);

  // Filter locations by region
  const filteredLocations = useMemo(() => {
    if (!isMultiLocation || !locations) return [];
    if (regionFilter === 'all') return locations;
    return locations.filter(loc => locationRegionMap[loc.id] === regionFilter);
  }, [locations, regionFilter, locationRegionMap, isMultiLocation]);

  // Reset location when region changes
  const effectiveLocationId = useMemo(() => {
    if (locationFilter !== 'all' && regionFilter !== 'all') {
      const locRegion = locationRegionMap[locationFilter];
      if (locRegion !== regionFilter) return 'all';
    }
    return locationFilter;
  }, [locationFilter, regionFilter, locationRegionMap]);

  const { byStylist, byTotalTips, rawAppointments, clientMap, isLoading } = useTipsDrilldown({
    dateFrom,
    dateTo,
    locationId: effectiveLocationId !== 'all' ? effectiveLocationId : undefined,
  });

  // For non-leadership roles, filter to only show the current user's data
  const selfStylist = useMemo(() => {
    if (isLeadership || !user?.id) return null;
    return byStylist.find(s => s.stylistUserId === user.id) ?? null;
  }, [byStylist, isLeadership, user?.id]);

  // Filter stylists by region if location not set (leadership only)
  const filteredStylists = useMemo(() => {
    if (!isLeadership) return [];
    if (regionFilter === 'all' || effectiveLocationId !== 'all') return byStylist;
    const regionLocationIds = new Set(filteredLocations.map(l => l.id));
    return byStylist.filter(s => s.locationId && regionLocationIds.has(s.locationId));
  }, [byStylist, regionFilter, effectiveLocationId, filteredLocations, isLeadership]);

  // Filter byTotalTips the same way
  const filteredTotalTips = useMemo(() => {
    if (!isLeadership) return [];
    if (regionFilter === 'all' || effectiveLocationId !== 'all') return byTotalTips;
    const regionLocationIds = new Set(filteredLocations.map(l => l.id));
    return byTotalTips.filter(s => s.locationId && regionLocationIds.has(s.locationId));
  }, [byTotalTips, regionFilter, effectiveLocationId, filteredLocations, isLeadership]);

  // Find the current user's rank within filtered list (for self-view context)
  const selfRank = useMemo(() => {
    if (!user?.id) return null;
    const idx = byStylist.findIndex(s => s.stylistUserId === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [byStylist, user?.id]);

  const topEarners = showAll ? filteredStylists : filteredStylists.slice(0, 10);
  const coachingOpportunities = filteredStylists.slice(-5).reverse().filter(s => s.avgTip < (filteredStylists[0]?.avgTip ?? 0));


  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="pt-4 pb-2 space-y-4 border-t border-border/30 mt-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">

              {/* Region/Location filters — only for multi-location orgs with leadership roles */}
              {isMultiLocation && isLeadership && availableRegions.length > 1 && (
                <Select value={regionFilter} onValueChange={(v) => { setRegionFilter(v); if (v !== regionFilter) setLocationFilter('all'); }}>
                  <SelectTrigger className="h-7 w-[130px] text-xs rounded-full">
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {availableRegions.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {isMultiLocation && isLeadership && filteredLocations.length > 1 && (
                <Select value={effectiveLocationId} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-7 w-[150px] text-xs rounded-full">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {filteredLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ) : !isLeadership ? (
              /* ── Stylist Self-View ── */
              selfStylist ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs tracking-wide uppercase text-muted-foreground font-medium">
                      Your Tip Performance
                    </span>
                    {selfRank && (
                      <span className="text-xs text-muted-foreground">
                        · Ranked #{selfRank} of {byStylist.length}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <SelfMetricCard label="Avg Tip" value={formatCurrency(selfStylist.avgTip)} />
                    <SelfMetricCard label="Tip %" value={`${selfStylist.tipPercentage.toFixed(1)}%`} />
                    <SelfMetricCard 
                      label="No-Tip Rate" 
                      value={`${selfStylist.noTipRate.toFixed(0)}%`} 
                      alert={selfStylist.noTipRate > 30}
                    />
                    <SelfMetricCard label="Total Tips" value={formatCurrencyWhole(Math.round(selfStylist.totalTips))} />
                  </div>

                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Not enough tip data yet</p>
                  <p className="text-xs mt-1">You need at least 10 appointments to see your metrics</p>
                </div>
              )
            ) : filteredStylists.length === 0 && filteredTotalTips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tip data recorded for this period</p>
                <p className="text-xs mt-1">Tips will appear once stylists have completed appointments</p>
              </div>
            ) : (
              /* ── Leadership View ── */
              <>
                {/* Summary Stats */}
                {(() => {
                  const totalTipsSum = filteredTotalTips.reduce((s, st) => s + st.totalTips, 0);
                  const totalRevenueBase = filteredTotalTips.reduce((s, st) => {
                    return s + (st.tipPercentage > 0 ? (st.totalTips / st.tipPercentage) * 100 : 0);
                  }, 0);
                  const avgTipRate = totalRevenueBase > 0 ? (totalTipsSum / totalRevenueBase) * 100 : 0;
                  return (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Overall Avg Tip Rate:{' '}
                        <span className="font-sans tabular-nums text-foreground">{avgTipRate.toFixed(1)}%</span>
                      </span>
                      <span className="text-border">|</span>
                      <span>
                        Total Tips:{' '}
                        <span className="font-sans tabular-nums text-foreground">
                          <BlurredAmount>{formatCurrencyWhole(Math.round(totalTipsSum))}</BlurredAmount>
                        </span>
                      </span>
                    </div>
                  );
                })()}

                {/* Tips by Stylist (total tips, no minimum) */}
                {filteredTotalTips.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-3.5 h-3.5 text-primary" />
                      <span className="font-display text-xs tracking-wide uppercase text-muted-foreground font-medium">
                        Tips by Stylist
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (amount shown is tips earned)
                      </span>
                    </div>
                    <div className="space-y-1">
                      {(showAllTotalTips ? filteredTotalTips : filteredTotalTips.slice(0, 10)).map((stylist, index) => (
                        <TotalTipRow
                          key={stylist.stylistUserId}
                          stylist={stylist}
                          index={index}
                          isExpanded={expandedStylist === stylist.stylistUserId}
                          onToggle={() => setExpandedStylist(expandedStylist === stylist.stylistUserId ? null : stylist.stylistUserId)}
                         rawAppointments={rawAppointments}
                         locations={locations}
                         clientMap={clientMap}
                        />
                      ))}
                    </div>
                    {filteredTotalTips.length > 10 && (
                      <Button
                        variant="ghost"
                        size={tokens.button.inline}
                        className="text-xs text-muted-foreground hover:text-foreground mt-1"
                        onClick={() => setShowAllTotalTips(!showAllTotalTips)}
                      >
                        {showAllTotalTips ? 'Show top 10' : `Show all ${filteredTotalTips.length} stylists`}
                      </Button>
                    )}
                  </div>
                )}

                {/* Avg Tip Rate Ranking (10+ appointments) */}
                {filteredStylists.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span className="font-display text-xs tracking-wide uppercase text-muted-foreground font-medium">
                      Avg Tip Rate Ranking
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (10+ appointments)
                    </span>
                  </div>
                  <div className="space-y-1">
                    {topEarners.map((stylist, index) => (
                      <StylistTipRow
                        key={stylist.stylistUserId}
                        stylist={stylist}
                        index={index}
                        isExpanded={expandedStylist === stylist.stylistUserId}
                        onToggle={() => setExpandedStylist(expandedStylist === stylist.stylistUserId ? null : stylist.stylistUserId)}
                         rawAppointments={rawAppointments}
                         locations={locations}
                         clientMap={clientMap}
                       />
                     ))}
                   </div>
                   {filteredStylists.length > 10 && (
                    <Button
                      variant="ghost"
                      size={tokens.button.inline}
                      className="text-xs text-muted-foreground hover:text-foreground mt-1"
                      onClick={() => setShowAll(!showAll)}
                    >
                      {showAll ? 'Show top 10' : `Show all ${filteredStylists.length} stylists`}
                    </Button>
                  )}
                </div>
                )}

                {/* Coaching Opportunities */}
                {coachingOpportunities.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                      <span className="text-xs tracking-wide uppercase text-muted-foreground font-medium">
                        Coaching Opportunities
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (lowest avg tips)
                      </span>
                    </div>
                    <div className="space-y-1">
                      {coachingOpportunities.map((stylist, index) => (
                        <StylistTipRow
                          key={stylist.stylistUserId}
                          stylist={stylist}
                          index={index}
                          isCoaching
                          isExpanded={expandedStylist === stylist.stylistUserId}
                          onToggle={() => setExpandedStylist(expandedStylist === stylist.stylistUserId ? null : stylist.stylistUserId)}
                         rawAppointments={rawAppointments}
                         locations={locations}
                         clientMap={clientMap}
                        />
                      ))}
                    </div>
                  </div>
                )}

              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Self-view metric card ── */
function SelfMetricCard({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="text-center p-3 bg-card-inner rounded-lg border border-border/30">
      <span className="text-lg font-display tabular-nums">
        <BlurredAmount>{value}</BlurredAmount>
      </span>
      <p className={cn("text-xs mt-1", alert ? "text-destructive" : "text-muted-foreground")}>{label}</p>
    </div>
  );
}


/* ── Visit group interface ── */
interface VisitGroup {
  services: { name: string; price: number }[];
  tip: number;
  date: string;
  startTime: string | null;
  locationId: string | null;
  totalPrice: number;
  totalPayment: number;
  clientName: string | null;
}

/* ── Appointment sub-list for expanded stylist ── */
function StylistAppointmentList({ stylistKey, rawAppointments, locations, clientMap }: { stylistKey: string; rawAppointments: RawTipAppointment[]; locations?: { id: string; name: string }[] | null; clientMap?: ClientMap }) {
  const { formatCurrency: fmtCurrency } = useFormatCurrency();

  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    locations?.forEach(l => map.set(l.id, l.name));
    return map;
  }, [locations]);

  const visits = useMemo(() => {
    const filtered = rawAppointments.filter(a => {
      const key = a.stylist_user_id || (a.phorest_staff_id ? `phorest:${a.phorest_staff_id}` : null);
      return key === stylistKey;
    });
    // Group by visit (same staff + client + date + tip) and merge service names + prices
    const visitMap = new Map<string, VisitGroup>();
    for (const a of filtered) {
      const tip = a.tip_amount ?? 0;
      const price = a.total_price ?? 0;
      const k = `${a.phorest_staff_id}|${a.phorest_client_id}|${a.appointment_date}|${tip}`;
      const existing = visitMap.get(k);
      if (existing) {
        if (a.service_name && !existing.services.some(s => s.name === a.service_name)) {
          existing.services.push({ name: a.service_name, price });
          existing.totalPrice += price;
          existing.totalPayment += price;
        }
      } else {
        const clientId = a.phorest_client_id;
        const clientName = clientId && clientMap ? clientMap.get(clientId) ?? null : null;
        visitMap.set(k, {
          services: a.service_name ? [{ name: a.service_name, price }] : [],
          tip,
          date: a.appointment_date,
          startTime: a.start_time ?? null,
          locationId: a.location_id ?? null,
          totalPrice: price,
          totalPayment: price + tip,
          clientName,
        });
      }
    }
    return Array.from(visitMap.values())
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [stylistKey, rawAppointments, clientMap]);

  if (visits.length === 0) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="pl-10 pr-2 py-1.5 space-y-1.5">
        {visits.map((visit, i) => {
          const dateStr = format(parseISO(visit.date), 'MMM d');
          const timeStr = visit.startTime
            ? format(parseISO(`${visit.date}T${visit.startTime}`), 'h:mm a')
            : null;
          const locName = visit.locationId ? locationMap.get(visit.locationId) : null;

          return (
            <div key={i} className="rounded-lg bg-muted/20 border border-border/20 px-3 py-2 font-sans">
              {/* Row 1: Date · Time · Client · Location */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 flex-wrap">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>{dateStr}</span>
                {timeStr && (
                  <>
                    <span className="text-border">·</span>
                    <span>{timeStr}</span>
                  </>
                )}
                {visit.clientName && (
                  <>
                    <span className="text-border">·</span>
                    <span className="truncate text-foreground">{visit.clientName}</span>
                  </>
                )}
                {locName && (
                  <>
                    <span className="text-border">·</span>
                    <span className="truncate">{locName}</span>
                  </>
                )}
              </div>
              {/* Row 2: Services total · Tip · Total Paid */}
              <div className="flex items-center gap-4 mt-1 text-xs tabular-nums">
                <span className="text-muted-foreground">
                  Services: <span className="text-foreground"><BlurredAmount>{fmtCurrency(visit.totalPrice)}</BlurredAmount></span>
                </span>
                <span className={visit.tip === 0 ? 'text-destructive' : 'text-muted-foreground'}>
                  Tip: <span className={visit.tip > 0 ? 'text-foreground' : ''}><BlurredAmount>{fmtCurrency(visit.tip)}</BlurredAmount></span>
                </span>
                <span className="text-muted-foreground">
                  Total Paid: <span className="text-foreground font-medium"><BlurredAmount>{fmtCurrency(visit.totalPayment)}</BlurredAmount></span>
                </span>
              </div>
              {/* Service line items */}
              {visit.services.length > 0 && (
                <div className="mt-1.5 pl-1 space-y-0.5">
                  {visit.services.map((svc, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="text-border/60">
                        {j === visit.services.length - 1 ? '└' : '├'}
                      </span>
                      <span className="truncate flex-1">{svc.name}</span>
                      <span className="tabular-nums text-right min-w-[50px]">
                        <BlurredAmount>{fmtCurrency(svc.price)}</BlurredAmount>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Stylist row for leadership table ── */
function StylistTipRow({ stylist, index, isCoaching = false, isExpanded, onToggle, rawAppointments, locations, clientMap }: {
  stylist: StylistTipMetrics;
  index: number;
  isCoaching?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  rawAppointments: RawTipAppointment[];
  locations?: { id: string; name: string }[] | null;
  clientMap?: ClientMap;
}) {
  const { formatCurrency: fmtCurrency, formatCurrencyWhole: fmtWhole } = useFormatCurrency();
  const initials = stylist.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04 }}
        className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <ChevronIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <Avatar className="w-7 h-7">
          <AvatarImage src={stylist.photoUrl ?? undefined} />
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm text-foreground font-medium min-w-[90px] truncate">
          {stylist.displayName}
        </span>
        <span className="text-sm font-sans tabular-nums min-w-[55px] text-right">
          <BlurredAmount>{fmtCurrency(stylist.avgTip)}</BlurredAmount>
        </span>
        <span className="text-xs text-muted-foreground tabular-nums min-w-[40px] text-right">
          {stylist.tipPercentage.toFixed(0)}%
        </span>
        <span className={cn(
          "text-xs tabular-nums min-w-[45px] text-right",
          stylist.noTipRate > 30 ? "text-destructive" : "text-muted-foreground"
        )}>
          {stylist.noTipRate.toFixed(0)}% NT
        </span>
        <span className="text-xs text-muted-foreground tabular-nums min-w-[55px] text-right">
          <BlurredAmount>{fmtWhole(Math.round(stylist.totalTips))}</BlurredAmount>
        </span>
      </motion.div>
      <AnimatePresence>
        {isExpanded && (
          <StylistAppointmentList stylistKey={stylist.stylistUserId} rawAppointments={rawAppointments} locations={locations} clientMap={clientMap} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Total tip row (emphasizes total tips first) ── */
function TotalTipRow({ stylist, index, isExpanded, onToggle, rawAppointments, locations, clientMap }: {
  stylist: StylistTipMetrics;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  rawAppointments: RawTipAppointment[];
  locations?: { id: string; name: string }[] | null;
  clientMap?: ClientMap;
}) {
  const { formatCurrencyWhole: fmtWhole } = useFormatCurrency();
  const initials = stylist.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04 }}
        className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <ChevronIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <Avatar className="w-7 h-7">
          <AvatarImage src={stylist.photoUrl ?? undefined} />
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm text-foreground font-medium min-w-[90px] truncate">
          {stylist.displayName}
        </span>
        <span className="text-sm font-sans tabular-nums min-w-[55px] text-right">
          <BlurredAmount>{fmtWhole(Math.round(stylist.totalTips))}</BlurredAmount>
        </span>
        <span className="text-xs text-muted-foreground tabular-nums min-w-[40px] text-right">
          {stylist.tipPercentage.toFixed(0)}%
        </span>
        <span className="text-xs text-muted-foreground tabular-nums min-w-[55px] text-right">
          {stylist.appointmentCount} appts
        </span>
      </motion.div>
      <AnimatePresence>
        {isExpanded && (
          <StylistAppointmentList stylistKey={stylist.stylistUserId} rawAppointments={rawAppointments} locations={locations} clientMap={clientMap} />
        )}
      </AnimatePresence>
    </div>
  );
}
