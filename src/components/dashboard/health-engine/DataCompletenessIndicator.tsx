import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { CheckCircle2, Circle, Database, CreditCard, Package, Calculator } from 'lucide-react';
import type { DataProfile } from '@/hooks/useHealthEngine';

interface DataCompletenessIndicatorProps {
  profile: DataProfile;
  className?: string;
}

const sources = [
  { key: 'hasPOS' as const, label: 'POS Connected', icon: CreditCard, unlocks: 'Revenue, Client, Retention' },
  { key: 'hasPayroll' as const, label: 'Payroll Connected', icon: Database, unlocks: 'Labor cost analysis' },
  { key: 'hasInventory' as const, label: 'Inventory Tracking', icon: Package, unlocks: 'Inventory / Cost Control' },
  { key: 'hasAccounting' as const, label: 'Accounting', icon: Calculator, unlocks: 'Profitability scoring' },
];

export function DataCompletenessIndicator({ profile, className }: DataCompletenessIndicatorProps) {
  const connected = sources.filter((s) => profile[s.key]).length;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className={tokens.heading.subsection}>Data Sources</span>
        <span className={cn(tokens.body.muted, 'text-xs')}>
          {connected}/{sources.length} connected
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((source) => {
          const isConnected = profile[source.key];
          const Icon = source.icon;
          return (
            <div
              key={source.key}
              className={cn(
                'flex items-center gap-2.5 p-2.5 rounded-lg border',
                isConnected
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-border/40 bg-muted/20'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isConnected ? 'text-emerald-500' : 'text-muted-foreground/50')} />
              <div className="flex-1 min-w-0">
                <span className={cn('text-xs font-medium block', isConnected ? 'text-foreground' : 'text-muted-foreground')}>
                  {source.label}
                </span>
                {!isConnected && (
                  <span className="text-[10px] text-muted-foreground">
                    Connect to unlock {source.unlocks}
                  </span>
                )}
              </div>
              {isConnected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
