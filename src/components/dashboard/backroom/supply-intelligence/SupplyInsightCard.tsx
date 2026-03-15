/**
 * SupplyInsightCard — Individual insight in the Supply Intelligence feed.
 */

import {
  Package,
  Trash2,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { QuickReorderButton } from './QuickReorderButton';
import type { SupplyInsight } from '@/hooks/backroom/useSupplyIntelligence';

interface SupplyInsightCardProps {
  insight: SupplyInsight;
}

const categoryConfig: Record<string, { icon: typeof Package; color: string }> = {
  inventory: { icon: Package, color: 'text-destructive' },
  waste: { icon: Trash2, color: 'text-amber-600 dark:text-amber-400' },
  margin: { icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' },
  usage: { icon: Users, color: 'text-blue-600 dark:text-blue-400' },
  price: { icon: DollarSign, color: 'text-orange-600 dark:text-orange-400' },
};

const severityStyles: Record<string, string> = {
  critical: 'border-l-destructive bg-destructive/5',
  warning: 'border-l-amber-500 bg-amber-500/5',
  info: 'border-l-blue-500 bg-blue-500/5',
};

const severityIcons: Record<string, typeof AlertTriangle> = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

export function SupplyInsightCard({ insight }: SupplyInsightCardProps) {
  const config = categoryConfig[insight.category] ?? categoryConfig.inventory;
  const CategoryIcon = config.icon;
  const SeverityIcon = severityIcons[insight.severity] ?? Info;

  return (
    <div
      className={cn(
        'border-l-[3px] rounded-lg p-4 transition-colors',
        severityStyles[insight.severity] ?? severityStyles.info,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <SeverityIcon
              className={cn(
                'w-3.5 h-3.5 shrink-0',
                insight.severity === 'critical' ? 'text-destructive' : 'text-muted-foreground',
              )}
            />
            <span className={cn(tokens.label.tiny, config.color)}>
              {insight.category.toUpperCase()}
            </span>
          </div>

          {/* Title */}
          <h4 className={cn(tokens.body.emphasis, 'mb-1')}>{insight.title}</h4>

          {/* Description */}
          <p className={tokens.body.muted}>{insight.description}</p>

          {/* Suggested action */}
          {insight.suggested_action && (
            <p className={cn(tokens.body.muted, 'mt-1.5 italic')}>
              → {insight.suggested_action}
            </p>
          )}
        </div>

        {/* Impact + action */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {insight.estimated_annual_impact > 0 && (
            <div className="text-right">
              <span className={tokens.label.tiny}>Annual Impact</span>
              <div className={cn(tokens.body.emphasis, config.color)}>
                <BlurredAmount>
                  ${insight.estimated_annual_impact.toLocaleString()}
                </BlurredAmount>
              </div>
            </div>
          )}
          {insight.category === 'inventory' && insight.product_id && (
            <QuickReorderButton productId={insight.product_id} />
          )}
        </div>
      </div>
    </div>
  );
}
