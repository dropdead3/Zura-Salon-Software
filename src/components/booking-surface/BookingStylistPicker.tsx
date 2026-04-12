import { User, Calendar } from 'lucide-react';
import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';
import type { EligibleStylist } from '@/hooks/useBookingAvailability';
import { format, parseISO } from 'date-fns';

export interface BookingStylist {
  id: string;
  name: string;
  photoUrl?: string | null;
  bio?: string | null;
  level?: string | null;
  nextAvailableDate?: string | null;
}

interface BookingStylistPickerProps {
  stylists: (BookingStylist | EligibleStylist)[];
  theme: BookingSurfaceTheme;
  showBios: boolean;
  onSelect: (stylistId: string) => void;
}

export function BookingStylistPicker({ stylists, theme, showBios, onSelect }: BookingStylistPickerProps) {
  if (!stylists.length) {
    return (
      <div className="text-center py-12" style={{ color: theme.mutedTextColor }}>
        <p className="text-lg font-medium">No stylists available</p>
        <p className="text-sm mt-1">No stylists are currently available for online booking with this service.</p>
      </div>
    );
  }

  const getPhoto = (s: BookingStylist | EligibleStylist) =>
    'photoUrl' in s ? s.photoUrl : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* "Any Available" option */}
      <button
        onClick={() => onSelect('any')}
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
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${theme.primaryColor}15` }}
          >
            <User className="w-5 h-5" style={{ color: theme.primaryColor }} />
          </div>
          <div>
            <p className="font-medium" style={{ color: theme.textColor }}>Any Available Stylist</p>
            <p className="text-sm" style={{ color: theme.mutedTextColor }}>First available appointment</p>
          </div>
        </div>
      </button>

      {stylists.map((stylist) => {
        const photo = getPhoto(stylist);
        const nextAvail = 'nextAvailableDate' in stylist ? stylist.nextAvailableDate : null;

        return (
          <button
            key={stylist.id}
            onClick={() => onSelect(stylist.id)}
            className="p-4 text-left transition-all hover:scale-[1.01]"
            style={{
              backgroundColor: theme.surfaceColor,
              borderRadius: 'var(--bk-card-radius, 8px)',
              border: `1px solid ${theme.borderColor}`,
              boxShadow: 'var(--bk-shadow, none)',
            }}
          >
            <div className="flex items-center gap-3">
              {photo ? (
                <img
                  src={photo}
                  alt={stylist.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium"
                  style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}
                >
                  {stylist.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium" style={{ color: theme.textColor }}>{stylist.name}</p>
                {stylist.level && (
                  <p className="text-xs" style={{ color: theme.mutedTextColor }}>{stylist.level}</p>
                )}
                {showBios && stylist.bio && (
                  <p className="text-sm mt-1 line-clamp-2" style={{ color: theme.mutedTextColor }}>{stylist.bio}</p>
                )}
                {nextAvail && (
                  <div className="flex items-center gap-1 text-xs mt-1" style={{ color: theme.mutedTextColor }}>
                    <Calendar className="w-3 h-3" />
                    <span>Next available {format(parseISO(nextAvail), 'EEE, MMM d')}</span>
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
