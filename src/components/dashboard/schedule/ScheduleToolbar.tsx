import { useState } from 'react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { 
  Calendar, 
  CalendarDays, 
  CalendarRange, 
  List, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  Plus,
  Settings2,
  Filter,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { CalendarView, CalendarFilters, AppointmentStatus, STATUS_CONFIG } from '@/hooks/usePhorestCalendar';
import { useLocations } from '@/hooks/useLocations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ScheduleToolbarProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  view: CalendarView;
  setView: (view: CalendarView) => void;
  filters: CalendarFilters;
  setFilters: (filters: CalendarFilters) => void;
  onSync: () => void;
  onNewBooking: () => void;
  lastSync: Date | null;
  isSyncing?: boolean;
  canCreate?: boolean;
  pendingBlockCount?: number;
  onOpenBlockManager?: () => void;
}

const VIEW_ICONS = {
  day: CalendarDays,
  week: CalendarRange,
  month: Calendar,
  agenda: List,
};

const ALL_STATUSES: AppointmentStatus[] = ['booked', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'];

export function ScheduleToolbar({
  currentDate,
  setCurrentDate,
  view,
  setView,
  filters,
  setFilters,
  onSync,
  onNewBooking,
  lastSync,
  isSyncing = false,
  canCreate = false,
  pendingBlockCount = 0,
  onOpenBlockManager,
}: ScheduleToolbarProps) {
  const { formatDate } = useFormatDate();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  
  const { data: locations = [] } = useLocations();
  
  // Get stylists for filter
  const { data: stylists = [] } = useQuery({
    queryKey: ['schedule-stylists'],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, photo_url')
        .eq('is_active', true)
        .eq('is_approved', true)
        .order('display_name');
      return data || [];
    },
  });

  const getDateLabel = () => {
    switch (view) {
      case 'day':
        return formatDate(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        return formatDate(currentDate, "'Week of' MMMM d, yyyy");
      case 'month':
        return formatDate(currentDate, 'MMMM yyyy');
      case 'agenda':
        return formatDate(currentDate, "'Starting' MMMM d");
      default:
        return formatDate(currentDate, 'MMMM d, yyyy');
    }
  };

  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'day': newDate.setDate(newDate.getDate() - 1); break;
      case 'week': newDate.setDate(newDate.getDate() - 7); break;
      case 'month': newDate.setMonth(newDate.getMonth() - 1); break;
      case 'agenda': newDate.setDate(newDate.getDate() - 14); break;
    }
    setCurrentDate(newDate);
  };
  
  const goToNext = () => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'day': newDate.setDate(newDate.getDate() + 1); break;
      case 'week': newDate.setDate(newDate.getDate() + 7); break;
      case 'month': newDate.setMonth(newDate.getMonth() + 1); break;
      case 'agenda': newDate.setDate(newDate.getDate() + 14); break;
    }
    setCurrentDate(newDate);
  };

  const toggleStatus = (status: AppointmentStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    setFilters({ ...filters, statuses: newStatuses });
  };

  const activeFilterCount = 
    (filters.locationIds.length > 0 ? 1 : 0) +
    (filters.stylistIds.length > 0 ? 1 : 0) +
    (filters.statuses.length !== 4 ? 1 : 0);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pb-4 border-b border-border">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={goToPrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[200px] justify-start font-medium">
              {getDateLabel()}
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
        
        <Button variant="outline" size="icon" onClick={goToNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button variant="ghost" size={tokens.button.inline} onClick={goToToday}>
          Today
        </Button>
      </div>

      {/* Center: View Toggle */}
      <ToggleGroup 
        type="single" 
        value={view} 
        onValueChange={(v) => v && setView(v as CalendarView)}
        className="hidden md:flex"
      >
        {(['week', 'day', 'month', 'agenda'] as CalendarView[]).map((v) => {
          const Icon = VIEW_ICONS[v];
          return (
            <ToggleGroupItem key={v} value={v} aria-label={v} className="capitalize">
              <Icon className="h-4 w-4 mr-1.5" />
              {v}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>

      {/* Mobile View Select */}
      <Select value={view} onValueChange={(v) => setView(v as CalendarView)}>
        <SelectTrigger className="w-[140px] md:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(['week', 'day', 'month', 'agenda'] as CalendarView[]).map((v) => (
            <SelectItem key={v} value={v} className="capitalize">{v} View</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Filter Popover */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size={tokens.button.inline} className="relative">
              <Filter className="h-4 w-4 mr-1.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Location</h4>
                <Select
                  value={filters.locationIds[0] || 'all'}
                  onValueChange={(v) => setFilters({
                    ...filters,
                    locationIds: v === 'all' ? [] : [v],
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-sm mb-2">Stylist</h4>
                <Select
                  value={filters.stylistIds[0] || 'all'}
                  onValueChange={(v) => setFilters({
                    ...filters,
                    stylistIds: v === 'all' ? [] : [v],
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All stylists" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stylists</SelectItem>
                    {stylists.map((s) => (
                      <SelectItem key={s.user_id} value={s.user_id}>
                        {formatDisplayName(s.full_name, s.display_name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-sm mb-2">Status</h4>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_STATUSES.map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        id={status}
                        checked={filters.statuses.includes(status)}
                        onCheckedChange={() => toggleStatus(status)}
                      />
                      <Label htmlFor={status} className="text-sm capitalize">
                        {status.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showCancelled"
                  checked={filters.showCancelled}
                  onCheckedChange={(checked) => setFilters({
                    ...filters,
                    showCancelled: !!checked,
                  })}
                />
                <Label htmlFor="showCancelled" className="text-sm">
                  Show cancelled & no-shows
                </Label>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Assistant Blocks Badge */}
        {onOpenBlockManager && (
          <Button
            variant="outline"
            size={tokens.button.inline}
            onClick={onOpenBlockManager}
            className="relative"
          >
            <Users className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Assists</span>
            {pendingBlockCount > 0 && (
              <Badge
                variant="secondary"
                className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center text-xs bg-amber-500 text-white"
              >
                {pendingBlockCount}
              </Badge>
            )}
          </Button>
        )}

        {/* Sync Button */}
        <Button 
          variant="outline" 
          size={tokens.button.inline} 
          onClick={onSync}
          disabled={isSyncing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-1.5", isSyncing && "animate-spin")} />
          <span className="hidden sm:inline">Sync</span>
        </Button>

        {/* New Booking */}
        {canCreate && (
          <Button size={tokens.button.card} onClick={onNewBooking}>
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">New Booking</span>
          </Button>
        )}
      </div>

      {/* Sync Status */}
      {lastSync && (
        <div className="text-xs text-muted-foreground hidden lg:block">
          Last synced: {formatDate(lastSync, 'h:mm a')}
        </div>
      )}
    </div>
  );
}
