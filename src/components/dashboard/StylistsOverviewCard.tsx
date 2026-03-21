import { Users, MapPin, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStylistLevelsSimple } from '@/hooks/useStylistLevels';
import { useActiveLocations } from '@/hooks/useLocations';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';


export function StylistsOverviewCard() {
  const navigate = useNavigate();
  // Fetch stylists with their levels to show counts
  const { data: stylistsByLevel } = useQuery({
    queryKey: ['stylists-by-level'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('stylist_level')
        .not('stylist_level', 'is', null);
      
      if (error) throw error;
      
      // Count stylists per level
      const counts: Record<string, number> = {};
      data?.forEach(profile => {
        if (profile.stylist_level) {
          counts[profile.stylist_level] = (counts[profile.stylist_level] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const { data: levels = [] } = useStylistLevelsSimple();
  const totalAssigned = Object.values(stylistsByLevel || {}).reduce((a, b) => a + b, 0);

  const getStylistCount = (levelId: string): number => {
    return stylistsByLevel?.[levelId] || 0;
  };

  return (
    <Card className={cn(tokens.card.wrapper, "p-6")}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Users className={tokens.card.icon} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base tracking-wide">STYLISTS BY LEVEL</h2>
              <MetricInfoTooltip description="Breaks down your team by assigned stylist level. Use this to ensure healthy distribution across experience tiers and plan promotions." />
            </div>
            <p className="text-xs text-muted-foreground">Team composition by experience tier</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={tokens.button.cardAction}
          onClick={() => navigate('/dashboard/admin/settings?category=levels')}
        >
          <Settings className="w-4 h-4" /> Configure
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-3 border-b">
          <span className="text-sm text-muted-foreground">Total Assigned</span>
          <span className="text-2xl font-display tabular-nums">{totalAssigned}</span>
        </div>
        
        <div className="space-y-2">
          {levels.map((level, idx) => {
            const count = getStylistCount(level.id);
            const percentage = totalAssigned > 0 ? (count / totalAssigned) * 100 : 0;
            
            return (
              <div key={level.id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm truncate">{level.label}</span>
                    <span className="text-sm text-muted-foreground tabular-nums shrink-0">{count}</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-foreground/30 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {totalAssigned === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            No stylists assigned to levels yet
          </p>
        )}
      </div>
    </Card>
  );
}
export function StaffOverviewCard() {
  // Fetch locations from database
  const { data: locations = [] } = useActiveLocations();
  
  // Fetch all active staff with their location info
  const { data: staffData } = useQuery({
    queryKey: ['staff-by-location'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('id, location_id, location_ids')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate unique total and per-location counts
  const totalStaff = staffData?.length || 0;
  
  const staffByLocation = locations.map(loc => {
    const count = staffData?.filter(staff => {
      // Check both location_id and location_ids array
      const inSingleLocation = staff.location_id === loc.id;
      const inMultipleLocations = staff.location_ids?.includes(loc.id);
      return inSingleLocation || inMultipleLocations;
    }).length || 0;
    
    return { ...loc, count };
  });

  // Staff at multiple locations
  const multiLocationStaff = staffData?.filter(staff => 
    staff.location_ids && staff.location_ids.length > 1
  ).length || 0;

  // Unassigned staff (no location)
  const unassignedStaff = staffData?.filter(staff => 
    !staff.location_id && (!staff.location_ids || staff.location_ids.length === 0)
  ).length || 0;

  return (
    <Card className={cn(tokens.card.wrapper, "p-6")}>
      <div className="flex items-center gap-3 mb-4">
        <div className={tokens.card.iconBox}>
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base tracking-wide">TEAM OVERVIEW</h2>
            <MetricInfoTooltip description="Shows how your active staff are distributed across locations. Identifies multi-location staff and unassigned team members." />
          </div>
          <p className="text-xs text-muted-foreground">Staff distribution across locations</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-3 border-b">
          <span className="text-sm text-muted-foreground">Total Staff</span>
          <span className="text-2xl font-display tabular-nums">{totalStaff}</span>
        </div>
        
        <div className="space-y-2">
          {staffByLocation.map((loc) => {
            const percentage = totalStaff > 0 ? (loc.count / totalStaff) * 100 : 0;
            
            return (
              <div key={loc.id} className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm truncate">{loc.name}</span>
                    <span className="text-sm text-muted-foreground tabular-nums shrink-0">{loc.count}</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-foreground/30 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="pt-2 border-t space-y-1">
          <p className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Multi-location staff</span>
            <span className="tabular-nums">{multiLocationStaff}</span>
          </p>
          {unassignedStaff > 0 && (
            <p className="text-xs text-muted-foreground flex items-center justify-between">
              <span>No location assigned</span>
              <span className="tabular-nums">{unassignedStaff}</span>
            </p>
          )}
        </div>
        
        {totalStaff === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            No active staff members yet
          </p>
        )}
      </div>
    </Card>
  );
}
