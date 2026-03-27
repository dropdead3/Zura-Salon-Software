/**
 * FormulaPreview — Read-only display of a saved formula.
 */

import { Badge } from '@/components/ui/badge';
import type { FormulaLine } from '@/lib/backroom/mix-calculations';

interface FormulaPreviewProps {
  formulaData: FormulaLine[];
  formulaType: 'actual' | 'refined';
  serviceName?: string | null;
  staffName?: string | null;
  createdAt?: string;
  compact?: boolean;
}

export function FormulaPreview({
  formulaData,
  formulaType,
  serviceName,
  staffName,
  createdAt,
  compact = false,
}: FormulaPreviewProps) {
  return (
    <div className="space-y-2">
      {!compact && (
        <div className="flex items-center gap-2">
          {serviceName && (
            <span className="font-sans text-sm font-medium">{serviceName}</span>
          )}
          <Badge variant={formulaType === 'refined' ? 'default' : 'secondary'} className="text-[10px]">
            {formulaType === 'refined' ? 'Refined' : 'Actual'}
          </Badge>
          {staffName && (
            <span className="font-sans text-xs text-muted-foreground">by {staffName}</span>
          )}
        </div>
      )}

      <div className="space-y-1">
        {formulaData.map((line, i) => (
          <div
            key={`${line.product_id}-${i}`}
            className="flex items-center justify-between py-1 px-2 rounded bg-muted/30"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-sans text-sm truncate">{line.product_name}</span>
              {line.brand && (
                <span className="font-sans text-xs text-muted-foreground shrink-0">{line.brand}</span>
              )}
            </div>
            <span className="font-display text-sm tabular-nums shrink-0">
              {line.quantity.toFixed(1)}{line.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
