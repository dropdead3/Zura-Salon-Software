import { User } from 'lucide-react';
import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';

export interface BookingStylist {
  id: string;
  name: string;
  photoUrl?: string | null;
  bio?: string | null;
  level?: string | null;
}

interface BookingStylistPickerProps {
  stylists: BookingStylist[];
  theme: BookingSurfaceTheme;
  showBios: boolean;
  onSelect: (stylistId: string) => void;
}

export function BookingStylistPicker({ stylists, theme, showBios, onSelect }: BookingStylistPickerProps) {
  if (!stylists.length) {
    return (
      <div className="text-center py-12" style={{ color: theme.mutedTextColor }}>
        <p>No stylists available for this service.</p>
      </div>
    );
  }

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

      {stylists.map((stylist) => (
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
            {stylist.photoUrl ? (
              <img
                src={stylist.photoUrl}
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
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
