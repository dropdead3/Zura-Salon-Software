import type { PublicServiceCategory } from '@/hooks/usePublicServicesForWebsite';
import type { BookingSurfaceTheme, BookingSurfaceFlow } from '@/hooks/useBookingSurfaceConfig';
import { BookingServiceCard } from './BookingServiceCard';
import { ChevronRight } from 'lucide-react';

interface BookingServiceBrowserProps {
  categories: PublicServiceCategory[];
  theme: BookingSurfaceTheme;
  flow: BookingSurfaceFlow;
  defaultLevelSlug?: string;
  onSelectService: (serviceName: string, category: string) => void;
}

export function BookingServiceBrowser({
  categories, theme, flow, defaultLevelSlug, onSelectService,
}: BookingServiceBrowserProps) {
  if (!categories.length) {
    return (
      <div className="text-center py-12" style={{ color: theme.mutedTextColor }}>
        <p className="text-lg font-medium">No services available</p>
        <p className="text-sm mt-1">Check back soon for available services.</p>
      </div>
    );
  }

  return (
    <div style={{ gap: 'var(--bk-gap, 16px)' }} className="flex flex-col">
      {categories.map((cat) => {
        if (!cat.items.length) return null;
        return (
          <div key={cat.category}>
            <div className="flex items-center gap-2 mb-3">
              <h3
                className="font-medium"
                style={{
                  color: theme.textColor,
                  textTransform: theme.headingStyle === 'uppercase' ? 'uppercase' : undefined,
                  letterSpacing: theme.headingStyle === 'uppercase' ? '0.04em' : undefined,
                }}
              >
                {cat.category}
              </h3>
              {cat.description && (
                <span className="text-xs" style={{ color: theme.mutedTextColor }}>
                  — {cat.description}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {cat.items.map((item) => {
                const priceKey = defaultLevelSlug || Object.keys(item.prices)[0];
                const price = priceKey ? item.prices[priceKey] : null;

                return (
                  <BookingServiceCard
                    key={item.name}
                    name={item.name}
                    description={item.description}
                    price={price}
                    isPopular={item.isPopular}
                    theme={theme}
                    flow={flow}
                    onSelect={() => onSelectService(item.name, cat.category)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
