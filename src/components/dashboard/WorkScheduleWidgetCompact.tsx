import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useLocations } from '@/hooks/useLocations';
import { useLocationSchedules } from '@/hooks/useLocationSchedules';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { tokens } from '@/lib/design-tokens';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';


const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WorkScheduleWidgetCompact() {
  const { dashPath } = useOrgDashboardPath();
  const { data: profile } = useEmployeeProfile();
  const { data: locations } = useLocations();
  const { data: allSchedules } = useLocationSchedules();

  const userLocations = locations?.filter(loc => 
    profile?.location_ids?.includes(loc.id) || profile?.location_id === loc.id
  ) || [];

  const allWorkDays = allSchedules?.flatMap(s => s.work_days || []) || [];
  const uniqueWorkDays = [...new Set(allWorkDays)];

  // Show "not on-site" state for remote admin staff
  if (profile?.is_onsite_staff === false) {
    return (
      <Card className={cn(tokens.kpi.tile, 'justify-between min-h-[160px] p-5')}>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Calendar className={tokens.card.icon} />
          </div>
          <span className={cn(tokens.kpi.label, 'flex-1')}>MY WORK DAYS</span>
        </div>
        <div className="mt-4 flex-1">
          <p className="text-sm text-muted-foreground">
            Not working on-site
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Update in your profile settings if this has changed.
          </p>
        </div>
      </Card>
    );
  }

  if (userLocations.length === 0) {
    return (
      <Card className={cn(tokens.kpi.tile, 'justify-between min-h-[160px] p-5')}>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Calendar className={tokens.card.icon} />
          </div>
          <span className={cn(tokens.kpi.label, 'flex-1')}>MY WORK DAYS</span>
        </div>
        <div className="mt-4 flex-1">
          <p className="text-sm text-muted-foreground">
            No locations assigned
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(tokens.kpi.tile, 'justify-between min-h-[160px] p-5')}>
      <div className="flex items-center gap-3">
        <div className={tokens.card.iconBox}>
          <Calendar className={tokens.card.icon} />
        </div>
        <span className={cn(tokens.kpi.label, 'flex-1')}>MY WORK DAYS</span>
      </div>

      <div className="mt-4 flex-1">
        {/* Location summary */}
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {userLocations.length === 1 
              ? userLocations[0].name 
              : `${userLocations.length} locations`}
          </span>
        </div>

        {/* Days display */}
        <div className="flex flex-wrap gap-1 mb-3">
          {DAYS_OF_WEEK.map((day) => {
            const isWorking = uniqueWorkDays.includes(day);
            return (
              <Badge
                key={day}
                variant={isWorking ? 'default' : 'outline'}
                className={cn(
                  "text-[10px] px-1.5 py-0.5",
                  isWorking 
                    ? "bg-primary/90 text-primary-foreground" 
                    : "text-muted-foreground/50 border-muted"
                )}
              >
                {day.charAt(0)}
              </Badge>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          {uniqueWorkDays.length} days per week
        </p>
      </div>

      <div className="flex justify-end mt-2 pt-2 border-t border-border/40 min-h-[28px]">
        <Link 
          to={dashPath('/profile')}
          className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          Manage <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </Card>
  );
}
