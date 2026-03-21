import { useMemo, useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Search, ArrowUpDown, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/format';
import { useProductUsageFrequency, type UsageTier, type ProductUsageRow } from '@/hooks/backroom/useProductUsageFrequency';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface Props {
  locationId?: string;
}

const TIER_CONFIG: Record<UsageTier, { label: string; className: string }> = {
  frequent: { label: 'Frequent', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  regular: { label: 'Regular', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  occasional: { label: 'Occasional', className: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
  rare: { label: 'Rare', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  dormant: { label: 'Dormant', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

type SortKey = 'sessionsUsed' | 'totalDispensedGrams' | 'daysSinceLastUse' | 'productName';

export function ProductUsageFrequencyTable({ locationId }: Props) {
  const { data: rows, isLoading } = useProductUsageFrequency(locationId);
  const { formatCurrency } = useFormatCurrency();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | UsageTier>('all');
  const [sortKey, setSortKey] = useState<SortKey>('sessionsUsed');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'sessionsUsed' || key === 'daysSinceLastUse');
    }
  };

  const filtered = useMemo(() => {
    if (!rows) return [];
    let result = rows;
    if (tierFilter !== 'all') result = result.filter((r) => r.tier === tierFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          (r.brand?.toLowerCase().includes(q) ?? false),
      );
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'sessionsUsed':
          cmp = a.sessionsUsed - b.sessionsUsed;
          break;
        case 'totalDispensedGrams':
          cmp = a.totalDispensedGrams - b.totalDispensedGrams;
          break;
        case 'daysSinceLastUse':
          cmp = (a.daysSinceLastUse ?? 9999) - (b.daysSinceLastUse ?? 9999);
          break;
        case 'productName':
          cmp = a.productName.localeCompare(b.productName);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [rows, tierFilter, search, sortKey, sortAsc]);

  // KPI summary
  const summary = useMemo(() => {
    if (!rows) return { total: 0, rare: 0, dormant: 0, dormantCapital: 0 };
    const dormantRows = rows.filter((r) => r.tier === 'dormant');
    return {
      total: rows.length,
      rare: rows.filter((r) => r.tier === 'rare').length,
      dormant: dormantRows.length,
      dormantCapital: dormantRows.reduce(
        (sum, r) => sum + (r.costPrice ?? 0) * (r.quantityOnHand ?? 0),
        0,
      ),
    };
  }, [rows]);

  const SortHeader = ({ label, sortKeyProp }: { label: string; sortKeyProp: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-sans text-sm font-medium text-foreground/60 tracking-wider hover:bg-transparent hover:text-foreground"
      onClick={() => handleSort(sortKeyProp)}
    >
      {label}
      {sortKey === sortKeyProp && (
        <ArrowUpDown className="ml-1 w-3 h-3" />
      )}
    </Button>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={tokens.card.iconBox}>
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Usage Frequency</CardTitle>
            <CardDescription>90-day product dispensing frequency — rarest first</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Summary Strip */}
        {!isLoading && rows && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={tokens.kpi.tile}>
              <span className={tokens.kpi.label}>Products</span>
              <span className={tokens.kpi.value}>{summary.total}</span>
            </div>
            <div className={tokens.kpi.tile}>
              <span className={tokens.kpi.label}>Rare</span>
              <span className={cn(tokens.kpi.value, summary.rare > 0 && 'text-orange-500')}>
                {summary.rare}
              </span>
            </div>
            <div className={tokens.kpi.tile}>
              <span className={tokens.kpi.label}>Dormant</span>
              <span className={cn(tokens.kpi.value, summary.dormant > 0 && 'text-destructive')}>
                {summary.dormant}
              </span>
            </div>
            <div className={tokens.kpi.tile}>
              <span className={tokens.kpi.label}>Dormant Capital</span>
              <span className={cn(tokens.kpi.value, summary.dormantCapital > 0 && 'text-destructive')}>
                {formatCurrency(summary.dormantCapital)}
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search product or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn('pl-9', tokens.input.search)}
            />
          </div>
          <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="frequent">Frequent</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="occasional">Occasional</SelectItem>
              <SelectItem value="rare">Rare</SelectItem>
              <SelectItem value="dormant">Dormant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className={tokens.loading.skeleton} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={tokens.empty.container}>
            <PackageOpen className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No products found</h3>
            <p className={tokens.empty.description}>
              {search || tierFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'No backroom-tracked products exist yet.'}
            </p>
          </div>
        ) : (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortHeader label="Product" sortKeyProp="productName" /></TableHead>
                  <TableHead className="hidden sm:table-cell">Brand</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="text-right">
                    <SortHeader label="Sessions" sortKeyProp="sessionsUsed" />
                  </TableHead>
                  <TableHead className="text-right hidden sm:table-cell">
                    <SortHeader label="Dispensed (g)" sortKeyProp="totalDispensedGrams" />
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <SortHeader label="Last Used" sortKeyProp="daysSinceLastUse" />
                  </TableHead>
                  <TableHead>Tier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.productId}
                    className={cn(
                      row.tier === 'dormant' && 'bg-amber-500/5',
                    )}
                  >
                    <TableCell className="font-sans text-sm font-medium">
                      {row.productName}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {row.brand ?? '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm capitalize">
                      {row.category ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-sans tabular-nums">
                      {row.sessionsUsed}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell font-sans tabular-nums">
                      {row.totalDispensedGrams > 0 ? `${row.totalDispensedGrams}g` : '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {row.lastUsedDate ? formatRelativeTime(row.lastUsedDate) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] border', TIER_CONFIG[row.tier].className)}
                      >
                        {TIER_CONFIG[row.tier].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
