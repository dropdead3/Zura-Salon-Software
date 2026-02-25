import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Home, RotateCcw } from 'lucide-react';
import { useLandingPagePreference, useAvailableLandingPages } from '@/hooks/useLandingPagePreference';
import { cn } from '@/lib/utils';

export function LandingPageSettings() {
  const {
    customLandingPage,
    hasCustomLandingPage,
    setLandingPage,
    resetToDefault,
    isUpdating,
    defaultLandingPage,
  } = useLandingPagePreference();

  const availablePages = useAvailableLandingPages();

  const currentValue = customLandingPage || defaultLandingPage;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Home className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Login Landing Page</CardTitle>
              <CardDescription>
                Choose which page you see immediately after logging in
              </CardDescription>
            </div>
          </div>
          {hasCustomLandingPage && (
            <Button
              variant="outline"
              size={tokens.button.card}
              onClick={() => resetToDefault()}
              disabled={isUpdating}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={currentValue}
          onValueChange={(value) => setLandingPage(value)}
          disabled={isUpdating}
          className="grid gap-3"
        >
          {availablePages.map((option) => {
            const isDefault = option.path === defaultLandingPage;
            const isSelected = option.path === currentValue;

            return (
              <div key={option.path}>
                <Label
                  htmlFor={option.path}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={option.path} id={option.path} />
                    <span className="font-medium">{option.label}</span>
                    {isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        {isUpdating && (
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          A notification will appear in your dashboard header when a custom landing page is set.
        </p>
      </CardContent>
    </Card>
  );
}
