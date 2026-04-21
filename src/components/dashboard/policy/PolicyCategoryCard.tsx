import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { ArrowRight, Check } from 'lucide-react';
import type { PolicyCategory } from '@/hooks/policy/usePolicyData';
import { POLICY_CATEGORY_META } from '@/hooks/policy/usePolicyData';

interface Props {
  category: PolicyCategory;
  adopted: number;
  total: number;
  onClick: () => void;
  isActive?: boolean;
}

export function PolicyCategoryCard({ category, adopted, total, onClick, isActive = false }: Props) {
  const meta = POLICY_CATEGORY_META[category];
  const pct = total === 0 ? 0 : Math.round((adopted / total) * 100);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className="text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
    >
      <Card
        className={cn(
          'rounded-xl transition-colors h-full',
          isActive
            ? 'border-primary bg-primary/5'
            : 'border-border/60 bg-card/80 group-hover:border-primary/40 group-hover:bg-card',
        )}
      >
        <CardContent className="p-6 flex flex-col gap-4 h-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h3 className={cn(tokens.heading.card, 'text-foreground')}>{meta.label}</h3>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                {meta.description}
              </p>
            </div>
            {isActive ? (
              <Check className="w-4 h-4 text-primary mt-1 shrink-0" />
            ) : (
              <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground transition-colors mt-1 shrink-0" />
            )}
          </div>

          <div className="mt-auto space-y-2">
            <div className="flex items-baseline justify-between">
              <span className={cn(tokens.kpi.label)}>Coverage</span>
              <span className="font-sans text-sm text-foreground">
                <span className="font-display tracking-wide">{adopted}</span>
                <span className="text-muted-foreground"> / {total}</span>
              </span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
