import { useState } from 'react';
import { Monitor, Smartphone, LayoutGrid } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BookingSurfaceConfig } from '@/hooks/useBookingSurfaceConfig';

interface BookingLivePreviewProps {
  config: BookingSurfaceConfig;
}

type PreviewMode = 'desktop' | 'mobile' | 'widget';

const PREVIEW_MODES = [
  { value: 'desktop' as const, icon: Monitor, label: 'Desktop' },
  { value: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
  { value: 'widget' as const, icon: LayoutGrid, label: 'Widget' },
];

export function BookingLivePreview({ config }: BookingLivePreviewProps) {
  const [mode, setMode] = useState<PreviewMode>('desktop');
  const { theme } = config;

  const containerWidth = mode === 'mobile' ? 375 : mode === 'widget' ? 400 : '100%';
  const containerHeight = mode === 'mobile' ? 667 : 500;

  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-base tracking-wide">LIVE PREVIEW</CardTitle>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {PREVIEW_MODES.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  mode === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                title={label}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <div
            className="rounded-xl border border-border overflow-hidden transition-all duration-300"
            style={{
              width: typeof containerWidth === 'number' ? containerWidth : undefined,
              maxWidth: typeof containerWidth === 'string' ? containerWidth : undefined,
              height: containerHeight,
            }}
          >
            {/* Mini preview rendering */}
            <div
              className="h-full overflow-auto"
              style={{
                backgroundColor: theme.backgroundColor,
                color: theme.textColor,
                fontFamily: theme.fontFamily === 'dm-sans' ? "'DM Sans', sans-serif" : theme.fontFamily === 'inter' ? "'Inter', sans-serif" : theme.fontFamily === 'cormorant' ? "'Cormorant Garamond', serif" : theme.fontFamily === 'playfair' ? "'Playfair Display', serif" : "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {/* Header preview */}
              <div className="p-4 border-b" style={{ borderColor: theme.borderColor }}>
                {theme.logoUrl ? (
                  <img src={theme.logoUrl} alt="Logo" className="h-8 object-contain" />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.primaryColor }} />
                    <span className="text-sm font-medium" style={{ color: theme.textColor }}>
                      {config.hosted.pageTitle || 'Your Salon'}
                    </span>
                  </div>
                )}
              </div>

              {/* Intro */}
              {config.hosted.introText && (
                <div className="px-4 pt-4">
                  <p className="text-xs" style={{ color: theme.mutedTextColor }}>{config.hosted.introText}</p>
                </div>
              )}

              {/* Service cards preview */}
              <div className="p-4 space-y-2">
                <p className="text-xs font-medium mb-2" style={{ color: theme.mutedTextColor }}>
                  Select a Service
                </p>
                {['Color & Highlights', 'Cut & Style', 'Treatments'].map((name, i) => (
                  <div
                    key={name}
                    className="p-3 rounded-lg border transition-colors"
                    style={{
                      backgroundColor: i === 0 ? `${theme.primaryColor}08` : theme.surfaceColor,
                      borderColor: i === 0 ? theme.primaryColor : theme.borderColor,
                      borderRadius: theme.cardRadius === 'none' ? 0 : theme.cardRadius === 'sm' ? 4 : theme.cardRadius === 'lg' ? 16 : 8,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: theme.textColor }}>{name}</span>
                      {config.flow.showPrices && (
                        <span className="text-xs" style={{ color: theme.mutedTextColor }}>from $45</span>
                      )}
                    </div>
                    {config.flow.showDuration && (
                      <span className="text-[10px]" style={{ color: theme.mutedTextColor }}>60 min</span>
                    )}
                  </div>
                ))}

                {/* CTA button preview */}
                <div className="pt-3">
                  <div
                    className="w-full py-2.5 text-center text-xs font-medium text-white"
                    style={{
                      backgroundColor: theme.primaryColor,
                      borderRadius: theme.buttonRadius === 'none' ? 0 : theme.buttonRadius === 'sm' ? 4 : theme.buttonRadius === 'lg' ? 16 : theme.buttonRadius === 'full' ? 9999 : 8,
                    }}
                  >
                    Continue
                  </div>
                </div>
              </div>

              {/* Powered by */}
              {config.hosted.poweredByVisible && (
                <div className="text-center py-3">
                  <span className="text-[10px]" style={{ color: theme.mutedTextColor }}>Powered by Zura</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
