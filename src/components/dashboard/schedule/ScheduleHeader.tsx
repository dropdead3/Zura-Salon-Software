import { useState, useMemo, useRef, useEffect } from 'react';
import { formatFullDisplayName } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { format, addDays, parseISO } from 'date-fns';
import { computeUtilizationByStylist } from '@/lib/schedule-utilization';
import type { PhorestAppointment } from '@/hooks/usePhorestCalendar';
import { useOrgNow } from '@/hooks/useOrgNow';
import { getOrgDayOffset } from '@/lib/orgTime';

function getRelativeDayLabel(offset: number): string {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  if (offset === -1) return 'Yesterday';
  if (offset > 1) return `In ${offset} days`;
  return `${Math.abs(offset)} days ago`;
}
import { useFormatDate } from '@/hooks/useFormatDate';
import { isClosedOnDate, type HoursJson, type HolidayClosure } from '@/hooks/useLocations';
import { 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Plus,
  
  Check,
  Sparkles,
  ClipboardCheck,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { CalendarView } from '@/hooks/usePhorestCalendar';
import { CalendarFiltersPopover, type CalendarFilterState } from './CalendarFiltersPopover';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import {

  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { getLevelColor } from '@/lib/level-colors';
import { getLevelNumber } from '@/utils/levelPricing';

interface ScheduleHeaderProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  view: CalendarView;
  setView: (view: CalendarView) => void;
  selectedStaffIds: string[];
  onStaffToggle: (staffId: string) => void;
  stylists: Array<{
    user_id: string;
    display_name: string | null;
    full_name: string;
    stylist_level?: string | null;
    utilization?: number;
  }>;
  selectedLocation: string;
  onLocationChange: (locationId: string) => void;
  locations: Array<{ id: string; name: string; city?: string | null; hours_json?: HoursJson | null; holiday_closures?: HolidayClosure[] | null }>;
  onNewBooking: () => void;
  canCreate?: boolean;
  isAdminRole?: boolean;
  isServiceProvider?: boolean;
  calendarFilters: CalendarFilterState;
  onCalendarFiltersChange: (filters: CalendarFilterState) => void;
  copilotOpen?: boolean;
  onCopilotToggle?: () => void;
  draftCount?: number;
  onOpenDrafts?: () => void;
  pendingBlockCount?: number;
  onOpenBlockManager?: () => void;
  showShiftsView?: boolean;
  onToggleShiftsView?: () => void;
  staffFilterMode?: 'with-appointments' | 'work-this-day';
  onStaffFilterModeChange?: (mode: 'with-appointments' | 'work-this-day') => void;
  /** Org-wide appointments used to compute capacity dots in the date picker */
  appointments?: PhorestAppointment[];
  hoursStart?: number;
  hoursEnd?: number;
  /** Resolved single stylist for week view (null in day view or none available) */
  weekViewStylistId?: string | null;
}

export function ScheduleHeader({
  currentDate,
  setCurrentDate,
  view,
  setView,
  selectedStaffIds,
  onStaffToggle,
  stylists,
  selectedLocation,
  onLocationChange,
  locations,
  onNewBooking,
  canCreate = false,
  isAdminRole = false,
  isServiceProvider = false,
  calendarFilters,
  onCalendarFiltersChange,
  copilotOpen,
  onCopilotToggle,
  draftCount = 0,
  onOpenDrafts,
  pendingBlockCount = 0,
  onOpenBlockManager,
  showShiftsView = false,
  onToggleShiftsView,
  staffFilterMode = 'work-this-day',
  onStaffFilterModeChange,
  appointments = [],
  hoursStart = 9,
  hoursEnd = 18,
  weekViewStylistId = null,
}: ScheduleHeaderProps) {
  const { dashPath } = useOrgDashboardPath();
  const { formatDate } = useFormatDate();
  const navigate = useNavigate();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (datePickerCloseTimer.current) clearTimeout(datePickerCloseTimer.current);
  }, []);
  const [staffPopoverOpen, setStaffPopoverOpen] = useState(false);
  const [locationSelectOpen, setLocationSelectOpen] = useState(false);

  // Org-timezone-aware "today"
  const { isToday: isOrgToday, todayDate: orgToday, timezone } = useOrgNow();
  const relativeDayLabel = getRelativeDayLabel(getOrgDayOffset(currentDate, timezone));

  // Stylist levels — used to render the per-row level chip + color.
  const { data: allLevels = [] } = useStylistLevels();
  const activeLevels = useMemo(
    () => allLevels.filter((l) => l.is_active).sort((a, b) => a.display_order - b.display_order),
    [allLevels],
  );
  // Map "Level N" → matching DB slug. The legacy stylist_level string ("LEVEL 2 STYLIST")
  // resolves to a number; we then match it positionally to the active levels list.
  const levelSlugByNumber = useMemo(() => {
    const m = new Map<number, string>();
    activeLevels.forEach((lvl, i) => m.set(i + 1, lvl.slug));
    return m;
  }, [activeLevels]);

  // Get quick day buttons - show the next 7 days after today (tomorrow through +7)
  const quickDays = Array.from({ length: 7 }, (_, i) => addDays(orgToday, i + 1));

  const goToToday = () => setCurrentDate(orgToday);
  
  const goToPrevDay = () => setCurrentDate(addDays(currentDate, -1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const goToPrevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const goToNextWeek = () => setCurrentDate(addDays(currentDate, 7));

  // Capacity tiers per date for the date picker — org-wide utilization signal.
  // Uses the shared computeUtilizationByStylist (single source of truth) and
  // aggregates booked vs available minutes across all stylists for each date.
  const capacityModifiers = useMemo(() => {
    const moderate: Date[] = [];
    const low: Date[] = [];
    const critical: Date[] = [];

    if (!appointments.length || !stylists.length) {
      return { moderate, low, critical };
    }

    // Bucket appointments by date string for cheap lookup
    const dateSet = new Set<string>();
    appointments.forEach((a) => {
      if (a.appointment_date) dateSet.add(a.appointment_date);
    });

    dateSet.forEach((dateStr) => {
      const perStylist = computeUtilizationByStylist(
        stylists.map((s) => ({ user_id: s.user_id })),
        appointments as any,
        dateStr,
        hoursStart,
        hoursEnd,
      );
      // Org-wide average across stylists who have any data
      const values = Array.from(perStylist.values());
      if (values.length === 0) return;
      const avg = values.reduce((s, v) => s + v, 0) / values.length;

      // Parse the YYYY-MM-DD into a Date (local) for react-day-picker matching
      const d = parseISO(dateStr);
      if (avg >= 90) critical.push(d);
      else if (avg >= 70) low.push(d);
      else if (avg >= 50) moderate.push(d);
    });

    return { moderate, low, critical };
  }, [appointments, stylists, hoursStart, hoursEnd]);


  return (
    <div className="flex flex-col @container/schedhdr">
      {/* Dark Header Bar */}
      <div className="relative bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] border border-[hsl(var(--sidebar-border))] px-4 py-3 rounded-t-lg flex flex-col gap-2 @md/schedhdr:flex-row @md/schedhdr:flex-nowrap @md/schedhdr:items-center @md/schedhdr:justify-between @md/schedhdr:gap-0">
        {/* Row 1 (<@md): Left cluster + condensed date right. At @md+: just the left cluster. */}
        <div className="flex items-center justify-between @md/schedhdr:justify-start @md/schedhdr:contents">
        {/* Left: View Toggle & Date Picker */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex rounded-full overflow-hidden bg-[hsl(var(--sidebar-accent))] p-[2px]">
              {/* Animated sliding pill */}
              <div 
                className={cn(
                  "absolute top-[2px] bottom-[2px] bg-[hsl(var(--sidebar-foreground))] rounded-full transition-all duration-300 ease-out",
                  view === 'day' ? 'left-[2px] w-[calc(50%-2px)]' : 'left-[50%] w-[calc(50%-2px)]'
                )}
              />
              <button
                className={cn(
                  'relative z-10 py-1.5 text-sm rounded-full transition-colors duration-300 w-[60px] @lg/schedhdr:w-[72px] flex items-center justify-center',
                  view === 'day' 
                    ? 'text-[hsl(var(--sidebar-background))] font-medium' 
                    : 'text-[hsl(var(--sidebar-foreground))]/50 hover:text-[hsl(var(--sidebar-foreground))]/80'
                )}
                onClick={() => setView('day')}
              >
                Day
              </button>
              <button
                className={cn(
                  'relative z-10 py-1.5 text-sm rounded-full transition-colors duration-300 w-[60px] @lg/schedhdr:w-[72px] flex items-center justify-center',
                  view === 'week' 
                    ? 'text-[hsl(var(--sidebar-background))] font-medium' 
                    : 'text-[hsl(var(--sidebar-foreground))]/50 hover:text-[hsl(var(--sidebar-foreground))]/80'
                )}
                onClick={() => setView('week')}
              >
                Week
              </button>
            </div>
            {/* Shifts View Toggle — mirrors Day/Week pill UI */}
            {onToggleShiftsView && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggleShiftsView}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200',
                      showShiftsView
                        ? 'text-[hsl(var(--sidebar-foreground))] bg-[hsl(var(--sidebar-accent))]'
                        : 'text-[hsl(var(--sidebar-foreground))]/50 hover:text-[hsl(var(--sidebar-foreground))]/80 hover:bg-[hsl(var(--sidebar-accent))]'
                    )}
                  >
                    {showShiftsView ? (
                      <>
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span className="hidden @lg/schedhdr:inline">Appointments</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5" />
                        <span className="hidden @lg/schedhdr:inline">Shifts</span>
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{showShiftsView ? 'Hide shift schedule' : 'View support staff shifts'}</p>
                </TooltipContent>
              </Tooltip>
            )}

          </div>

          {/* Center: Date Display — absolutely centered at @md+, inline at narrow */}
        <div className="@md/schedhdr:absolute @md/schedhdr:left-1/2 @md/schedhdr:top-1/2 @md/schedhdr:-translate-x-1/2 @md/schedhdr:-translate-y-1/2 @md/schedhdr:pointer-events-none">
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="@md/schedhdr:pointer-events-auto text-center shrink-0 px-2 py-1 cursor-pointer rounded-md hover:bg-[hsl(var(--sidebar-accent))]/40 transition-colors"
              aria-label="Pick a date"
            >
              {/* Compact single-line at < @xl — abbreviated, no year */}
              <div className="@xl/schedhdr:hidden">
                {relativeDayLabel && (
                  <div className="text-[9px] font-display tracking-[0.2em] text-primary uppercase leading-none mb-0.5">
                    {relativeDayLabel}
                  </div>
                )}
                <div className="text-sm font-display tracking-wide whitespace-nowrap">
                  {formatDate(currentDate, 'EEE')} · {formatDate(currentDate, 'MMM d')}
                </div>
              </div>
              {/* Two-line at @xl+ */}
              <div className="hidden @xl/schedhdr:block">
                {relativeDayLabel && (
                  <div className="text-[10px] font-display tracking-[0.2em] text-primary uppercase leading-none mb-0.5">
                    {relativeDayLabel}
                  </div>
                )}
                <div className="text-xs font-display tracking-wide text-[hsl(var(--sidebar-foreground))]/70 truncate">
                  {formatDate(currentDate, 'EEEE')}
                </div>
                <div className="text-sm font-display tracking-wide whitespace-nowrap truncate">
                  {formatDate(currentDate, 'MMMM d, yyyy')}
                </div>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align="center"
            onMouseEnter={() => {
              if (datePickerCloseTimer.current) {
                clearTimeout(datePickerCloseTimer.current);
                datePickerCloseTimer.current = null;
              }
            }}
            onMouseLeave={() => {
              if (datePickerCloseTimer.current) clearTimeout(datePickerCloseTimer.current);
              datePickerCloseTimer.current = setTimeout(() => {
                setDatePickerOpen(false);
                datePickerCloseTimer.current = null;
              }, 200);
            }}
          >
            <CalendarPicker
              mode="single"
              selected={currentDate}
              onSelect={(date) => {
                if (date) {
                  setCurrentDate(date);
                  setDatePickerOpen(false);
                }
              }}
              initialFocus
              modifiers={{
                moderate: capacityModifiers.moderate,
                low: capacityModifiers.low,
                critical: capacityModifiers.critical,
              }}
              modifiersClassNames={{
                moderate:
                  "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-amber-500",
                low:
                  "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-orange-500",
                critical:
                  "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-red-500",
              }}
            />
            {/* Capacity legend strip */}
            <div className="flex items-center justify-center gap-3 px-3 pb-3 pt-1 text-[11px] text-muted-foreground border-t border-border/50">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Filling
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                Tight
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Booked
              </span>
              <MetricInfoTooltip
                title="Capacity signal"
                description="Dots under each date reflect org-wide booked time vs available shift time. White = open · Yellow ≥ 50% · Orange ≥ 70% · Red ≥ 90%."
                side="top"
              />
            </div>
          </PopoverContent>
        </Popover>
        </div>
        </div>
        </div>
        {/* End Row 1 wrapper (<@md). At @md+, this wrapper is `contents` so children flow into the parent row. */}

        {/* Row 2 wrapper (<@md): filter icons left, selectors right. At @md+, dissolves via `contents`. */}
        <div className="flex items-center justify-between @md/schedhdr:contents">
        {/* Right: Filters & Actions */}
        <div className="flex items-center gap-1 w-full @md/schedhdr:w-auto justify-between @md/schedhdr:justify-start">
          {/* Filter icons group */}
          <div className="flex items-center gap-1">
          <CalendarFiltersPopover 
            filters={calendarFilters}
            onFiltersChange={onCalendarFiltersChange}
          />

          {/* Today's Prep Button — only when viewing today */}
          {isServiceProvider && isOrgToday(currentDate) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                   className="text-[hsl(var(--sidebar-foreground))]/70 hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
                  onClick={() => navigate(dashPath('/today-prep'))}
                >
                  <ClipboardCheck className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Today's Prep</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          </div>
          {/* End filter icons group */}

          {/* Location & Staff selector stack */}
          <div className="flex flex-row items-center gap-3">
            {/* Location & Staff Selectors — stacked vertically */}
            <div className="flex flex-col gap-2 items-stretch">

            {/* Location Selector */}
            <Select
              value={selectedLocation}
              onValueChange={(v) => {
                onLocationChange(v);
                setLocationSelectOpen(false);
              }}
              open={locationSelectOpen}
              onOpenChange={setLocationSelectOpen}
            >
              <SelectTrigger
                className="h-7 w-[220px] @lg/schedhdr:w-[280px] text-xs text-left bg-[hsl(var(--sidebar-accent))] border-[hsl(var(--sidebar-border))] text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent-foreground)/.15)] [&>span]:flex-1 [&>span]:text-left"
              >
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent
                className="data-[side=bottom]:translate-y-0 data-[side=top]:translate-y-0"
                onPointerLeave={() => setLocationSelectOpen(false)}
              >
                {[...locations].sort((a, b) => a.name.localeCompare(b.name)).map((loc) => {
                  const cityState = loc.city 
                    ? `${loc.city.split(',')[0]?.trim()}, ${loc.city.split(',')[1]?.trim().split(' ')[0] || ''}`
                    : '';
                  
                  return (
                    <SelectItem 
                      key={loc.id} 
                      value={loc.id}
                      description={cityState || undefined}
                    >
                      {loc.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            
            {/* Staff Multi-Select */}
            <Popover open={staffPopoverOpen} onOpenChange={setStaffPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="h-7 w-[220px] @lg/schedhdr:w-[280px] px-4 text-xs justify-between bg-[hsl(var(--sidebar-accent))] border-[hsl(var(--sidebar-border))] text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent-foreground)/.15)] hover:text-[hsl(var(--sidebar-foreground))]"
                >
                  <span className="flex-1 text-left truncate">
                    {(() => {
                      // Week view with no manual selection → reflect the auto-resolved stylist
                      if (view === 'week' && selectedStaffIds.length === 0 && weekViewStylistId) {
                        const s = stylists.find(s => s.user_id === weekViewStylistId);
                        if (s) return formatFullDisplayName(s.full_name, s.display_name);
                      }
                      if (selectedStaffIds.length === 0) {
                        return staffFilterMode === 'with-appointments'
                          ? 'Only Stylists With Appointments'
                          : 'All Stylists That Work This Day';
                      }
                      if (selectedStaffIds.length === 1) {
                        const s = stylists.find(s => s.user_id === selectedStaffIds[0]);
                        return s ? formatFullDisplayName(s.full_name, s.display_name) : '1 selected';
                      }
                      return `${selectedStaffIds.length} selected`;
                    })()}
                  </span>
                  <ChevronRight className="h-3 w-3 rotate-90 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[320px] p-2 bg-popover"
                align="end"
                onMouseLeave={() => setStaffPopoverOpen(false)}
              >
                <div className="space-y-1">
                  {(() => {
                    // In week view with no manual selection, the auto-resolved stylist
                    // is functionally selected — suppress the "All" checkmark and show it on the stylist row instead.
                    const weekAutoActive =
                      view === 'week' && selectedStaffIds.length === 0 && !!weekViewStylistId;
                    const allWorkActive =
                      selectedStaffIds.length === 0 && staffFilterMode === 'work-this-day' && !weekAutoActive;
                    const allWithApptsActive =
                      selectedStaffIds.length === 0 && staffFilterMode === 'with-appointments' && !weekAutoActive;
                    return (
                      <>
                        <button
                          onClick={() => {
                            if (onStaffFilterModeChange) onStaffFilterModeChange('work-this-day');
                            onStaffToggle('all');
                          }}
                          className={cn(
                            'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors',
                            allWorkActive && 'bg-accent'
                          )}
                        >
                          {allWorkActive ? <Check className="h-4 w-4" /> : <div className="w-4" />}
                          All Stylists That Work This Day
                        </button>
                        <button
                          onClick={() => {
                            if (onStaffFilterModeChange) onStaffFilterModeChange('with-appointments');
                            onStaffToggle('all');
                          }}
                          className={cn(
                            'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors',
                            allWithApptsActive && 'bg-accent'
                          )}
                        >
                          {allWithApptsActive ? <Check className="h-4 w-4" /> : <div className="w-4" />}
                          Only Stylists With Appointments
                        </button>
                      </>
                    );
                  })()}
                  <div className="h-px bg-border my-1" />
                  {[...stylists]
                    .sort((a, b) =>
                      formatFullDisplayName(a.full_name, a.display_name).localeCompare(
                        formatFullDisplayName(b.full_name, b.display_name),
                      ),
                    )
                    .map((s) => {
                      // Resolve by slug first (current DB format), fall back to legacy "LEVEL N STYLIST"
                      const dbLevel = s.stylist_level
                        ? activeLevels.find((l) => l.slug === s.stylist_level)
                          ?? activeLevels.find(
                            (l) => l.slug === levelSlugByNumber.get(getLevelNumber(s.stylist_level) ?? -1),
                          )
                        : undefined;
                      const levelIdx = dbLevel
                        ? activeLevels.findIndex((l) => l.id === dbLevel.id)
                        : -1;
                      const levelLabel = levelIdx >= 0 ? `Level ${levelIdx + 1}` : null;
                      const levelColor =
                        levelIdx >= 0
                          ? getLevelColor(levelIdx, activeLevels.length)
                          : null;
                      const util = s.utilization ?? 0;

                      return (
                        <button
                          key={s.user_id}
                          onClick={() => onStaffToggle(s.user_id)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                        >
                          <Checkbox
                            checked={selectedStaffIds.includes(s.user_id)}
                            className="pointer-events-none"
                          />
                          <span className="flex-1 text-left truncate">
                            {formatFullDisplayName(s.full_name, s.display_name)}
                          </span>
                          {levelLabel && (
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded shrink-0',
                                levelColor?.bg,
                                levelColor?.text,
                              )}
                            >
                              {levelLabel}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground tabular-nums w-9 text-right shrink-0">
                            {util}%
                          </span>
                        </button>
                      );
                    })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        </div>
        </div>
        {/* End Row 2 wrapper */}
      </div>

      {/* Secondary Navigation Bar */}
      <div className="bg-card border border-t-0 border-border/50 px-4 py-2 flex items-center justify-between gap-2 min-w-0 overflow-hidden rounded-b-lg">
        {/* Left: Week/Day Navigation */}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="outline" size={tokens.button.inline} onClick={goToPrevWeek} className="gap-1" title="Previous Week">
            <ChevronsLeft className="h-4 w-4" />
            <span className="hidden lg:inline">Week</span>
          </Button>
          <Button variant="outline" size={tokens.button.inline} onClick={goToPrevDay} className="gap-1" title="Previous Day">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden lg:inline">Day</span>
          </Button>
        </div>

        {/* Center: Quick Day Buttons */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none flex items-center justify-center gap-1 px-1">
          {(() => {
            const selectedLoc = locations.find(l => l.id === selectedLocation);
            const todayClosed = selectedLoc
              ? isClosedOnDate(selectedLoc.hours_json ?? null, selectedLoc.holiday_closures ?? null, orgToday)
              : { isClosed: false };

            const todayButton = (
              <button
                onClick={goToToday}
                className={cn(
                  'shrink-0 flex flex-col items-center justify-center min-w-[64px] px-3 py-3 rounded-lg text-sm font-sans transition-all duration-200',
                  isOrgToday(currentDate)
                    ? 'bg-primary text-primary-foreground shadow-sm dark:bg-primary/15 dark:text-primary dark:shadow-none dark:border dark:border-primary/40'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  todayClosed.isClosed && !isOrgToday(currentDate) && 'opacity-60'
                )}
              >
                <div className="flex items-center gap-1">
                  {todayClosed.isClosed && (
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                  )}
                  <span className="font-medium text-sm tracking-wide">Today</span>
                </div>
                <span className="text-xs opacity-70">{format(orgToday, 'MMM d')}</span>
              </button>
            );

            return todayClosed.isClosed ? (
              <Tooltip>
                <TooltipTrigger asChild>{todayButton}</TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{todayClosed.reason && todayClosed.reason !== 'Regular hours' ? `Closed — ${todayClosed.reason}` : 'Closed'}</p>
                </TooltipContent>
              </Tooltip>
            ) : todayButton;
          })()}
          {quickDays.map((day) => {
            const isSelected = format(day, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd');
            const isTodayDate = isOrgToday(day);
            const selectedLoc = locations.find(l => l.id === selectedLocation);
            const closed = selectedLoc
              ? isClosedOnDate(selectedLoc.hours_json ?? null, selectedLoc.holiday_closures ?? null, day)
              : { isClosed: false };

            const btn = (
              <button
                key={day.toISOString()}
                onClick={() => {
                  setCurrentDate(day);
                  setView('day');
                }}
                className={cn(
                  'shrink-0 flex flex-col items-center justify-center min-w-[56px] px-2.5 py-3 rounded-lg text-sm font-sans transition-all duration-200',
                  isSelected
                    ? 'bg-secondary text-secondary-foreground shadow-sm font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  isTodayDate && !isSelected && 'text-primary border border-primary/20',
                  closed.isClosed && !isSelected && 'opacity-60'
                )}
              >
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    {closed.isClosed && (
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium tracking-wide">{format(day, 'EEE')}</span>
                  </div>
                  <span className="text-xs opacity-70">{format(day, 'd')}</span>
                </div>
              </button>
            );

            return closed.isClosed ? (
              <Tooltip key={day.toISOString()}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{closed.reason && closed.reason !== 'Regular hours' ? `Closed — ${closed.reason}` : 'Closed'}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <span key={day.toISOString()}>{btn}</span>
            );
          })}
        </div>

        {/* Right: Forward Navigation + Jump Ahead */}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="outline" size={tokens.button.inline} onClick={goToNextDay} className="gap-1" title="Next Day">
            <span className="hidden lg:inline">Day</span>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Split Button: Week forward + Jump-ahead dropdown */}
          <div className="inline-flex items-center h-8 rounded-full border border-input overflow-hidden bg-background">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={goToNextWeek}
                  className="flex items-center gap-1 h-full px-3 text-sm font-sans font-medium border-r border-input hover:bg-foreground/10 transition-colors"
                  aria-label="Next week"
                >
                  <span className="hidden lg:inline">Week</span>
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Next week</p>
              </TooltipContent>
            </Tooltip>

            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center h-full px-2 hover:bg-foreground/10 transition-colors"
                      aria-label="Jump ahead 2 to 10 weeks"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Jump ahead 2–10 weeks</p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent className="w-48 p-1" align="end">
                <div className="flex flex-col">
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((weeks) => {
                    const targetDate = addDays(orgToday, weeks * 7);
                    return (
                      <Button
                        key={weeks}
                        variant="ghost"
                        size={tokens.button.inline}
                        className="justify-start h-auto py-2 px-3"
                        onClick={() => setCurrentDate(targetDate)}
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium">+{weeks} Weeks</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(targetDate, 'EEE, MMM d, yyyy')}
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
