import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformTable as Table, PlatformTableBody as TableBody, PlatformTableCell as TableCell, PlatformTableHead as TableHead, PlatformTableHeader as TableHeader, PlatformTableRow as TableRow } from '@/components/platform/ui/PlatformTable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, TrendingUp, TrendingDown, Minus, Mail, Users2 } from 'lucide-react';
import { TrendSparkline } from '@/components/dashboard/TrendSparkline';
import { useCoachPerformance, type CoachPerformanceRow } from '@/hooks/platform/useCoachPerformance';

function DeltaBadge({ value, invertColor = false }: { value: number | null; invertColor?: boolean }) {
  if (value == null) return <span className="text-muted-foreground text-xs">—</span>;

  const isPositive = value > 0;
  const isGood = invertColor ? !isPositive : isPositive;

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-medium',
      isGood ? 'text-emerald-400' : value === 0 ? 'text-muted-foreground' : 'text-rose-400'
    )}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : value < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {value > 0 ? '+' : ''}{(value * 100).toFixed(1)}%
    </span>
  );
}

export function CoachPerformanceTab() {
  const { data: coaches, isLoading } = useCoachPerformance();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={tokens.loading.spinner} />
      </div>
    );
  }

  if (!coaches || coaches.length === 0) {
    return (
      <div className={tokens.empty.container}>
        <Users2 className={tokens.empty.icon} />
        <h3 className={tokens.empty.heading}>No coaches assigned</h3>
        <p className={tokens.empty.description}>Assign coaches to organizations in the Analytics tab to see performance data.</p>
      </div>
    );
  }

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Users2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <PlatformCardTitle className={tokens.card.title}>Coach Performance</PlatformCardTitle>
            <PlatformCardDescription>Coaching activity and organization improvement trends over 30 days.</PlatformCardDescription>
          </div>
        </div>
      </PlatformCardHeader>
      <PlatformCardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={tokens.table.columnHeader}>Coach</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Assigned Orgs</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Emails (30d)</TableHead>
              <TableHead className={tokens.table.columnHeader}>Waste Trend</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Waste Δ</TableHead>
              <TableHead className={tokens.table.columnHeader}>Reweigh Trend</TableHead>
              <TableHead className={cn(tokens.table.columnHeader, 'text-center')}>Reweigh Δ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coaches.map((coach: CoachPerformanceRow) => (
              <TableRow key={coach.coachUserId}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={coach.coachPhotoUrl ?? undefined} />
                      <AvatarFallback className="text-xs bg-muted">
                        {coach.coachName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-sans text-sm text-foreground">{coach.coachName}</p>
                      <p className="font-sans text-xs text-muted-foreground">{coach.coachEmail}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-display text-sm tracking-wide text-foreground">{coach.assignedOrgCount}</span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="inline-flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-display text-sm tracking-wide text-foreground">{coach.emailsSent30d}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <TrendSparkline data={coach.wasteTrend} width={80} height={24} />
                </TableCell>
                <TableCell className="text-center">
                  <DeltaBadge value={coach.wasteDelta} invertColor />
                </TableCell>
                <TableCell>
                  <TrendSparkline data={coach.reweighTrend} width={80} height={24} />
                </TableCell>
                <TableCell className="text-center">
                  <DeltaBadge value={coach.reweighDelta} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PlatformCardContent>
    </PlatformCard>
  );
}
