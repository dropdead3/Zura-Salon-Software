import { useState, useMemo } from 'react';
import { formatFullDisplayName } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { useOrgNow } from '@/hooks/useOrgNow';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Switch } from '@/components/ui/switch';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { isClosedOnDate, type HoursJson, type HolidayClosure } from '@/hooks/useLocations';
import { 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar as CalendarIcon,
  Plus,
  
  Check,
  Sparkles,
  FileText,
  Users,
  ClipboardCheck,
  Clock,
} from 'lucide-react';
import { NavBadge } from '@/components/dashboard/NavBadge';
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
import {

  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

interface ScheduleHeaderProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  view: CalendarView;
  setView: (view: CalendarView) => void;
  selectedStaffIds: string[];
  onStaffToggle: (staffId: string) => void;
  stylists: Array<{ user_id: string; display_name: string | null; full_name: string }>;
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
  showAllStylists?: boolean;
  onShowAllStylistsChange?: (value: boolean) => void;
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
  showAllStylists = true,
  onShowAllStylistsChange,
}: ScheduleHeaderProps) {
  const { dashPath } = useOrgDashboardPath();
  const { formatDate } = useFormatDate();
  const navigate = useNavigate();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [staffPopoverOpen, setStaffPopoverOpen] = useState(false);

  // Org-timezone-aware "today"
  const { isToday: isOrgToday, todayDate: orgToday } = useOrgNow();

  // Get quick day buttons - show the next 7 days after today (tomorrow through +7)
  const quickDays = Array.from({ length: 7 }, (_, i) => addDays(orgToday, i + 1));

  const goToToday = () => setCurrentDate(orgToday);
  
  const goToPrevDay = () => setCurrentDate(addDays(currentDate, -1));
  const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const goToPrevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const goToNextWeek = () => setCurrentDate(addDays(currentDate, 7));

  return (
    <div className="flex flex-col">
      {/* Dark Header Bar */}
      <div className="bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] border border-[hsl(var(--sidebar-border))] px-4 py-3 flex items-center justify-between rounded-t-lg">
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
                  'relative z-10 py-1.5 text-sm rounded-full transition-colors duration-300 w-[72px] flex items-center justify-center',
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
                  'relative z-10 py-1.5 text-sm rounded-full transition-colors duration-300 w-[72px] flex items-center justify-center',
                  view === 'week' 
                    ? 'text-[hsl(var(--sidebar-background))] font-medium' 
                    : 'text-[hsl(var(--sidebar-foreground))]/50 hover:text-[hsl(var(--sidebar-foreground))]/80'
                )}
                onClick={() => setView('week')}
              >
                Week
              </button>
            </div>
          </div>

          {/* Shifts View Toggle */}
          {onToggleShiftsView && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleShiftsView}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200',
                    showShiftsView
                      ? 'bg-[hsl(var(--sidebar-foreground))] text-[hsl(var(--sidebar-background))] font-medium'
                      : 'text-[hsl(var(--sidebar-foreground))]/50 hover:text-[hsl(var(--sidebar-foreground))]/80 hover:bg-[hsl(var(--sidebar-accent))]'
                  )}
                >
                  {showShiftsView ? (
                    <>
                      <CalendarIcon className="h-3.5 w-3.5" />
                      Appointments
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5" />
                      Shifts
                    </>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{showShiftsView ? 'Hide shift schedule' : 'View support staff shifts'}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size={tokens.button.inline}
                className="text-[hsl(var(--sidebar-foreground))]/70 hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
              >
                <CalendarIcon className="h-4 w-4 mr-1.5" />
                Date
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
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
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Center: Date Display */}
        <div className="text-center">
          <div className="text-xs font-display tracking-wide text-[hsl(var(--sidebar-foreground))]/70">
            {formatDate(currentDate, 'EEEE')}
          </div>
          <div className="text-sm font-display tracking-wide whitespace-nowrap">
            {formatDate(currentDate, 'MMMM d, yyyy')}
          </div>
        </div>

        {/* Right: Filters & Actions */}
        <div className="flex items-center gap-1">
          <CalendarFiltersPopover 
            filters={calendarFilters}
            onFiltersChange={onCalendarFiltersChange}
          />

          {/* Assistant Blocks Button */}
          {onOpenBlockManager && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                   className="relative text-[hsl(var(--sidebar-foreground))]/70 hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
                  onClick={onOpenBlockManager}
                >
                  <Users className="h-4 w-4" />
                  {pendingBlockCount > 0 && (
                    <NavBadge count={pendingBlockCount} className="absolute -top-1 -right-1" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{pendingBlockCount > 0 ? `${pendingBlockCount} pending assist${pendingBlockCount > 1 ? 's' : ''}` : 'Assistant Blocks'}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Drafts Button */}
          {onOpenDrafts && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-[hsl(var(--sidebar-foreground))]/70 hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]"
                  onClick={onOpenDrafts}
                >
                  <FileText className="h-4 w-4" />
                  {draftCount > 0 && (
                    <NavBadge count={draftCount} className="absolute -top-1 -right-1" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{draftCount > 0 ? `${draftCount} draft${draftCount > 1 ? 's' : ''}` : 'No drafts'}</p>
              </TooltipContent>
            </Tooltip>
          )}

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
          
          {/* Stacked Location & Staff Selectors */}
          <div className="flex flex-col gap-1.5 items-end">
            {/* Location Selector */}
            <Select value={selectedLocation} onValueChange={onLocationChange}>
              <SelectTrigger className="h-7 w-[280px] text-xs bg-[hsl(var(--sidebar-accent))] border-[hsl(var(--sidebar-border))] text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent-foreground)/.15)]">
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => {
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
                  className="h-7 w-[280px] text-xs justify-between bg-[hsl(var(--sidebar-accent))] border-[hsl(var(--sidebar-border))] text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent-foreground)/.15)] hover:text-[hsl(var(--sidebar-foreground))]"
                >
                  {selectedStaffIds.length === 0 
                    ? 'All Stylists With Appointments' 
                    : selectedStaffIds.length === 1
                      ? (() => { const s = stylists.find(s => s.user_id === selectedStaffIds[0]); return s ? formatFullDisplayName(s.full_name, s.display_name) : '1 selected'; })()
                      : `${selectedStaffIds.length} selected`
                  }
                  <ChevronRight className="h-3 w-3 rotate-90 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-2 bg-popover" align="end">
                <div className="space-y-1">
                  <button
                    onClick={() => onStaffToggle('all')}
                    className={cn(
                      'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors',
                      selectedStaffIds.length === 0 && 'bg-accent'
                    )}
                  >
                    {selectedStaffIds.length === 0 && <Check className="h-4 w-4" />}
                    {selectedStaffIds.length !== 0 && <div className="w-4" />}
                    All Stylists With Appointments
                  </button>
                  <div className="h-px bg-border my-1" />
                  {stylists.map((s) => (
                    <button
                      key={s.user_id}
                      onClick={() => onStaffToggle(s.user_id)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                    >
                      <Checkbox 
                        checked={selectedStaffIds.includes(s.user_id)}
                        className="pointer-events-none"
                      />
                      {formatFullDisplayName(s.full_name, s.display_name)}
                    </button>
                  ))}
                  {/* Show All Stylists toggle */}
                  {(view === 'day' || view === 'week') && onShowAllStylistsChange && (
                    <>
                      <div className="h-px bg-border my-1" />
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-muted-foreground">All Stylists</span>
                          <MetricInfoTooltip 
                            description="Show all stylists who work at this location on this day. Turn off to only show stylists with appointments." 
                            side="left"
                          />
                        </div>
                        <Switch
                          checked={showAllStylists}
                          onCheckedChange={onShowAllStylistsChange}
                          className="scale-75"
                        />
                      </div>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Secondary Navigation Bar */}
      <div className="bg-card border border-t-0 border-border/50 px-4 py-2 flex items-center justify-between rounded-b-lg">
        {/* Left: Week/Day Navigation */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size={tokens.button.inline} onClick={goToPrevWeek} className="gap-1">
            <ChevronsLeft className="h-4 w-4" />
            Week
          </Button>
          <Button variant="outline" size={tokens.button.inline} onClick={goToPrevDay} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Day
          </Button>
        </div>

        {/* Center: Quick Day Buttons */}
        <div className="flex items-center gap-1">
          {(() => {
            const selectedLoc = locations.find(l => l.id === selectedLocation);
            const todayClosed = selectedLoc
              ? isClosedOnDate(selectedLoc.hours_json ?? null, selectedLoc.holiday_closures ?? null, orgToday)
              : { isClosed: false };

            const todayButton = (
              <button
                onClick={goToToday}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[56px] px-3 py-2 rounded-lg text-sm font-sans transition-all duration-200',
                  isOrgToday(currentDate)
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  todayClosed.isClosed && !isOrgToday(currentDate) && 'opacity-60'
                )}
              >
                <div className="flex items-center gap-1">
                  {todayClosed.isClosed && (
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                  )}
                  <span className="font-medium text-xs tracking-wide">Today</span>
                </div>
                <span className="text-[10px] opacity-70">{format(orgToday, 'MMM d')}</span>
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
                  'flex flex-col items-center justify-center min-w-[48px] px-2.5 py-2 rounded-lg text-sm font-sans transition-all duration-200',
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
                    <span className="text-xs font-medium tracking-wide">{format(day, 'EEE')}</span>
                  </div>
                  <span className="text-[10px] opacity-70">{format(day, 'd')}</span>
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
        <div className="flex items-center gap-1">
          <Button variant="outline" size={tokens.button.inline} onClick={goToNextDay} className="gap-1">
            Day
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size={tokens.button.inline} onClick={goToNextWeek} className="gap-1">
            Week
            <ChevronsRight className="h-4 w-4" />
          </Button>
          
          {/* Jump Ahead Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size={tokens.button.inline} className="ml-1 gap-1">
                Jump <Plus className="h-3 w-3" />
                <ChevronRight className="h-3 w-3 rotate-90" />
              </Button>
            </PopoverTrigger>
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
  );
}
