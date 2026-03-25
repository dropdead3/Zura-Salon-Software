/**
 * DockLiveDispensing — Full-screen bowl mixing view.
 * Shows ingredient list with target vs actual weights,
 * progress visualization, seal/reweigh actions, and post-reweigh summary.
 * Tapping an ingredient opens the Vish-inspired teardrop dispensing view.
 */

import { useState, useCallback } from 'react';
import { ArrowLeft, FlaskConical, Scale, Check } from 'lucide-react';
import { useDockScale } from '@/hooks/dock/useDockScale';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DockReweighCapture } from './DockReweighCapture';
import { DockReweighSummary } from './DockReweighSummary';
import { DockIngredientDispensing } from './DockIngredientDispensing';
import { useRecordDispensedWeight, useSealDockBowl, useReweighDockBowl } from '@/hooks/dock/useDockMixSession';
import { roundWeight } from '@/lib/backroom/mix-calculations';

interface DockLiveDispensingProps {
  sessionId: string;
  bowlId: string;
  bowlNumber: number;
  organizationId: string;
  bowlStatus: string;
  leftoverWeight?: number;
  demoLines?: BowlLine[];
  onBack: () => void;
}

export interface BowlLine {
  id: string;
  product_id: string | null;
  product_name_snapshot: string;
  brand_snapshot: string | null;
  dispensed_quantity: number;
  dispensed_unit: string;
  dispensed_cost_snapshot: number;
  swatch_color?: string | null;
}

const DEMO_BOWL_LINES: BowlLine[] = [
  {
    id: 'demo-line-1',
    product_id: 'demo-prod-1',
    product_name_snapshot: 'Koleston Perfect 7/0',
    brand_snapshot: 'Wella',
    dispensed_quantity: 30,
    dispensed_unit: 'g',
    dispensed_cost_snapshot: 0.18,
    swatch_color: '#8B6914',
  },
  {
    id: 'demo-line-2',
    product_id: 'demo-prod-2',
    product_name_snapshot: 'Welloxon 6% 20vol',
    brand_snapshot: 'Wella',
    dispensed_quantity: 60,
    dispensed_unit: 'g',
    dispensed_cost_snapshot: 0.05,
    swatch_color: null,
  },
];

function useBowlLines(bowlId: string | null, demoLinesOverride?: BowlLine[]) {
  return useQuery({
    queryKey: ['dock-bowl-lines', bowlId],
    queryFn: async (): Promise<BowlLine[]> => {
      if (bowlId?.startsWith('demo-')) return demoLinesOverride ?? DEMO_BOWL_LINES;

      const { data, error } = await supabase
        .from('mix_bowl_lines')
        .select('id, product_id, product_name_snapshot, brand_snapshot, dispensed_quantity, dispensed_unit, dispensed_cost_snapshot')
        .eq('bowl_id', bowlId!)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const productIds = (data || []).map((l: any) => l.product_id).filter(Boolean);
      let swatchMap = new Map<string, string | null>();
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('supply_library_products')
          .select('id, swatch_color')
          .in('id', productIds);
        for (const p of products || []) {
          swatchMap.set((p as any).id, (p as any).swatch_color);
        }
      }

      return (data || []).map((l: any) => ({
        ...l,
        swatch_color: l.product_id ? swatchMap.get(l.product_id) : null,
      })) as BowlLine[];
    },
    enabled: !!bowlId,
    staleTime: 10_000,
  });
}

type DispensingView = 'lines' | 'ingredient' | 'reweigh-input';

