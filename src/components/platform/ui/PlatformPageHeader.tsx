import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PlatformButton } from './PlatformButton';
import { cn } from '@/lib/utils';

export interface PlatformPageHeaderProps {
  title: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PlatformPageHeader({
  title,
  description,
  backTo,
  backLabel = 'Go back',
  actions,
  className,
}: PlatformPageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex items-start gap-3">
        {backTo && (
          <PlatformButton
            variant="ghost"
            size="icon"
            onClick={() => navigate(backTo)}
            aria-label={backLabel}
            className="mt-1 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </PlatformButton>
        )}
        <div>
          <h1 className="text-3xl font-display font-medium tracking-wide text-[hsl(var(--platform-foreground))]">{title}</h1>
          {description && (
            <p className="text-[hsl(var(--platform-foreground-muted))]">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
