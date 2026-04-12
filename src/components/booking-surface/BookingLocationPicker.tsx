import { MapPin } from 'lucide-react';
import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';

export interface BookingLocation {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

interface BookingLocationPickerProps {
  locations: BookingLocation[];
  theme: BookingSurfaceTheme;
  onSelect: (locationId: string) => void;
}

export function BookingLocationPicker({ locations, theme, onSelect }: BookingLocationPickerProps) {
  if (locations.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: theme.mutedTextColor }}>
        <p>No locations available.</p>
      </div>
    );
  }

  // Auto-select if only one location
  if (locations.length === 1) {
    onSelect(locations[0].id);
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {locations.map((loc) => (
        <button
          key={loc.id}
          onClick={() => onSelect(loc.id)}
          className="p-4 text-left transition-all hover:scale-[1.01]"
          style={{
            backgroundColor: theme.surfaceColor,
            borderRadius: 'var(--bk-card-radius, 8px)',
            border: `1px solid ${theme.borderColor}`,
            boxShadow: 'var(--bk-shadow, none)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${theme.primaryColor}15` }}
            >
              <MapPin className="w-5 h-5" style={{ color: theme.primaryColor }} />
            </div>
            <div>
              <p className="font-medium" style={{ color: theme.textColor }}>{loc.name}</p>
              {(loc.address || loc.city) && (
                <p className="text-sm" style={{ color: theme.mutedTextColor }}>
                  {[loc.address, loc.city, loc.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