export function DockLiveDispensing({
  sessionId,
  bowlId,
  bowlNumber,
  organizationId,
  bowlStatus: initialBowlStatus,
  leftoverWeight: initialLeftover,
  demoLines: demoLinesFromProps,
  onBack,
}: DockLiveDispensingProps) {
  const { data: lines, isLoading } = useBowlLines(bowlId, demoLinesFromProps);
  const [activeView, setActiveView] = useState<DispensingView>('lines');
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [bowlStatus, setBowlStatus] = useState(initialBowlStatus);
  const [capturedLeftover, setCapturedLeftover] = useState<number | null>(initialLeftover ?? null);
  const [currentWeights, setCurrentWeights] = useState<Map<string, number>>(new Map());
  const scale = useDockScale();

  const recordWeight = useRecordDispensedWeight();
  const sealBowl = useSealDockBowl();
  const reweighBowl = useReweighDockBowl();
  const queryClient = useQueryClient();

  const isSealed = bowlStatus === 'sealed' || bowlStatus === 'reweighed' || bowlStatus === 'discarded';
  const needsReweigh = bowlStatus === 'sealed';
  const isComplete = bowlStatus === 'reweighed' || bowlStatus === 'discarded';

  const totalDispensed = (lines || []).reduce((sum, l) => sum + l.dispensed_quantity, 0);
  const totalCost = (lines || []).reduce((sum, l) => sum + l.dispensed_quantity * l.dispensed_cost_snapshot, 0);

  const handleWeightUpdate = useCallback((lineId: string, weight: number) => {
    setCurrentWeights((prev) => {
      const next = new Map(prev);
      next.set(lineId, weight);
      return next;
    });

    // Also persist via mutation for non-demo bowls
    if (!bowlId.startsWith('demo-')) {
      recordWeight.mutate({
        sessionId,
        organizationId,
        bowlId,
        lineId,
        actualWeight: weight,
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['dock-bowl-lines', bowlId] });
        },
      });
    }
  }, [bowlId, sessionId, organizationId, recordWeight, queryClient]);

  const handleSeal = () => {
    sealBowl.mutate({ sessionId, organizationId, bowlId }, {
      onSuccess: () => setBowlStatus('sealed'),
    });
  };

  const handleReweigh = (weight: number) => {
    reweighBowl.mutate({ sessionId, organizationId, bowlId, leftoverWeight: weight }, {
      onSuccess: () => {
        setCapturedLeftover(weight);
        setBowlStatus('reweighed');
        setActiveView('lines');
      },
    });
  };

  // Ingredient dispensing view (teardrop)
  if (activeView === 'ingredient' && activeLineId && lines) {
    const activeLine = lines.find((l) => l.id === activeLineId);
    if (activeLine) {
      return (
        <DockIngredientDispensing
          line={activeLine}
          allLines={lines}
          currentWeights={currentWeights}
          onWeightUpdate={handleWeightUpdate}
          onBack={() => { setActiveView('lines'); setActiveLineId(null); }}
          onNavigate={(lineId) => setActiveLineId(lineId)}
        />
      );
    }
  }

  if (activeView === 'reweigh-input') {
    return (
      <div className="flex flex-col h-full bg-[hsl(var(--platform-bg))]">
        <div className="flex-shrink-0 px-7 pt-6 pb-2">
          <p className="font-display text-sm tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
            Bowl {bowlNumber} — Reweigh
          </p>
          <p className="text-xs text-[hsl(var(--platform-foreground-muted)/0.5)] mt-0.5">
            Place finished bowl on scale and enter leftover weight
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <DockWeightInput
            onSubmit={handleReweigh}
            onCancel={() => setActiveView('lines')}
            label="Leftover Weight"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--platform-bg))]">
      {/* Header */}
      <div className="flex-shrink-0 px-7 pt-6 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-violet-400" />
              <h1 className="font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))]">
                Bowl {bowlNumber}
              </h1>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-[hsl(var(--platform-foreground-muted))]">
                {roundWeight(totalDispensed)}g total
              </span>
              <span className="text-xs text-[hsl(var(--platform-foreground-muted)/0.5)]">
                ${roundWeight(totalCost).toFixed(2)} est. cost
              </span>
            </div>
          </div>
          {isSealed && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400">
              <Check className="w-3 h-3" />
              <span className="text-[10px] font-medium uppercase tracking-wide">Finalized</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-[hsl(var(--platform-bg-card))] overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isComplete ? 'bg-emerald-500' : 'bg-violet-500'
            )}
            style={{ width: `${Math.min(100, (() => {
              if (!lines?.length) return 0;
              if (isComplete) return 100;
              const filledCount = lines.filter(l => (currentWeights.get(l.id) || 0) > 0).length;
              return Math.round((filledCount / lines.length) * 100);
            })())}%` }}
          />
        </div>
      </div>

      {/* Line items + reweigh summary */}
      <div className="flex-1 min-h-0 overflow-y-auto px-7 py-3 space-y-3">
        {/* Reweigh summary card — shown after reweigh */}
        {isComplete && capturedLeftover !== null && (
          <DockReweighSummary
            dispensedTotal={totalDispensed}
            leftoverWeight={capturedLeftover}
            estimatedCost={totalCost}
          />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          (lines || []).map((line) => {
            const dispensedWeight = currentWeights.get(line.id) ?? 0;
            return (
              <LineItemCard
                key={line.id}
                line={line}
                dispensedWeight={dispensedWeight}
                isSealed={isSealed}
                onTapWeight={() => {
                  if (!isSealed) {
                    setActiveLineId(line.id);
                    setActiveView('ingredient');
                    // Tare the scale when entering ingredient view
                    scale.tare();
                  }
                }}
              />
            );
          })
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex-shrink-0 px-7 py-4 border-t border-[hsl(var(--platform-border)/0.2)] space-y-2">
        {!isSealed && (
          <button
            onClick={handleSeal}
            disabled={!lines?.length || sealBowl.isPending}
            className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {sealBowl.isPending ? 'Finishing...' : 'Finish Formulation'}
          </button>
        )}
        {needsReweigh && !isComplete && (
          <button
            onClick={() => setActiveView('reweigh-input')}
            className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Scale className="w-4 h-4" />
            Capture Reweigh
          </button>
        )}
        {isComplete && (
          <button
            onClick={onBack}
            className="w-full h-12 rounded-xl bg-[hsl(var(--platform-bg-card))] border border-emerald-500/30 text-emerald-400 font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Done — Back to Bowls
          </button>
        )}
      </div>
    </div>
  );
}

