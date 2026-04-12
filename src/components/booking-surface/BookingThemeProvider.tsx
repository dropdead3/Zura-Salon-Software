import { useEffect, type ReactNode } from 'react';
import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';

const FONT_MAP: Record<string, string> = {
  'inter': "'Inter', sans-serif",
  'dm-sans': "'DM Sans', sans-serif",
  'plus-jakarta': "'Plus Jakarta Sans', sans-serif",
  'cormorant': "'Cormorant Garamond', serif",
  'playfair': "'Playfair Display', serif",
};

const GOOGLE_FONT_URLS: Record<string, string> = {
  'inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap',
  'dm-sans': 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap',
  'plus-jakarta': 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap',
  'cormorant': 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&display=swap',
  'playfair': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;500;600&display=swap',
};

const RADIUS_MAP = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '16px',
  full: '9999px',
};

const ELEVATION_MAP = {
  flat: 'none',
  subtle: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  elevated: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
};

const DENSITY_MAP = {
  compact: { gap: '12px', padding: '12px' },
  comfortable: { gap: '16px', padding: '20px' },
  spacious: { gap: '24px', padding: '28px' },
};

interface BookingThemeProviderProps {
  theme: BookingSurfaceTheme;
  children: ReactNode;
}

export function BookingThemeProvider({ theme, children }: BookingThemeProviderProps) {
  // Inject Google Font
  useEffect(() => {
    const fontUrl = GOOGLE_FONT_URLS[theme.fontFamily];
    if (!fontUrl) return;

    const linkId = `booking-font-${theme.fontFamily}`;
    if (document.getElementById(linkId)) return;

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = fontUrl;
    document.head.appendChild(link);
  }, [theme.fontFamily]);

  const density = DENSITY_MAP[theme.density];

  const style: Record<string, string> = {
    '--bk-primary': theme.primaryColor,
    '--bk-secondary': theme.secondaryColor,
    '--bk-accent': theme.accentColor,
    '--bk-bg': theme.backgroundColor,
    '--bk-surface': theme.surfaceColor,
    '--bk-text': theme.textColor,
    '--bk-muted': theme.mutedTextColor,
    '--bk-border': theme.borderColor,
    '--bk-btn-radius': RADIUS_MAP[theme.buttonRadius],
    '--bk-card-radius': RADIUS_MAP[theme.cardRadius],
    '--bk-font': FONT_MAP[theme.fontFamily] || FONT_MAP['dm-sans'],
    '--bk-shadow': ELEVATION_MAP[theme.elevation],
    '--bk-gap': density.gap,
    '--bk-padding': density.padding,
  };

  return (
    <div
      style={style as React.CSSProperties}
      className="min-h-screen"
      data-booking-theme={theme.mode}
    >
      <div
        style={{
          fontFamily: FONT_MAP[theme.fontFamily] || FONT_MAP['dm-sans'],
          backgroundColor: theme.backgroundColor,
          color: theme.textColor,
        }}
        className="min-h-screen"
      >
        {children}
      </div>
    </div>
  );
}
