import { Package, ArrowRight } from 'lucide-react';
import type { RankedResult } from '@/lib/searchRanker';

interface InventoryPreviewProps {
  result: RankedResult;
}

export function InventoryPreview({ result }: InventoryPreviewProps) {
  const subtitleParts = result.subtitle?.split(' · ') || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
          <Package className="w-4 h-4 text-primary/60" />
        </div>
        <div>
          <h3 className="font-display text-sm tracking-wide text-foreground">{result.title}</h3>
          {result.metadata && (
            <span className="font-sans text-[10px] text-muted-foreground/70 uppercase tracking-wider">{result.metadata}</span>
          )}
        </div>
      </div>

      {subtitleParts.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {subtitleParts.map((part) => (
            <div key={part} className="bg-muted/30 rounded-lg px-3 py-2.5 space-y-1">
              <span className="font-sans text-xs text-foreground/80">{part}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 text-xs font-sans text-primary/80 pt-1">
        <span>View in Inventory</span>
        <ArrowRight className="w-3 h-3" />
      </div>
    </div>
  );
}
