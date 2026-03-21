import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import type { ControlTowerAlert } from '@/lib/backroom/control-tower-engine';

interface ControlTowerAlertCardProps {
  alert: ControlTowerAlert;
}

const PRIORITY_BAR: Record<string, string> = {
  critical: 'bg-destructive',
  high: 'bg-warning',
  medium: 'bg-accent',
  informational: 'bg-muted-foreground/40',
};

export function ControlTowerAlertCard({ alert }: ControlTowerAlertCardProps) {
  const navigate = useNavigate();

  return (
    <div className={cn(tokens.card.inner, 'flex overflow-hidden')}>
      {/* Priority bar */}
      <div className={cn('w-1 shrink-0 rounded-l-lg', PRIORITY_BAR[alert.priority])} />

      <div className="flex-1 px-4 py-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className={cn(tokens.label.tiny, 'text-muted-foreground')}>
              {alert.category}
            </span>
            <h4 className={cn(tokens.body.emphasis, 'mt-0.5')}>{alert.title}</h4>
          </div>
        </div>

        {/* Description */}
        <p className={tokens.body.muted}>{alert.description}</p>

        {/* Metrics */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(alert.metrics).map(([key, val]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-md bg-muted/50 border border-border/40 px-2 py-0.5 text-xs text-muted-foreground"
            >
              <span className="font-medium text-foreground">{val}</span>
              <span>{key}</span>
            </span>
          ))}
        </div>

        {/* Action */}
        <div className="flex items-center justify-between pt-1">
          <span className={cn(tokens.body.muted, 'text-xs italic')}>
            {alert.suggestedAction}
          </span>
          <Button
            variant="ghost"
            size={tokens.button.inline}
            className="gap-1 text-xs text-primary"
            onClick={() => navigate(alert.actionRoute)}
          >
            Open
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
