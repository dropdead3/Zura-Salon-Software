import type { PublicServiceCategory } from '@/hooks/usePublicServicesForWebsite';
import type { BookingSurfaceTheme, BookingSurfaceFlow } from '@/hooks/useBookingSurfaceConfig';
import type { EligibleService } from '@/hooks/useBookingEligibleServices';
import { BookingServiceCard } from './BookingServiceCard';

interface BookingServiceBrowserProps {
  categories: PublicServiceCategory[];
  theme: BookingSurfaceTheme;
  flow: BookingSurfaceFlow;
  defaultLevelSlug?: string;
  eligibleServices?: EligibleService[];
  onSelectService: (serviceName: string, category: string) => void;
}

export function BookingServiceBrowser({
  categories, theme, flow, defaultLevelSlug, eligibleServices, onSelectService,
}: BookingServiceBrowserProps) {
  // If we have eligible services from the availability engine, use those to filter
  const eligibleNames = eligibleServices
    ? new Set(eligibleServices.map((s) => s.name))
    : null;

  const eligibleMap = eligibleServices
    ? new Map(eligibleServices.map((s) => [s.name, s]))
    : null;

  // Filter categories down to only eligible services
  const filteredCategories = categories.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => {
      if (!eligibleNames) return true;
      return eligibleNames.has(item.name);
    }),
  })).filter((cat) => cat.items.length > 0);

  if (!filteredCategories.length) {
    return (
      <div className="text-center py-12" style={{ color: theme.mutedTextColor }}>
        <p className="text-lg font-medium">No services available</p>
        <p className="text-sm mt-1">Check back soon for available services.</p>
      </div>
    );
  }

  return (
    <div style={{ gap: 'var(--bk-gap, 16px)' }} className="flex flex-col">
      {filteredCategories.map((cat) => (
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
              const eligible = eligibleMap?.get(item.name);
              const priceKey = defaultLevelSlug || Object.keys(item.prices)[0];
              const price = eligible?.price != null
                ? `$${eligible.price}`
                : priceKey ? item.prices[priceKey] : null;
              const duration = eligible?.durationMinutes ?? item.durationMinutes ?? null;
              const requiresConsultation = eligible?.requiresConsultation ?? false;

              return (
                <BookingServiceCard
                  key={item.name}
                  name={item.name}
                  description={item.description}
                  price={price}
                  duration={duration}
                  isPopular={item.isPopular}
                  requiresConsultation={requiresConsultation}
                  theme={theme}
                  flow={flow}
                  onSelect={() => onSelectService(item.name, cat.category)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
