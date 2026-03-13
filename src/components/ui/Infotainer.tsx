import { ReactNode, useState } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { useInfotainerVisible, useDismissInfotainer } from '@/hooks/useInfotainers';
import { cn } from '@/lib/utils';

interface InfotainerProps {
  /** Unique key for this infotainer (used for dismissal persistence) */
  id: string;
  /** Title displayed in the banner */
  title: string;
  /** Description text or ReactNode */
  description: string | ReactNode;
  /** Optional custom icon (defaults to Lightbulb) */
  icon?: ReactNode;
  /** Optional className override */
  className?: string;
}

export function Infotainer({ id, title, description, icon, className }: InfotainerProps) {
  const { isVisible, isLoading } = useInfotainerVisible(id);
  const dismiss = useDismissInfotainer();
  const [localDismissed, setLocalDismissed] = useState(false);

  if (isLoading || !isVisible || localDismissed) return null;

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-card/80 backdrop-blur-sm p-5 pr-12',
        'shadow-sm transition-all duration-300',
        className
      )}
    >
      <button
        onClick={() => {
          dismiss(id);
          setLocalDismissed(true);
        }}
        className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Dismiss guide"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3.5">
        <div className="flex-shrink-0 mt-0.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            {icon || <Lightbulb className="h-4 w-4 text-primary" />}
          </div>
        </div>
        <div className="space-y-1.5 min-w-0">
          <h4 className="font-display text-sm tracking-wide text-foreground">
            {title}
          </h4>
          <div className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}
