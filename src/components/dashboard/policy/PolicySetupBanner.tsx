/**
 * Policy Setup Banner (Wave 28.3)
 *
 * Surfaces on the Policies dashboard when no profile exists yet.
 * Drives the user into the setup wizard so the library can recommend intelligently.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  onStart: () => void;
  hasProfile: boolean;
}

export function PolicySetupBanner({ onStart, hasProfile }: Props) {
  return (
    <Card className="rounded-xl border-primary/30 bg-gradient-to-br from-primary/5 via-card/80 to-card/80">
      <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn(tokens.heading.card)}>
              {hasProfile ? 'Update your business profile' : 'Tell us about your business first'}
            </h3>
            <p className="font-sans text-sm text-muted-foreground mt-1 max-w-2xl">
              {hasProfile
                ? 'Re-run the wizard to refresh recommendations based on what you offer today.'
                : 'A 4-step setup tells us which of the 47 recommended policies actually apply to how you operate. Without this, the library shows everything.'}
            </p>
          </div>
        </div>
        <Button onClick={onStart} className="font-sans shrink-0" size="sm">
          {hasProfile ? 'Update profile' : 'Start setup'}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
