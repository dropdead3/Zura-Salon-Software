/**
 * DockFormulaBuilder — Target weight chips, ratio selector, product list.
 * Used inside the bowl creation / editing flow.
 */

import { useState } from 'react';
import { Plus, Minus, Trash2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DockProductPicker, type PickedProduct } from './DockProductPicker';
import type { DockProduct } from '@/hooks/dock/useDockProductCatalog';

export interface FormulaLine {
  product: DockProduct;
  targetWeight: number;
  ratio: number;
}

interface DockFormulaBuilderProps {
  lines: FormulaLine[];
  onLinesChange: (lines: FormulaLine[]) => void;
  baseWeight: number;
  onBaseWeightChange: (weight: number) => void;
}

const WEIGHT_PRESETS = [20, 40, 60];
const RATIO_PRESETS = [
  { label: '1x', value: 1 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2 },
];

export function DockFormulaBuilder({ lines, onLinesChange, baseWeight, onBaseWeightChange }: DockFormulaBuilderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const existingIds = new Set(lines.map((l) => l.product.id));

  const handleAddProducts = (picked: PickedProduct[]) => {
    const newLines: FormulaLine[] = picked.map((p) => ({
      product: p.product,
      targetWeight: baseWeight,
      ratio: 1,
    }));
    onLinesChange([...lines, ...newLines]);
  };

  const updateLine = (index: number, updates: Partial<FormulaLine>) => {
    const next = [...lines];
    next[index] = { ...next[index], ...updates };
    onLinesChange(next);
  };

  const removeLine = (index: number) => {
    onLinesChange(lines.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-5">
      {/* Target weight chips */}
      <div>
        <p className="text-[10px] font-medium tracking-wide uppercase text-[hsl(var(--platform-foreground-muted)/0.6)] mb-2">
          Target Weight
        </p>
        <div className="flex gap-2">
          {WEIGHT_PRESETS.map((w) => (
            <button
              key={w}
              onClick={() => onBaseWeightChange(w)}
              className={cn(
                'h-10 px-5 rounded-xl text-sm font-medium transition-all duration-150',
                baseWeight === w
                  ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                  : 'bg-[hsl(var(--platform-bg-card))] text-[hsl(var(--platform-foreground-muted))] border border-[hsl(var(--platform-border)/0.2)] hover:border-[hsl(var(--platform-border)/0.4)]'
              )}
            >
              {w}g
            </button>
          ))}
          {/* Custom weight input */}
          <div className="relative">
            <input
              type="number"
              value={WEIGHT_PRESETS.includes(baseWeight) ? '' : baseWeight || ''}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v > 0) onBaseWeightChange(v);
              }}
              placeholder="Custom"
              className={cn(
                'h-10 w-24 px-3 rounded-xl text-sm bg-[hsl(var(--platform-bg-card))] border text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.4)] focus:outline-none focus:border-violet-500/50',
                !WEIGHT_PRESETS.includes(baseWeight) && baseWeight > 0
                  ? 'border-violet-500/40'
                  : 'border-[hsl(var(--platform-border)/0.2)]'
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[hsl(var(--platform-foreground-muted)/0.5)]">
              g
            </span>
          </div>
        </div>
      </div>

      {/* Product lines */}
      <div>
        <p className="text-[10px] font-medium tracking-wide uppercase text-[hsl(var(--platform-foreground-muted)/0.6)] mb-2">
          Ingredients ({lines.length})
        </p>

        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="w-8 h-8 text-violet-400/30 mb-2" />
            <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">
              No ingredients added
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <FormulaLineCard
                key={line.product.id}
                line={line}
                onUpdate={(updates) => updateLine(idx, updates)}
                onRemove={() => removeLine(idx)}
              />
            ))}
          </div>
        )}

        {/* Add product button */}
        <button
          onClick={() => setPickerOpen(true)}
          className="w-full flex items-center justify-center gap-2 h-11 mt-3 rounded-xl border border-dashed border-violet-500/40 text-violet-400 bg-violet-600/10 hover:bg-violet-600/20 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Product picker modal */}
      <DockProductPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAddProducts={handleAddProducts}
        selectedIds={existingIds}
      />
    </div>
  );
}

function FormulaLineCard({
  line,
  onUpdate,
  onRemove,
}: {
  line: FormulaLine;
  onUpdate: (updates: Partial<FormulaLine>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.2)] p-3 space-y-2">
      {/* Product info + remove */}
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full flex-shrink-0 border border-[hsl(var(--platform-border)/0.3)]"
          style={{ backgroundColor: line.product.swatch_color || 'hsl(var(--platform-bg-elevated))' }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[hsl(var(--platform-foreground))] truncate">{line.product.name}</p>
          <p className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.5)]">{line.product.brand}</p>
        </div>
        <button
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Weight + ratio row */}
      <div className="flex items-center gap-2">
        {/* Weight stepper */}
        <div className="flex items-center gap-1 bg-[hsl(var(--platform-bg))] rounded-lg border border-[hsl(var(--platform-border)/0.2)] h-8">
          <button
            onClick={() => onUpdate({ targetWeight: Math.max(0, line.targetWeight - 5) })}
            className="w-8 h-full flex items-center justify-center text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            value={line.targetWeight || ''}
            onChange={(e) => onUpdate({ targetWeight: parseFloat(e.target.value) || 0 })}
            className="w-12 h-full text-center text-xs bg-transparent text-[hsl(var(--platform-foreground))] focus:outline-none"
          />
          <span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.5)] pr-1">g</span>
          <button
            onClick={() => onUpdate({ targetWeight: line.targetWeight + 5 })}
            className="w-8 h-full flex items-center justify-center text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Ratio chips */}
        <div className="flex gap-1 flex-1">
          {RATIO_PRESETS.map((r) => (
            <button
              key={r.value}
              onClick={() => onUpdate({ ratio: r.value })}
              className={cn(
                'flex-1 h-8 rounded-lg text-[11px] font-medium transition-all duration-150',
                line.ratio === r.value
                  ? 'bg-violet-600/25 text-violet-300 border border-violet-500/30'
                  : 'bg-[hsl(var(--platform-bg))] text-[hsl(var(--platform-foreground-muted)/0.6)] border border-[hsl(var(--platform-border)/0.15)] hover:text-[hsl(var(--platform-foreground-muted))]'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
