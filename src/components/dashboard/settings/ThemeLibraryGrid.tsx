import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WebsiteTheme } from '@/hooks/useWebsiteThemes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const COLOR_PREVIEWS: Record<string, { bg: string; accent: string; primary: string }> = {
  cream: { bg: 'hsl(40 30% 96%)', accent: 'hsl(35 35% 82%)', primary: 'hsl(0 0% 8%)' },
  rose: { bg: 'hsl(350 30% 97%)', accent: 'hsl(350 30% 85%)', primary: 'hsl(350 60% 55%)' },
  sage: { bg: 'hsl(145 25% 96%)', accent: 'hsl(145 25% 82%)', primary: 'hsl(145 45% 42%)' },
  ocean: { bg: 'hsl(210 30% 97%)', accent: 'hsl(210 28% 85%)', primary: 'hsl(210 60% 50%)' },
  midnight: { bg: 'hsl(230 20% 10%)', accent: 'hsl(45 60% 50%)', primary: 'hsl(45 70% 60%)' },
  terracotta: { bg: 'hsl(20 30% 95%)', accent: 'hsl(15 40% 65%)', primary: 'hsl(15 50% 45%)' },
};

interface ThemeLibraryGridProps {
  themes: WebsiteTheme[];
  activeThemeId: string;
  onActivate: (themeId: string) => void;
  onPreview: (themeId: string) => void;
  isActivating: boolean;
}

export function ThemeLibraryGrid({
  themes,
  activeThemeId,
  onActivate,
  onPreview,
  isActivating,
}: ThemeLibraryGridProps) {
  // Filter out the active theme (shown above) and sort available first
  const otherThemes = themes.filter((t) => t.id !== activeThemeId);

  if (otherThemes.length === 0) return null;

  return (
    <div>
      <h3 className="font-display text-base font-medium mb-3">THEME LIBRARY</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {otherThemes.map((theme) => {
          const colors = COLOR_PREVIEWS[theme.color_scheme] ?? COLOR_PREVIEWS.cream;
          const isActive = theme.id === activeThemeId;

          return (
            <Card
              key={theme.id}
              className={cn(
                'overflow-hidden transition-all hover:shadow-md',
                !theme.is_available && 'opacity-60',
                isActive && 'border-primary ring-2 ring-primary/20'
              )}
            >
              <CardContent className="p-0">
                {/* Preview gradient */}
                <div
                  className="h-28 relative"
                  style={{
                    background: `linear-gradient(135deg, ${colors.bg}, ${colors.accent})`,
                  }}
                >
                  {/* Mini layout mockup */}
                  <div className="absolute inset-3 flex flex-col gap-1.5">
                    <div
                      className="h-2 w-14 rounded-full"
                      style={{ backgroundColor: colors.primary, opacity: 0.6 }}
                    />
                    <div
                      className="h-1.5 w-20 rounded-full"
                      style={{ backgroundColor: colors.primary, opacity: 0.25 }}
                    />
                  </div>
                  {/* Color dots */}
                  <div className="absolute bottom-2 left-3 flex gap-1">
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: colors.bg, borderColor: colors.primary + '40' }}
                    />
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: colors.accent, borderColor: colors.primary + '40' }}
                    />
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: colors.primary, borderColor: colors.primary + '40' }}
                    />
                  </div>
                  {!theme.is_available && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-[10px]">
                        Coming Soon
                      </Badge>
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary text-primary-foreground text-[10px] gap-1">
                        <Check className="w-3 h-3" />
                        Active
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <div>
                    <p className="font-medium text-sm">{theme.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {theme.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {theme.is_available && !isActive ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size={tokens.button.inline} variant="default" className="flex-1 h-8 text-xs" disabled={isActivating}>
                            {isActivating ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : null}
                            Activate
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Activate "{theme.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will change your website's color scheme to{' '}
                              <span className="capitalize font-medium">{theme.color_scheme}</span>.
                              Your section content and customizations will be preserved.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onActivate(theme.id)}>
                              Activate Theme
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : theme.is_available ? (
                      <Button size={tokens.button.inline} variant="secondary" className="flex-1 h-8 text-xs" disabled>
                        <Check className="w-3 h-3 mr-1" />
                        Active
                      </Button>
                    ) : (
                      <Button size={tokens.button.inline} variant="secondary" className="flex-1 h-8 text-xs" disabled>
                        Coming Soon
                      </Button>
                    )}
                    {theme.is_available && (
                      <Button
                        size={tokens.button.inline}
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => onPreview(theme.id)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
