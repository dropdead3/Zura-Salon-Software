import type { BookingSurfaceTheme, BookingSurfaceHosted } from '@/hooks/useBookingSurfaceConfig';

interface BookingHeaderProps {
  salonName: string;
  theme: BookingSurfaceTheme;
  hosted: BookingSurfaceHosted;
}

export function BookingHeader({ salonName, theme, hosted }: BookingHeaderProps) {
  return (
    <header
      className="border-b py-5 px-6"
      style={{ borderColor: theme.borderColor, backgroundColor: theme.surfaceColor }}
    >
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        {theme.logoUrl && (
          <img
            src={theme.logoUrl}
            alt={`${salonName} logo`}
            className="h-10 w-auto object-contain"
          />
        )}
        <div>
          <h1
            className="text-xl font-medium"
            style={{
              color: theme.textColor,
              textTransform: theme.headingStyle === 'uppercase' ? 'uppercase' : theme.headingStyle === 'lowercase' ? 'lowercase' : 'none',
              letterSpacing: theme.headingStyle === 'uppercase' ? '0.05em' : undefined,
            }}
          >
            {hosted.pageTitle || salonName}
          </h1>
          {hosted.introText && (
            <p className="text-sm mt-1" style={{ color: theme.mutedTextColor }}>
              {hosted.introText}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
