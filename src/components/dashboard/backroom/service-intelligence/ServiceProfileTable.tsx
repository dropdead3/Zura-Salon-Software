import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, Beaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import type { ServiceProfile } from '@/lib/backroom/service-intelligence-engine';

interface ServiceProfileTableProps {
  profiles: ServiceProfile[];
  isLoading?: boolean;
}

type SortKey = keyof ServiceProfile;

export function ServiceProfileTable({ profiles, isLoading }: ServiceProfileTableProps) {
  const { formatCurrency } = useFormatCurrency();
  const { formatNumber, formatPercent } = useFormatNumber();
  const [sortKey, setSortKey] = useState<SortKey>('session_count');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...profiles].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 hover:bg-transparent"
      onClick={() => toggleSort(field)}
    >
      <span className={tokens.table.columnHeader}>{label}</span>
      <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
    </Button>
  );

  const getMarginBadge = (pct: number) => {
    if (pct >= 50) return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{pct}%</Badge>;
    if (pct >= 40) return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">{pct}%</Badge>;
    return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{pct}%</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={tokens.loading.skeleton} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!profiles.length) {
    return (
      <Card>
        <CardContent>
          <div className={tokens.empty.container}>
            <Beaker className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No service data available</h3>
            <p className={tokens.empty.description}>Complete mix sessions to generate service intelligence</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Beaker className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Service Profiles</CardTitle>
              <CardDescription>Operational metrics per service type</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="font-sans">
            {profiles.length} services
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortHeader label="Service" field="service_name" /></TableHead>
              <TableHead><SortHeader label="Sessions" field="session_count" /></TableHead>
              <TableHead><SortHeader label="Avg Usage" field="avg_chemical_usage_g" /></TableHead>
              <TableHead><SortHeader label="Avg Cost" field="avg_chemical_cost" /></TableHead>
              <TableHead><SortHeader label="Waste" field="avg_waste_rate_pct" /></TableHead>
              <TableHead><SortHeader label="Duration" field="avg_duration_minutes" /></TableHead>
              <TableHead><SortHeader label="Revenue" field="avg_revenue" /></TableHead>
              <TableHead><SortHeader label="Margin" field="margin_pct" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => (
              <TableRow key={p.service_name}>
                <TableCell className={tokens.body.emphasis}>{p.service_name}</TableCell>
                <TableCell className={tokens.body.default}>{formatNumber(p.session_count)}</TableCell>
                <TableCell className={tokens.body.default}>{formatNumber(p.avg_chemical_usage_g)}g</TableCell>
                <TableCell className={tokens.body.default}>{formatCurrency(p.avg_chemical_cost)}</TableCell>
                <TableCell>
                  <span className={cn(
                    tokens.body.default,
                    p.avg_waste_rate_pct > 15 && 'text-destructive'
                  )}>
                    {formatPercent(p.avg_waste_rate_pct, false)}
                  </span>
                </TableCell>
                <TableCell className={tokens.body.muted}>{formatNumber(p.avg_duration_minutes)} min</TableCell>
                <TableCell className={tokens.body.default}>{formatCurrency(p.avg_revenue)}</TableCell>
                <TableCell>{getMarginBadge(p.margin_pct)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
