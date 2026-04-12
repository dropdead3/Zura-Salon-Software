import { Clock, Star, MessageCircle } from 'lucide-react';
import type { BookingSurfaceTheme, BookingSurfaceFlow } from '@/hooks/useBookingSurfaceConfig';

interface BookingServiceCardProps {
  name: string;
  description: string | null;
  price: string | null;
  duration?: number | null;
  isPopular?: boolean;
  requiresConsultation?: boolean;
  theme: BookingSurfaceTheme;
  flow: BookingSurfaceFlow;
  onSelect: () => void;
}

export function BookingServiceCard({
  name, description, price, duration, isPopular, requiresConsultation, theme, flow, onSelect,
}: BookingServiceCardProps) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{
        backgroundColor: theme.surfaceColor,
        borderRadius: `var(--bk-card-radius, 8px)`,
        border: `1px solid ${theme.borderColor}`,
        boxShadow: `var(--bk-shadow, none)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium" style={{ color: theme.textColor }}>
              {name}
            </span>
            {isPopular && (
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}
              >
                <Star className="w-3 h-3" /> Popular
              </span>
            )}
            {requiresConsultation && (
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${theme.accentColor}20`, color: theme.accentColor }}
              >
                <MessageCircle className="w-3 h-3" /> Consultation
              </span>
            )}
          </div>
          {flow.showDescriptions && description && (
            <p className="text-sm mt-1 line-clamp-2" style={{ color: theme.mutedTextColor }}>
              {description}
            </p>
          )}
          {flow.showDuration && duration && (
            <div className="flex items-center gap-1 text-xs mt-2" style={{ color: theme.mutedTextColor }}>
              <Clock className="w-3.5 h-3.5" />
              <span>{duration} min</span>
            </div>
          )}
        </div>
        {flow.showPrices && price && (
          <span className="text-sm font-medium whitespace-nowrap" style={{ color: theme.primaryColor }}>
            {price}
          </span>
        )}
      </div>
    </button>
  );
}
