import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

export interface DashboardPageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Path to navigate when back is clicked (e.g. hub or list). */
  backTo?: string;
  /** Callback for back button when navigation is state-driven instead of URL-driven. */
  onBackClick?: () => void;
  /** Accessible label for back button; e.g. "Back to Analytics Hub". */
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Lightweight page header for dashboard hub and detail pages.
 * Use for consistent "Back to [Hub name]" behavior when depth > 1.
 */
export function DashboardPageHeader({
  title,
  description,
  backTo,
  onBackClick,
  backLabel = 'Back',
  actions,
  className,
}: DashboardPageHeaderProps) {
  const showBack = backTo || onBackClick;

  return (
    <div className={cn('flex flex-col md:flex-row md:items-start md:justify-between gap-4', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          onBackClick ? (
            <Button variant="ghost" size="icon" className="shrink-0" onClick={onBackClick} aria-label={backLabel} title={backLabel}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link to={backTo!} aria-label={backLabel} title={backLabel}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
          )
        )}

        <div className="min-w-0">
          <h1 className={cn(tokens.heading.page, 'break-words')}>{title}</h1>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
      </div>

      {actions && <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
