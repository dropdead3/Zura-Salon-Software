/**
 * DockIngredientDispensing — Full-screen single-ingredient view with teardrop fill.
 * Vish-inspired: large visual cue fills proportionally as weight is entered.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Scale, StickyNote, MoreHorizontal, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeardropFill } from './TeardropFill';
import { DockWeightInput } from './DockWeightInput';
import type { BowlLine } from './DockLiveDispensing';
import { roundWeight } from '@/lib/backroom/mix-calculations';
import { toast } from 'sonner';

interface DockIngredientDispensingProps {
  line: BowlLine;
  allLines: BowlLine[];
  currentWeights: Map<string, number>;
  onWeightUpdate: (lineId: string, weight: number) => void;
  onBack: () => void;
  onNavigate: (lineId: string) => void;
}

export function DockIngredientDispensing({
  line,
  allLines,
  currentWeights,
  onWeightUpdate,
  onBack,
  onNavigate,
}: DockIngredientDispensingProps) {
  const [showNumpad, setShowNumpad] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const activeCardRef = useRef<HTMLButtonElement>(null);

  const currentWeight = currentWeights.get(line.id) ?? 0;
  const targetWeight = line.dispensed_quantity;
  const fillPercent = targetWeight > 0 ? currentWeight / targetWeight : 0;
  const fillColor = line.swatch_color || 'hsl(262 83% 58%)';

  const currentIndex = allLines.findIndex((l) => l.id === line.id);
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < allLines.length - 1;

  // Auto-scroll carousel to active item
  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [line.id]);

  const findNextUnfilled = useCallback((): string | null => {
    for (let i = 0; i < allLines.length; i++) {
      const l = allLines[i];
      if (l.id === line.id) continue;
      const w = currentWeights.get(l.id) ?? 0;
      if (w <= 0) return l.id;
    }
    return null;
  }, [allLines, currentWeights, line.id]);

  const handleWeightSubmit = (weight: number) => {
    navigator.vibrate?.(15);
    onWeightUpdate(line.id, weight);
    setShowNumpad(false);

    // Auto-advance to next unfilled ingredient
    const nextId = findNextUnfilled();
    if (nextId) {
      setTimeout(() => onNavigate(nextId), 300);
    }
  };

  const handleNavigate = (lineId: string) => {
    navigator.vibrate?.(15);
    onNavigate(lineId);
  };

  const handleDone = () => {
    navigator.vibrate?.(15);
    // If all ingredients have weight, go back; otherwise advance to next unfilled
    const nextId = findNextUnfilled();
    if (nextId) {
      onNavigate(nextId);
    } else {
      onBack();
    }
  };

  if (showNumpad) {
    return (
      <div className="flex flex-col h-full bg-[hsl(var(--platform-bg))]">
        <div className="flex-shrink-0 px-7 pt-6 pb-2">
          <p className="text-xs text-[hsl(var(--platform-foreground-muted))] mb-1">Dispensing</p>
          <p className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
            {line.product_name_snapshot}
          </p>
          <p className="text-xs text-[hsl(var(--platform-foreground-muted)/0.5)] mt-0.5">
            Target: {roundWeight(targetWeight)}g
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <DockWeightInput
            onSubmit={handleWeightSubmit}
            onCancel={() => setShowNumpad(false)}
            label="Actual Dispensed Weight"
            targetWeight={targetWeight}
            initialValue={currentWeight > 0 ? String(currentWeight) : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--platform-bg))]">
      {/* Header */}
      <div className="flex-shrink-0 px-7 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Ingredient nav */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => canPrev && handleNavigate(allLines[currentIndex - 1].id)}
              disabled={!canPrev}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[hsl(var(--platform-foreground-muted))] disabled:opacity-30 transition-colors hover:bg-[hsl(var(--platform-bg-card))]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-[hsl(var(--platform-foreground-muted))]">
              {currentIndex + 1} / {allLines.length}
            </span>
            <button
              onClick={() => canNext && handleNavigate(allLines[currentIndex + 1].id)}
              disabled={!canNext}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[hsl(var(--platform-foreground-muted))] disabled:opacity-30 transition-colors hover:bg-[hsl(var(--platform-bg-card))]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content — teardrop + product info */}
      <div className="flex-1 flex flex-col items-center justify-center px-7 gap-4">
        {/* Teardrop */}
        <TeardropFill
          fillPercent={fillPercent}
          fillColor={fillColor}
          size={200}
        />

        {/* Product name */}
        <div className="text-center">
          <p className="font-display text-lg tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
            {line.product_name_snapshot}
          </p>
          {line.brand_snapshot && (
            <p className="text-sm text-[hsl(var(--platform-foreground-muted)/0.5)] mt-0.5">
              {line.brand_snapshot}
            </p>
          )}
        </div>

        {/* Weight pill — tappable to open numpad */}
        <button
          onClick={() => { navigator.vibrate?.(15); setShowNumpad(true); }}
          className="flex items-center gap-1.5 px-7 py-3.5 rounded-full bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] hover:border-violet-500/40 transition-all active:scale-95"
        >
          <span className={cn(
            'font-display text-3xl tracking-tight',
            currentWeight > 0
              ? 'text-[hsl(var(--platform-foreground))]'
              : 'text-[hsl(var(--platform-foreground-muted)/0.4)]'
          )}>
            {currentWeight > 0 ? roundWeight(currentWeight) : 'Tap to weigh'}
          </span>
          <span className="text-base text-[hsl(var(--platform-foreground-muted)/0.5)]">
            / {roundWeight(targetWeight)}g
          </span>
        </button>

        {/* Pagination dots */}
        <div className="flex gap-1.5 mt-1">
          {allLines.map((l, i) => {
            const w = currentWeights.get(l.id) ?? 0;
            const filled = w > 0 && w >= l.dispensed_quantity;
            return (
              <button
                key={l.id}
                onClick={() => handleNavigate(l.id)}
                className={cn(
                  'w-2.5 h-2.5 rounded-full transition-all duration-200',
                  l.id === line.id
                    ? 'w-8 bg-violet-500'
                    : filled
                      ? 'bg-emerald-500/60'
                      : 'bg-[hsl(var(--platform-foreground-muted)/0.2)]'
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex-shrink-0 px-7 py-3">
        <div className="flex items-center justify-center gap-6">
          <ActionButton
            icon={<Scale className="w-5 h-5" />}
            label="Balance"
            onClick={() => { navigator.vibrate?.(15); setShowNumpad(true); }}
          />
          <ActionButton
            icon={<StickyNote className="w-5 h-5" />}
            label="Notes"
            onClick={() => { navigator.vibrate?.(15); toast.info('Notes coming soon'); }}
          />
          <ActionButton
            icon={<MoreHorizontal className="w-5 h-5" />}
            label="More"
            onClick={() => { navigator.vibrate?.(15); toast.info('More options coming soon'); }}
          />
          <ActionButton
            icon={<Check className="w-5 h-5" />}
            label="Done"
            onClick={handleDone}
            accent
          />
        </div>
      </div>

      {/* Bottom carousel */}
      <div className="flex-shrink-0 pb-4">
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto px-7 pb-1 scrollbar-none"
        >
          {allLines.map((l) => {
            const w = currentWeights.get(l.id) ?? 0;
            const pct = l.dispensed_quantity > 0 ? w / l.dispensed_quantity : 0;
            const isActive = l.id === line.id;
            return (
              <button
                key={l.id}
                ref={isActive ? activeCardRef : undefined}
                onClick={() => handleNavigate(l.id)}
                className={cn(
                  'flex-shrink-0 w-[140px] rounded-xl p-3 border transition-all duration-150',
                  'bg-[hsl(var(--platform-bg-card))]',
                  isActive
                    ? 'border-violet-500/50 shadow-lg shadow-violet-500/10'
                    : 'border-[hsl(var(--platform-border)/0.2)] hover:border-[hsl(var(--platform-border)/0.4)]'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-5 h-5 rounded-md flex-shrink-0 border border-[hsl(var(--platform-border)/0.3)]"
                    style={{ backgroundColor: l.swatch_color || 'hsl(var(--platform-bg-elevated))' }}
                  />
                  <p className="text-[10px] text-[hsl(var(--platform-foreground))] truncate font-medium">
                    {l.product_name_snapshot}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.5)]">
                    {w > 0 ? `${roundWeight(w)}g` : 'Pending'} / {roundWeight(l.dispensed_quantity)}g
                  </span>
                </div>
                {/* Mini progress bar */}
                <div className="h-1 rounded-full bg-[hsl(var(--platform-bg-elevated))] mt-1.5 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      pct >= 1 ? 'bg-emerald-500' : 'bg-violet-500'
                    )}
                    style={{ width: `${Math.min(100, pct * 100)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors active:scale-95',
        accent
          ? 'text-emerald-400 hover:bg-emerald-500/10'
          : 'text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-bg-card))]'
      )}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
