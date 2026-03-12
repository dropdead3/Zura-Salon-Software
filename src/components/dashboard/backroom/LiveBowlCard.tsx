/**
 * LiveBowlCard — Mixing console experience for open bowls.
 * Large animated weight display, inline product search, live allowance tracking.
 * iPad-first: large tap targets, fluid animations, zero unnecessary taps.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { BowlLineRow } from './BowlLineRow';
import { AddProductToBowl } from './AddProductToBowl';
import { QuickProductButtons } from './QuickProductButtons';
import { ManualWeightInput } from './ManualWeightInput';
import { useAllowanceRemaining } from '@/hooks/backroom/useAllowanceRemaining';
import { calculateBowlWeight, calculateBowlCost } from '@/lib/backroom/mix-calculations';
import { Lock, Trash2, Beaker } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import type { MixBowl } from '@/hooks/backroom/useMixBowls';
import type { PinnedProduct } from '@/hooks/backroom/useStaffPinnedProducts';
import type { MixBowlLine } from '@/hooks/backroom/useMixBowlLines';

interface LiveBowlCardProps {
  bowl: MixBowl;
  lines: MixBowlLine[];
  serviceId?: string | null;
  onAddLine: (
    bowlId: string,
    productId: string,
    productName: string,
    brand: string | null,
    costPerUnit: number,
    quantity: number,
    unit: string,
    capturedVia: string
  ) => void;
  onDeleteLine: (lineId: string, bowlId: string) => void;
  onSealBowl: (bowlId: string) => void;
  onDiscardBowl: (bowlId: string) => void;
}

const ALLOWANCE_COLORS = {
  safe: 'bg-success',
  warning: 'bg-warning',
  over: 'bg-destructive',
} as const;

const ALLOWANCE_TEXT = {
  safe: 'text-success',
  warning: 'text-warning',
  over: 'text-destructive',
} as const;

export function LiveBowlCard({
  bowl,
  lines,
  serviceId,
  onAddLine,
  onDeleteLine,
  onSealBowl,
  onDiscardBowl,
}: LiveBowlCardProps) {
  const [lastCapturedId, setLastCapturedId] = useState<string | null>(null);
  const [quickProduct, setQuickProduct] = useState<PinnedProduct | null>(null);

  const liveWeight = calculateBowlWeight(lines);
  const liveCost = calculateBowlCost(lines);
  const allowance = useAllowanceRemaining(serviceId, lines);

  const handleAddProduct = useCallback(
    (
      productId: string,
      productName: string,
      brand: string | null,
      costPerUnit: number,
      quantity: number,
      unit: string,
      capturedVia: string
    ) => {
      onAddLine(bowl.id, productId, productName, brand, costPerUnit, quantity, unit, capturedVia);
      // Flash the latest capture
      setLastCapturedId(productId);
      setTimeout(() => setLastCapturedId(null), 1200);
    },
    [bowl.id, onAddLine]
  );

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border overflow-hidden">
      {/* ── Header: Bowl identity ── */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={tokens.card.iconBox}>
            <Beaker className={tokens.card.icon} />
          </div>
          <div>
            <h3 className="font-display text-base tracking-wide">
              Bowl {bowl.bowl_number}
            </h3>
            {bowl.bowl_name && (
              <p className="font-sans text-xs text-muted-foreground">{bowl.bowl_name}</p>
            )}
          </div>
          <Badge variant="default" className="text-[10px] ml-1">Mixing</Badge>
        </div>
      </div>

      <CardContent className="px-5 pb-5 space-y-4">
        {/* ── Live weight display ── */}
        <motion.div
          className="text-center py-4 rounded-xl bg-muted/30 border border-border/50"
          layout
        >
          <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Total Dispensed
          </p>
          <div className="flex items-baseline justify-center gap-1.5">
            <AnimatedNumber
              value={liveWeight}
              decimals={1}
              className="font-display text-4xl tabular-nums text-foreground"
              duration={600}
            />
            <span className="font-sans text-lg text-muted-foreground">g</span>
          </div>

          {/* Cost */}
          <p className="font-sans text-sm text-muted-foreground mt-1">
            <BlurredAmount>
              <AnimatedNumber
                value={liveCost}
                decimals={2}
                prefix="$"
                className="tabular-nums"
                duration={600}
              />
            </BlurredAmount>
          </p>
        </motion.div>

        {/* ── Allowance bar ── */}
        {allowance.hasPolicy && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-sans text-xs">
              <span className="text-muted-foreground">Allowance</span>
              <span className={ALLOWANCE_TEXT[allowance.status]}>
                {allowance.remaining.toFixed(0)}{allowance.unit} remaining
              </span>
            </div>
            <Progress
              value={Math.min(allowance.pct, 100)}
              className="h-2 bg-muted/50"
              indicatorClassName={ALLOWANCE_COLORS[allowance.status]}
            />
            <div className="flex justify-between font-sans text-[10px] text-muted-foreground tabular-nums">
              <span>0{allowance.unit}</span>
              <span>{allowance.included}{allowance.unit}</span>
            </div>
          </div>
        )}

        {/* ── Product lines ── */}
        <AnimatePresence mode="popLayout">
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <BowlLineRow
                line={line}
                onDelete={(id) => onDeleteLine(id, bowl.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {lines.length === 0 && (
          <div className={tokens.empty.container}>
            <Beaker className={tokens.empty.icon} />
            <p className={tokens.empty.description}>
              Search and add products to start mixing
            </p>
          </div>
        )}

        {/* ── Inline product search (always visible) ── */}
        <AddProductToBowl
          bowlId={bowl.id}
          onAdd={handleAddProduct}
          onCancel={() => {}}
          inline
        />

        {/* ── Bowl actions ── */}
        {lines.length > 0 && (
          <div className="flex gap-2 pt-3 border-t border-border/50">
            <Button
              onClick={() => onSealBowl(bowl.id)}
              className="flex-1 h-12 font-sans text-sm"
            >
              <Lock className="w-4 h-4 mr-1.5" />
              Seal Bowl
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 text-destructive shrink-0"
              onClick={() => onDiscardBowl(bowl.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
