/**
 * PriceRecommendationsTable — Full table view with sorting, filtering, and mobile card fallback.
 */
import React, { useState, useMemo } from 'react';
import { Table, TableHeader, TableHead, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Check, X, ArrowUpRight, ArrowDownRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PriceAcceptConfirmDialog } from './PriceAcceptConfirmDialog';
import { PriceRecommendationCard } from './PriceRecommendationCard';
import { useIsMobile } from '@/hooks/use-mobile';
import type { EnrichedPriceRecommendation } from '@/hooks/backroom/useServicePriceRecommendations';

interface Props {
  recommendations: EnrichedPriceRecommendation[];
  onAccept: (rec: EnrichedPriceRecommendation) => void;
  onDismiss: (rec: EnrichedPriceRecommendation) => void;
  onUpdateTarget: (serviceId: string, marginPct: number) => void;
  isAccepting?: boolean;
}

type SortField = 'service_name' | 'current_margin_pct' | 'price_delta_pct' | 'monthly_volume' | 'product_cost';
type SortDir = 'asc' | 'desc';

export function PriceRecommendationsTable({ recommendations, onAccept, onDismiss, onUpdateTarget, isAccepting }: Props) {
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState('');
  const [sortField, setSortField] = useState<SortField>('current_margin_pct');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const isMobile = useIsMobile();

  const categories = useMemo(() => {
    const cats = new Set(recommendations.map(r => r.category || 'Uncategorized'));
    return Array.from(cats).sort();
  }, [recommendations]);

  const sorted = useMemo(() => {
    let filtered = categoryFilter === 'all'
      ? [...recommendations]
      : recommendations.filter(r => (r.category || 'Uncategorized') === categoryFilter);

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'service_name': cmp = a.service_name.localeCompare(b.service_name); break;
        case 'current_margin_pct': cmp = a.current_margin_pct - b.current_margin_pct; break;
        case 'price_delta_pct': cmp = Math.abs(a.price_delta_pct) - Math.abs(b.price_delta_pct); break;
        case 'monthly_volume': cmp = (a.monthly_volume || 0) - (b.monthly_volume || 0); break;
        case 'product_cost': cmp = a.product_cost - b.product_cost; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return filtered;
  }, [recommendations, sortField, sortDir, categoryFilter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-primary" />
      : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
  };

  const saveTarget = (serviceId: string) => {
    const val = parseFloat(targetValue);
    if (val > 0 && val < 100) {
      onUpdateTarget(serviceId, val);
    }
    setEditingTarget(null);
  };

  // Mobile: card layout
  if (isMobile) {
    return (
      <div className="space-y-3">
        {categories.length > 1 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full h-9 text-sm font-sans">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {sorted.map(rec => (
          <PriceRecommendationCard
            key={rec.service_id}
            recommendation={rec}
            onAccept={() => onAccept(rec)}
            onDismiss={() => onDismiss(rec)}
            isAccepting={isAccepting}
          />
        ))}
      </div>
    );
  }

  const colHeader = tokens.table?.columnHeader || 'font-sans text-sm';

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48 h-9 text-sm font-sans">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground font-sans ml-auto">
            {sorted.length} service{sorted.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button onClick={() => toggleSort('service_name')} className={cn(colHeader, 'flex items-center cursor-pointer')}>
                  Service <SortIcon field="service_name" />
                </button>
              </TableHead>
              <TableHead className={colHeader}>Category</TableHead>
              <TableHead>
                <button onClick={() => toggleSort('product_cost')} className={cn(colHeader, 'flex items-center justify-end cursor-pointer ml-auto')}>
                  Product Cost <SortIcon field="product_cost" />
                </button>
              </TableHead>
              <TableHead className={cn(colHeader, 'text-right')}>Allowance</TableHead>
              <TableHead className={cn(colHeader, 'text-right')}>Current Price</TableHead>
              <TableHead>
                <button onClick={() => toggleSort('current_margin_pct')} className={cn(colHeader, 'flex items-center justify-end cursor-pointer ml-auto')}>
                  Current Margin <SortIcon field="current_margin_pct" />
                </button>
              </TableHead>
              <TableHead className={cn(colHeader, 'text-right')}>Target Margin</TableHead>
              <TableHead className={cn(colHeader, 'text-right')}>Recommended</TableHead>
              <TableHead>
                <button onClick={() => toggleSort('price_delta_pct')} className={cn(colHeader, 'flex items-center justify-end cursor-pointer ml-auto')}>
                  Delta <SortIcon field="price_delta_pct" />
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => toggleSort('monthly_volume')} className={cn(colHeader, 'flex items-center justify-end cursor-pointer ml-auto')}>
                  Volume <SortIcon field="monthly_volume" />
                </button>
              </TableHead>
              <TableHead className={cn(colHeader, 'text-right')}>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((rec) => {
              const isIncrease = rec.price_delta > 0;
              return (
                <TableRow key={rec.service_id} className={cn(
                  'border-l-2',
                  rec.is_below_target
                    ? 'border-l-amber-400 dark:border-l-amber-600'
                    : 'border-l-emerald-400 dark:border-l-emerald-600'
                )}>
                  <TableCell className={tokens.body.emphasis}>{rec.service_name}</TableCell>
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
    </div>
  );
}
