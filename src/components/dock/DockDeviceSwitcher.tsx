import { useEffect } from 'react';
import { Monitor, Smartphone, Tablet, RotateCcw, MapPin } from 'lucide-react';
import { TogglePill } from '@/components/ui/toggle-pill';
import { useLocations } from '@/hooks/useLocations';
import type { DockDevice, DockOrientation } from '@/hooks/dock/useDockDevicePreview';

interface DockDeviceSwitcherProps {
  device: DockDevice;
  onChange: (device: DockDevice) => void;
  orientation: DockOrientation;
  onOrientationChange: (orientation: DockOrientation) => void;
  locationId?: string;
  onLocationChange?: (locationId: string) => void;
  organizationId?: string;
}

const deviceOptions = [
  { value: 'phone', label: 'Phone', icon: <Smartphone className="w-3.5 h-3.5" /> },
  { value: 'tablet', label: 'Tablet', icon: <Tablet className="w-3.5 h-3.5" /> },
  { value: 'full', label: 'Full', icon: <Monitor className="w-3.5 h-3.5" /> },
];

export function DockDeviceSwitcher({ device, onChange, orientation, onOrientationChange, locationId, onLocationChange, organizationId }: DockDeviceSwitcherProps) {
  const showRotate = device === 'tablet';
  const { data: locations = [] } = useLocations(organizationId);

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

  const selectedName = locations.find(l => l.id === locationId)?.name;

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
      {/* Location selector */}
      {locations.length > 0 && (
        <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[hsl(0_0%_14%)] border border-[hsl(0_0%_20%)] text-white/60">
          <MapPin className="w-3 h-3 shrink-0" />
          <select
            value={locationId || ''}
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

      {showRotate && (
        <button
          type="button"
          onClick={() => onOrientationChange(orientation === 'portrait' ? 'landscape' : 'portrait')}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-foreground/10 backdrop-blur-md text-foreground/60 hover:text-foreground/80 transition-colors"
          title={orientation === 'portrait' ? 'Switch to landscape' : 'Switch to portrait'}
        >
          <RotateCcw className={`w-3.5 h-3.5 transition-transform duration-300 ${orientation === 'landscape' ? 'rotate-90' : ''}`} />
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
