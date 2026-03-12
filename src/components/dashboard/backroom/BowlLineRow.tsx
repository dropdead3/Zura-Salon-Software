/**
 * BowlLineRow — Single product line within a bowl.
 * Shows product name, brand, dispensed amount, cost, and capture method.
 */

import { Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import type { MixBowlLine } from '@/hooks/backroom/useMixBowlLines';

interface BowlLineRowProps {
  line: MixBowlLine;
  onEdit?: (line: MixBowlLine) => void;
  onDelete?: (lineId: string) => void;
  readonly?: boolean;
}

export function BowlLineRow({ line, onEdit, onDelete, readonly = false }: BowlLineRowProps) {
  const lineCost = line.dispensed_quantity * line.dispensed_cost_snapshot;

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-muted/30 group">
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-medium text-foreground truncate">
          {line.product_name_snapshot}
        </p>
        {line.brand_snapshot && (
          <p className="font-sans text-xs text-muted-foreground">{line.brand_snapshot}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="font-display text-sm tabular-nums">
          {line.dispensed_quantity.toFixed(1)}{line.dispensed_unit}
        </span>

        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {line.captured_via === 'scale' ? 'Scale' : 'Manual'}
        </Badge>

        <span className="font-sans text-xs text-muted-foreground min-w-[50px] text-right">
          <BlurredAmount>${lineCost.toFixed(2)}</BlurredAmount>
        </span>

        {!readonly && (
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(line)}>
                <Pencil className="w-3 h-3" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(line.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
