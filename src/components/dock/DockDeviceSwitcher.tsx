import { useEffect } from 'react';
import { Monitor, Smartphone, Tablet, RotateCcw, MapPin, User } from 'lucide-react';
import { TogglePill } from '@/components/ui/toggle-pill';
import { useLocations } from '@/hooks/useLocations';
import { useDockDemo } from '@/contexts/DockDemoContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DockDevice, DockOrientation } from '@/hooks/dock/useDockDevicePreview';
import { formatFirstLastInitial } from '@/lib/dock-utils';

interface DockDeviceSwitcherProps {
  device: DockDevice;
  onChange: (device: DockDevice) => void;
  orientation: DockOrientation;
  onOrientationChange: (orientation: DockOrientation) => void;
  locationId?: string;
  onLocationChange?: (locationId: string) => void;
  organizationId?: string;
  staffFilter?: string;
  onStaffFilterChange?: (staffId: string) => void;
}

const deviceOptions = [
  { value: 'phone', label: 'Phone', icon: <Smartphone className="w-3.5 h-3.5" /> },
  { value: 'tablet', label: 'Tablet', icon: <Tablet className="w-3.5 h-3.5" /> },
  { value: 'full', label: 'Full', icon: <Monitor className="w-3.5 h-3.5" /> },
];

export function DockDeviceSwitcher({ device, onChange, orientation, onOrientationChange, locationId, onLocationChange, organizationId, staffFilter, onStaffFilterChange }: DockDeviceSwitcherProps) {
  const showRotate = device === 'tablet';
  const { data: locations = [] } = useLocations(organizationId);
  const { usesRealData } = useDockDemo();

  // Fetch team members for the selected location (demo mode only)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['dock-team-members', organizationId, locationId],
    queryFn: async () => {
      if (!organizationId || !locationId) return [];
      const { data } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name, location_id, location_ids')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('is_approved', true)
        .order('display_name', { ascending: true });
      // Filter to members whose location_id or location_ids includes the selected location
      return (data || [])
        .filter(p => p.location_id === locationId || (p.location_ids && p.location_ids.includes(locationId)))
        .map(p => ({
          userId: p.user_id,
          name: formatFirstLastInitial(p.display_name || p.full_name || 'Unknown'),
        }));
    },
    enabled: usesRealData && !!organizationId && !!locationId,
    staleTime: 300_000,
  });

  // Auto-select first location if none configured
  useEffect(() => {
    if (!locationId && locations.length > 0 && onLocationChange) {
      const firstId = locations[0].id;
      try { localStorage.setItem('dock-location-id', firstId); } catch {}
      onLocationChange(firstId);
    }
  }, [locations, locationId, onLocationChange]);

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    try { localStorage.setItem('dock-location-id', val); } catch {}
    onLocationChange?.(val);
  };

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
      {/* Location selector */}
      {locations.length > 0 && (
        <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[hsl(0_0%_14%)] border border-[hsl(0_0%_20%)] text-white/60">
          <MapPin className="w-3 h-3 shrink-0" />
          <select
            value={locationId || '')}
            onChange={handleLocationChange}
            className="bg-transparent text-xs text-white/80 outline-none cursor-pointer appearance-none pr-1 max-w-[120px] truncate"
          >
            <option value="" disabled className="bg-[hsl(0_0%_14%)] text-white/60">
              Set location
            </option>
            {locations.map(l => (
              <option key={l.id} value={l.id} className="bg-[hsl(0_0%_14%)] text-white">
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Team member filter (demo mode with real data only) */}
      {usesRealData && teamMembers.length > 0 && (
        <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[hsl(0_0%_14%)] border border-[hsl(0_0%_20%)] text-white/60">
          <User className="w-3 h-3 shrink-0" />
          <select
            value={staffFilter || 'all')}
            onChange={(e) => onStaffFilterChange?.(e.target.value)}
            className="bg-transparent text-xs text-white/80 outline-none cursor-pointer appearance-none pr-1 max-w-[120px] truncate"
          >
            <option value="all" className="bg-[hsl(0_0%_14%)] text-white">
              All Team
            </option>
            {teamMembers.map(m => (
              <option key={m.userId} value={m.userId} className="bg-[hsl(0_0%_14%)] text-white">
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {showRotate && (
        <button
          type="button"
          onClick={() => onOrientationChange(orientation === 'portrait' ? 'landscape' : 'portrait')}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-foreground/10 backdrop-blur-md text-foreground/60 hover:text-foreground/80 transition-colors"
          title={orientation === 'portrait' ? 'Switch to landscape' : 'Switch to portrait')}
        >
          <RotateCcw className={`w-3.5 h-3.5 transition-transform duration-300 ${orientation === 'landscape' ? 'rotate-90' : '')}`} />
        </button>
      )}
      <TogglePill
        options={deviceOptions}
        value={device}
        onChange={(v) => onChange(v as DockDevice)}
        size="sm"
        variant="glass"
        className="!bg-[hsl(0_0%_14%)] border border-[hsl(0_0%_20%)] [&_button]:text-white/60 [&_button:hover]:text-white/80"
      />
    </div>
  );
}
