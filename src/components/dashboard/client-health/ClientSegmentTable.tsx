import { useState, useMemo } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormatDate } from '@/hooks/useFormatDate';
import { calculateCLV, CLV_TIERS } from '@/lib/clv-calculator';
import { cn } from '@/lib/utils';
import type { HealthClient } from '@/hooks/useClientHealthSegments';

interface ClientSegmentTableProps {
  clients: HealthClient[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

type SortField = 'name' | 'last_visit' | 'total_spend' | 'days_inactive' | 'clv';

export function ClientSegmentTable({ clients, selectedIds, onSelectionChange }: ClientSegmentTableProps) {
  const { formatDate } = useFormatDate();
  const { formatCurrencyWhole } = useFormatCurrency();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('days_inactive');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const getClientCLV = (c: HealthClient) => {
    const clv = calculateCLV(c.total_spend, c.visit_count, c.first_visit, c.last_visit);
    return clv.isReliable ? clv.annualValue : 0;
  };

  const getClientTier = (annualValue: number) => {
    if (annualValue >= 2000) return CLV_TIERS.platinum;
    if (annualValue >= 1000) return CLV_TIERS.gold;
    if (annualValue >= 500) return CLV_TIERS.silver;
    return CLV_TIERS.bronze;
  };

  const filtered = useMemo(() => {
    let result = clients;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'last_visit') cmp = (a.last_visit || '').localeCompare(b.last_visit || '');
      else if (sortField === 'total_spend') cmp = a.total_spend - b.total_spend;
      else if (sortField === 'clv') cmp = getClientCLV(a) - getClientCLV(b);
      else cmp = a.days_inactive - b.days_inactive;
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [clients, search, sortField, sortDir]);

  const allSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(filtered.map(c => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>
                <Button variant="ghost" size={tokens.button.inline} className="gap-1 -ml-3" onClick={() => handleSort('name')}>
                  Name <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Phone</TableHead>
              <TableHead>
                <Button variant="ghost" size={tokens.button.inline} className="gap-1 -ml-3" onClick={() => handleSort('last_visit')}>
                  Last Visit <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size={tokens.button.inline} className="gap-1 -ml-3" onClick={() => handleSort('days_inactive')}>
                  Days Inactive <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size={tokens.button.inline} className="gap-1 -ml-3" onClick={() => handleSort('total_spend')}>
                  Total Spend <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" size={tokens.button.inline} className="gap-1 -ml-3" onClick={() => handleSort('clv')}>
                  CLV <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No clients in this segment
                </TableCell>
              </TableRow>
            ) : (
              filtered.slice(0, 100).map(client => (
                <TableRow key={client.id} data-state={selectedIds.has(client.id) ? 'selected' : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(client.id)}
                      onCheckedChange={() => toggleOne(client.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{client.email || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{client.phone || '—'}</TableCell>
                  <TableCell className="text-xs">
                    {client.last_visit ? formatDate(new Date(client.last_visit), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.days_inactive >= 90 ? 'destructive' : client.days_inactive >= 60 ? 'secondary' : 'outline'} className="text-xs">
                      {client.days_inactive}d
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium">{formatCurrencyWhole(client.total_spend)}</TableCell>
                  <TableCell>
                    {(() => {
                      const annualValue = getClientCLV(client);
                      if (annualValue <= 0) return <span className="text-xs text-muted-foreground">—</span>;
                      const tier = getClientTier(annualValue);
                      return (
                        <div className="flex items-center gap-1.5">
                          <Badge className={cn("text-[10px] px-1.5 py-0 border-0", tier.color, tier.bgColor)}>
                            {tier.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{formatCurrencyWhole(Math.round(annualValue))}/yr</span>
                        </div>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {filtered.length > 100 && (
          <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/30">
            Showing 100 of {filtered.length} clients
          </div>
        )}
      </div>
    </div>
  );
}
