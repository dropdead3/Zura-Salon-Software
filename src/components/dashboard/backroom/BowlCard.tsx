/**
 * BowlCard — Represents a single mix bowl with its lines, status, and actions.
 * iPad-first: large tap targets, clear status visibility.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { Plus, Lock, Scale, Trash2 } from 'lucide-react';
import { BowlLineRow } from './BowlLineRow';
import { ManualWeightInput } from './ManualWeightInput';
import { AddProductToBowl } from './AddProductToBowl';
import { LiveBowlCard } from './LiveBowlCard';
import type { MixBowl } from '@/hooks/backroom/useMixBowls';
import type { MixBowlLine } from '@/hooks/backroom/useMixBowlLines';
import { calculateBowlWeight, calculateBowlCost } from '@/lib/backroom/mix-calculations';
import type { MixBowlStatus } from '@/lib/backroom/bowl-state-machine';
import { isBowlOpen, isTerminalBowlStatus } from '@/lib/backroom/bowl-state-machine';

const STATUS_STYLES: Record<MixBowlStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  open: { label: 'Open', variant: 'default' },
  sealed: { label: 'Sealed', variant: 'secondary' },
  reweighed: { label: 'Reweighed', variant: 'outline' },
  discarded: { label: 'Discarded', variant: 'destructive' },
  prepared_by_assistant: { label: 'Prepared', variant: 'secondary' },
  awaiting_stylist_approval: { label: 'Awaiting Approval', variant: 'default' },
};

interface BowlCardProps {
  bowl: MixBowl;
  lines: MixBowlLine[];
  serviceId?: string | null;
  onAddLine: (bowlId: string, productId: string, productName: string, brand: string | null, costPerUnit: number, quantity: number, unit: string, capturedVia: string) => void;
  onDeleteLine: (lineId: string, bowlId: string) => void;
  onSealBowl: (bowlId: string) => void;
  onReweighBowl: (bowlId: string, leftover: number, unit: string) => void;
  onDiscardBowl: (bowlId: string) => void;
}

export function BowlCard({
  bowl,
  lines,
  serviceId,
  onAddLine,
  onDeleteLine,
  onSealBowl,
  onReweighBowl,
  onDiscardBowl,
}: BowlCardProps) {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const isOpen = isBowlOpen(bowl.status);
  const isTerminal = isTerminalBowlStatus(bowl.status);
  const statusInfo = STATUS_STYLES[bowl.status];

  const liveWeight = calculateBowlWeight(lines);
  const liveCost = calculateBowlCost(lines);

  // Open bowls use the LiveBowlCard mixing console experience
  if (isOpen) {
    return (
      <LiveBowlCard
        bowl={bowl}
        lines={lines}
        serviceId={serviceId}
        onAddLine={onAddLine}
        onDeleteLine={onDeleteLine}
        onSealBowl={onSealBowl}
        onDiscardBowl={onDiscardBowl}
      />
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="font-display text-base tracking-wide">
              Bowl {bowl.bowl_number}
            </CardTitle>
            {bowl.bowl_name && (
              <span className="font-sans text-xs text-muted-foreground">({bowl.bowl_name})</span>
            )}
            <Badge variant={statusInfo.variant} className="text-[10px]">
              {statusInfo.label}
            </Badge>
          </div>

          <div className="flex items-center gap-3 font-display text-sm tabular-nums">
            <span>{liveWeight.toFixed(1)}g</span>
            <span className="text-muted-foreground">
              <BlurredAmount>${liveCost.toFixed(2)}</BlurredAmount>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Line items */}
        {lines.map((line) => (
          <BowlLineRow
            key={line.id}
            line={line}
            onDelete={isOpen ? (id) => onDeleteLine(id, bowl.id) : undefined}
            readonly={!isOpen}
          />
        ))}

        {lines.length === 0 && isOpen && (
          <p className="font-sans text-sm text-muted-foreground text-center py-4">
            No products added yet
          </p>
        )}

        {/* Add product */}
        {isOpen && (
          <>
            {showAddProduct ? (
              <AddProductToBowl
                bowlId={bowl.id}
                onAdd={(productId, productName, brand, costPerUnit, quantity, unit, capturedVia) => {
                  onAddLine(bowl.id, productId, productName, brand, costPerUnit, quantity, unit, capturedVia);
                  setShowAddProduct(false);
                }}
                onCancel={() => setShowAddProduct(false)}
              />
            ) : (
              <Button
                variant="outline"
                className="w-full h-11 font-sans"
                onClick={() => setShowAddProduct(true)}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Product
              </Button>
            )}
          </>
        )}

        {/* Bowl actions */}
        {!isTerminal && (
          <div className="flex gap-2 pt-2 border-t border-border/50">
            {isOpen && lines.length > 0 && (
              <Button
                onClick={() => onSealBowl(bowl.id)}
                className="flex-1 h-11 font-sans"
              >
                <Lock className="w-4 h-4 mr-1.5" />
                Seal Bowl
              </Button>
            )}

            {bowl.status === 'sealed' && (
              <div className="flex-1">
                <p className="font-sans text-xs text-muted-foreground mb-1.5">Reweigh leftover</p>
                <ManualWeightInput
                  onSubmit={(weight, unit) => onReweighBowl(bowl.id, weight, unit)}
                  label=""
                  placeholder="Leftover weight"
                />
              </div>
            )}

            {(isOpen || bowl.status === 'sealed') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-destructive shrink-0"
                onClick={() => onDiscardBowl(bowl.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Reweigh result */}
        {bowl.status === 'reweighed' && bowl.leftover_weight != null && bowl.net_usage_weight != null && (
          <div className="flex items-center gap-4 pt-2 border-t border-border/50 font-sans text-xs text-muted-foreground">
            <span>Leftover: {bowl.leftover_weight.toFixed(1)}g</span>
            <span className="text-foreground font-medium">
              Net usage: {bowl.net_usage_weight.toFixed(1)}g
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
