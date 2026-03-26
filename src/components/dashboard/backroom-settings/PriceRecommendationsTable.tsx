/**
 * PriceRecommendationsTable — Full table view of all service price recommendations.
 */
import React, { useState } from 'react';
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Check, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PriceAcceptConfirmDialog } from './PriceAcceptConfirmDialog';
import type { EnrichedPriceRecommendation } from '@/hooks/backroom/useServicePriceRecommendations';

interface Props {
  recommendations: EnrichedPriceRecommendation[];
  onAccept: (rec: EnrichedPriceRecommendation) => void;
  onDismiss: (rec: EnrichedPriceRecommendation) => void;
  onUpdateTarget: (serviceId: string, marginPct: number) => void;
  isAccepting?: boolean;
}

export function PriceRecommendationsTable({ recommendations, onAccept, onDismiss, onUpdateTarget, isAccepting }: Props) {
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState('');

  const saveTarget = (serviceId: string) => {
    const val = parseFloat(targetValue);
    if (val > 0 && val < 100) {
      onUpdateTarget(serviceId, val);
      setEditingTarget(null);
    }
  };

  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={tokens.table?.columnHeader || 'font-sans text-sm'}>Service</TableHead>
            <TableHead className={tokens.table?.columnHeader || 'font-sans text-sm'}>Category</TableHead>
            <TableHead className={cn(tokens.table?.columnHeader || 'font-sans text-sm', 'text-right')}>Product Cost</TableHead>
            <TableHead className={cn(tokens.table?.columnHeader || 'font-sans text-sm', 'text-right')}>Allowance</TableHead>
            <TableHead className={cn(tokens.table?.columnHeader || 'font-sans text-sm', 'text-right')}>Current Price</TableHead>
            <TableHead className={cn(tokens.table?.columnHeader || 'font-sans text-sm', 'text-right')}>Current Margin</TableHead>
            <TableHead className={cn(tokens.table?.columnHeader || 'font-sans text-sm', 'text-right')}>Target Margin</TableHead>
            <TableHead className={cn(tokens.table?.columnHeader || 'font-sans text-sm', 'text-right')}>Recommended</TableHead>
            <TableHead className={cn(tokens.table?.columnHeader || 'font-sans text-sm', 'text-right')}>Delta</TableHead>
            <TableHead className={cn(tokens.table?.columnHeader || 'font-sans text-sm', 'text-right')}>Volume</TableHead>
            <TableHead className={cn(tokens.table?.columnHeader || 'font-sans text-sm', 'text-right')}>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recommendations.map((rec) => {
            const isIncrease = rec.price_delta > 0;
            return (
              <TableRow key={rec.service_id}>
                <TableCell className="font-sans text-sm font-medium">{rec.service_name}</TableCell>
                <TableCell className="font-sans text-sm text-muted-foreground">{rec.category || '—'}</TableCell>
                <TableCell className="text-right font-sans text-sm tabular-nums">${rec.product_cost.toFixed(2)}</TableCell>
                <TableCell className="text-right font-sans text-sm tabular-nums text-muted-foreground">
                  {rec.allowance_amount != null ? `${rec.allowance_amount}g` : '—'}
                </TableCell>
                <TableCell className="text-right font-sans text-sm tabular-nums">${rec.current_price.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    'text-sm tabular-nums font-sans',
                    rec.is_below_target ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                  )}>
                    {rec.current_margin_pct.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {editingTarget === rec.service_id ? (
                    <div className="flex items-center gap-1 justify-end">
                      <Input
                        type="number"
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                        className="w-16 h-7 text-xs text-right"
                        min={1}
                        max={99}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTarget(rec.service_id);
                          if (e.key === 'Escape') setEditingTarget(null);
                        }}
                        onBlur={() => saveTarget(rec.service_id)}
                        autoFocus
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  ) : (
                    <button
                      className="text-sm tabular-nums font-sans text-foreground hover:text-primary transition-colors cursor-pointer"
                      onClick={() => {
                        setEditingTarget(rec.service_id);
                        setTargetValue(String(rec.target_margin_pct));
                      }}
                    >
                      {rec.target_margin_pct}%
                    </button>
                  )}
                </TableCell>
                <TableCell className="text-right font-sans text-sm tabular-nums font-medium text-primary">
                  ${rec.recommended_price.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className={cn(
                    'text-[10px] font-sans gap-1',
                    isIncrease ? 'text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800' : 'text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800'
                  )}>
                    {isIncrease ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {isIncrease ? '+' : ''}{rec.price_delta_pct.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-sans text-sm tabular-nums text-muted-foreground">
                  {rec.monthly_volume ? `${rec.monthly_volume}/mo` : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    {rec.is_below_target && (
                      <>
                        <PriceAcceptConfirmDialog recommendation={rec} onConfirm={() => onAccept(rec)}>
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={isAccepting}
                          >
                            <Check className="w-3 h-3" /> Accept
                          </Button>
                        </PriceAcceptConfirmDialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => onDismiss(rec)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    {!rec.is_below_target && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-sans">On target</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
