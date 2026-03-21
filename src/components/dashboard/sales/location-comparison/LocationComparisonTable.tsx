import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { ChevronDown, Search, ChevronsUpDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocationDrilldownPanel } from './LocationDrilldownPanel';
import { LocationRevenueBar } from './LocationRevenueBar';
import type { LocationCardData } from './LocationComparisonCard';

type SortKey = 'revenue' | 'services' | 'products' | 'avgTicket' | 'share';

interface LocationComparisonTableProps {
  locations: LocationCardData[];
  totalRevenue: number;
  dateFrom: string;
  dateTo: string;
  showSearch?: boolean;
  colors: string[];
}

const MAX_VISIBLE = 10;

export function LocationComparisonTable({
  locations,
  totalRevenue,
  dateFrom,
  dateTo,
  showSearch = false,
  colors,
}: LocationComparisonTableProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    if (!searchQuery) return locations;
    const q = searchQuery.toLowerCase();
    return locations.filter(l => l.name.toLowerCase().includes(q));
  }, [locations, searchQuery]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortKey) {
        case 'revenue': aVal = a.totalRevenue; bVal = b.totalRevenue; break;
        case 'services': aVal = a.totalServices; bVal = b.totalServices; break;
        case 'products': aVal = a.totalProducts; bVal = b.totalProducts; break;
        case 'avgTicket':
          aVal = a.totalTransactions > 0 ? a.totalRevenue / a.totalTransactions : 0;
          bVal = b.totalTransactions > 0 ? b.totalRevenue / b.totalTransactions : 0;
          break;
        case 'share': aVal = a.sharePercent; bVal = b.sharePercent; break;
        default: aVal = a.totalRevenue; bVal = b.totalRevenue;
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [filtered, sortKey, sortAsc]);

  const visible = showAll ? sorted : sorted.slice(0, MAX_VISIBLE);
  const needsCap = sorted.length > MAX_VISIBLE;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortHeader = ({ label, column }: { label: string; column: SortKey }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
      onClick={() => toggleSort(column)}
    >
      {label}
      <ChevronsUpDown className={cn(
        'w-3 h-3',
        sortKey === column ? 'text-foreground' : 'text-muted-foreground/50'
      )} />
    </button>
  );

  const handleRowClick = (id: string) => {
    if (expandAll) return;
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-3">
      {/* Search + controls for Tier 3 */}
      {showSearch && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <button
            onClick={() => {
              setExpandAll(!expandAll);
              if (!expandAll) setExpandedId(null);
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            {expandAll ? 'Collapse All' : 'Expand All')}
          </button>
        </div>
      )}

      {/* Table */}
      <ScrollArea className={cn(showAll && sorted.length > 12 && 'max-h-[600px]')}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right"><SortHeader label="Revenue" column="revenue" /></TableHead>
              <TableHead className="text-right hidden sm:table-cell"><SortHeader label="Services" column="services" /></TableHead>
              <TableHead className="text-right hidden sm:table-cell"><SortHeader label="Retail" column="products" /></TableHead>
              <TableHead className="text-right hidden md:table-cell"><SortHeader label="Avg Ticket" column="avgTicket" /></TableHead>
              <TableHead className="text-right"><SortHeader label="Share" column="share" /></TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((loc, i) => {
              const isExpanded = expandAll || expandedId === loc.location_id;
              const avgTicket = loc.totalTransactions > 0
                ? Math.round(loc.totalRevenue / loc.totalTransactions)
                : 0;
              const color = colors[i % colors.length];

              return (
                <>
                  <TableRow
                    key={loc.location_id}
                    className={cn(
                      'cursor-pointer group transition-colors',
                      isExpanded && 'bg-muted/30 border-b-0'
                    )}
                    onClick={() => handleRowClick(loc.location_id)}
                  >
                    <TableCell className="font-display text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="font-medium truncate">{loc.name}</span>
                        {loc.isLeader && (
                          <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-1.5 py-0">
                            <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                            Top
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-display tabular-nums">
                      <BlurredAmount>{formatCurrencyWhole(loc.totalRevenue)}</BlurredAmount>
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden sm:table-cell">
                      {loc.totalServices}
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden sm:table-cell">
                      {loc.totalProducts}
                    </TableCell>
                    <TableCell className="text-right font-display tabular-nums hidden md:table-cell">
                      <BlurredAmount>${avgTicket}</BlurredAmount>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {Math.round(loc.sharePercent)}%
                    </TableCell>
                    <TableCell>
                      <ChevronDown className={cn(
                        'w-4 h-4 text-muted-foreground transition-transform',
                        isExpanded && 'rotate-180'
                      )} />
                    </TableCell>
                  </TableRow>
                  {/* Full-width drilldown row */}
                  <AnimatePresence key={`drilldown-${loc.location_id}`}>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="p-0 border-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-6 py-4 bg-muted/10 border-b border-border/40 border-l-2 border-l-primary/20">
                              <LocationDrilldownPanel
                                locationId={loc.location_id}
                                dateFrom={dateFrom}
                                dateTo={dateTo}
                                serviceRevenue={loc.serviceRevenue}
                                productRevenue={loc.productRevenue}
                                isOpen={isExpanded}
                              />
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Show all toggle */}
      {needsCap && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-xs text-primary hover:underline flex items-center justify-center gap-1 py-1.5"
        >
          <ChevronDown className={cn('w-3 h-3 transition-transform', showAll && 'rotate-180')} />
          {showAll ? 'Show less' : `Show all ${sorted.length} locations`}
        </button>
      )}
    </div>
  );
}
