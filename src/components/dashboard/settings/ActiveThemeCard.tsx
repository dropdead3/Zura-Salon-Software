import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Paintbrush, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WebsiteTheme } from '@/hooks/useWebsiteThemes';

// Color scheme preview palette
const COLOR_PREVIEWS: Record<string, { bg: string; accent: string; primary: string }> = {
  cream: { bg: 'hsl(40 30% 96%)', accent: 'hsl(35 35% 82%)', primary: 'hsl(0 0% 8%)' },
  rose: { bg: 'hsl(350 30% 97%)', accent: 'hsl(350 30% 85%)', primary: 'hsl(350 60% 55%)' },
  sage: { bg: 'hsl(145 25% 96%)', accent: 'hsl(145 25% 82%)', primary: 'hsl(145 45% 42%)' },
  ocean: { bg: 'hsl(210 30% 97%)', accent: 'hsl(210 28% 85%)', primary: 'hsl(210 60% 50%)' },
};

interface ActiveThemeCardProps {
  theme: WebsiteTheme;
  onCustomize: () => void;
  onPreview: () => void;
}

export function ActiveThemeCard({ theme, onCustomize, onPreview }: ActiveThemeCardProps) {
  const colors = COLOR_PREVIEWS[theme.color_scheme] ?? COLOR_PREVIEWS.cream;

  return (
    <Card className="overflow-hidden border-primary/30 shadow-md">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Theme visual preview */}
          <div
            className="w-full md:w-64 h-40 md:h-auto relative flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${colors.bg}, ${colors.accent})` }}
          >
            {/* Mock layout */}
            <div className="absolute inset-4 flex flex-col gap-2">
              <div className="h-3 w-20 rounded-full" style={{ backgroundColor: colors.primary, opacity: 0.7 }} />
              <div className="h-2 w-32 rounded-full" style={{ backgroundColor: colors.primary, opacity: 0.3 }} />
              <div className="flex-1" />
              <div className="flex gap-1.5">
                <div className="w-6 h-6 rounded-full border-2" style={{ backgroundColor: colors.bg, borderColor: colors.primary }} />
                <div className="w-6 h-6 rounded-full border-2" style={{ backgroundColor: colors.accent, borderColor: colors.primary }} />
                <div className="w-6 h-6 rounded-full border-2" style={{ backgroundColor: colors.primary, borderColor: colors.primary }} />
              </div>
            </div>
            <div className="absolute top-3 right-3">
              <Badge className="bg-primary text-primary-foreground text-[10px] gap-1">
                <Check className="w-3 h-3" />
                Live
              </Badge>
            </div>
          </div>

          {/* Theme info */}
          <div className="flex-1 p-5 flex flex-col justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-medium">{theme.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{theme.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-muted-foreground">
                  Color: <span className="capitalize">{theme.color_scheme}</span>
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  Layout: <span className="capitalize">{(theme.layout_config as Record<string, string>)?.hero_style ?? 'standard'}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onCustomize} className="gap-2">
                <Paintbrush className="w-4 h-4" />
                Customize Theme
              </Button>
              <Button variant="outline" onClick={onPreview} className="gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