function LineItemCard({
  line,
  dispensedWeight,
  isSealed,
  onTapWeight,
}: {
  line: BowlLine;
  dispensedWeight: number;
  isSealed: boolean;
  onTapWeight: () => void;
}) {
  const fillPct = line.dispensed_quantity > 0 ? dispensedWeight / line.dispensed_quantity : 0;
  const isFilled = fillPct >= 1;

  return (
    <button
      onClick={onTapWeight}
      disabled={isSealed}
      className={cn(
        'w-full text-left rounded-xl p-3 border transition-all duration-150',
        'bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.2)]',
        !isSealed && 'hover:border-violet-500/30 active:scale-[0.98]',
        isSealed && 'opacity-70'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Swatch */}
        <div
          className="w-8 h-8 rounded-lg flex-shrink-0 border border-[hsl(var(--platform-border)/0.3)]"
          style={{ backgroundColor: line.swatch_color || 'hsl(var(--platform-bg-elevated))' }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[hsl(var(--platform-foreground))] truncate">
            {line.product_name_snapshot}
          </p>
          <p className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.5)]">
            {line.brand_snapshot}
          </p>
        </div>

        {/* Weight + fill indicator */}
        <div className="text-right flex-shrink-0 flex items-center gap-2">
          {dispensedWeight > 0 && (
            <div className={cn(
              'w-2 h-2 rounded-full',
              isFilled ? 'bg-emerald-500' : 'bg-violet-500'
            )} />
          )}
          <div>
            <p className="font-display text-sm tracking-tight text-[hsl(var(--platform-foreground))]">
              {roundWeight(line.dispensed_quantity)}<span className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.5)]">g</span>
            </p>
            <p className="text-[10px] text-[hsl(var(--platform-foreground-muted)/0.4)]">
              ${roundWeight(line.dispensed_quantity * line.dispensed_cost_snapshot).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
