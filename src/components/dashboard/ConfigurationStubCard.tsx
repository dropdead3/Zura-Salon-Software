/**
 * ConfigurationStubCard — Canonical stub for togglable dashboard sections whose
 * prerequisite (entitlement, schedule, integration, etc.) is not yet configured.
 *
 * Doctrine: distinguish materiality silence (Visibility Contract — `return null`)
 * from configuration silence (this primitive). When an operator explicitly
 * toggles a section ON via the Customize menu, silence reads as "broken UI."
 * This stub honors the opt-in by surfacing what's missing and how to fix it.
 *
 * Dismissal persists in `user_preferences.dashboard_layout.dismissedStubs[]`
 * (cross-device) via `useDismissedStubs`. Reset via the Customize menu.
 */
import type { LucideIcon } from 'lucide-react';
import { Settings, X, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { useDismissedStubs } from '@/hooks/dashboard/useDismissedStubs';
import { reportVisibilitySuppression } from '@/lib/dev/visibility-contract-bus';
import { useEffect } from 'react';

export interface ConfigurationStubCardProps {
  /** Section ID from the Customize menu — drives dismiss persistence and the dev bus reason. */
  sectionId: string;
  /** Short title (e.g., "Payday Countdown"). */
  title: string;
  /** One-line reason explaining what's missing (e.g., "Connect payroll to surface your next paycheck"). */
  reason: string;
  /** CTA label (e.g., "Configure"). */
  ctaLabel: string;
  /** Internal route the CTA navigates to. Use `dashPath()` from `useOrgDashboardPath` to build this. */
  ctaTo: string;
  /** Optional icon. Defaults to Settings cog. */
  icon?: LucideIcon;
  /** Allow dismissal. Defaults to true. */
  dismissible?: boolean;
}

export function ConfigurationStubCard({
  sectionId,
  title,
  reason,
  ctaLabel,
  ctaTo,
  icon: Icon = Settings,
  dismissible = true,
}: ConfigurationStubCardProps) {
  const { isDismissed, dismiss, isUpdating } = useDismissedStubs();

  // Mirror to the visibility-contract bus so dev tooling can distinguish
  // configuration-gated stubs from materiality silence. See:
  // mem://architecture/visibility-contracts (`awaiting-configuration` reason).
  useEffect(() => {
    reportVisibilitySuppression(sectionId, 'awaiting-configuration', { ctaTo });
  }, [sectionId, ctaTo]);

  if (isDismissed(sectionId)) return null;

  return (
    <Card className="border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/5">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{reason}</p>
          </div>
          <Button variant="ghost" size={tokens.button.inline} asChild>
            <Link to={ctaTo}>
              {ctaLabel} <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
          {dismissible && (
            <button
              onClick={() => dismiss(sectionId)}
              disabled={isUpdating}
              className={cn(
                'p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground',
                isUpdating && 'opacity-50 cursor-not-allowed',
              )}
              aria-label={`Dismiss ${title}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
