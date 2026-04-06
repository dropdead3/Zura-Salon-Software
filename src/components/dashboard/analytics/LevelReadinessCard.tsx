import { useMemo } from 'react';
import { GraduationCap, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { PinnableCard } from '@/components/dashboard/PinnableCard';
import { useTeamLevelProgress, type TeamMemberProgress } from '@/hooks/useTeamLevelProgress';
import { useWriteLevelSnapshots, useReadLevelSnapshots, isSnapshotStalled } from '@/hooks/useLevelProgressSnapshots';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type StalenessTier = 'stalling' | 'stale' | 'stagnant';

function getStalenessTier(days: number): StalenessTier | null {
  if (days >= 365) return 'stagnant';
  if (days >= 270) return 'stale';
  if (days >= 180) return 'stalling';
  return null;
}

const STALENESS_CONFIG: Record<StalenessTier, { label: string; className: string }> = {
  stalling: { label: 'Stalling', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  stale: { label: 'Stale', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  stagnant: { label: 'Stagnant', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

function formatMonths(days: number): string {
  const months = Math.floor(days / 30);
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}y ${rem}mo` : `${years}y`;
  }
  return `${months}mo`;
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function StylistRow({ member, showArrow }: { member: TeamMemberProgress; showArrow?: boolean }) {
  const stalenessTier = getStalenessTier(member.timeAtLevelDays);

  return (
    <div className="flex items-center gap-3 py-2.5">
      <Avatar className="h-8 w-8">
        {member.photoUrl && <AvatarImage src={member.photoUrl} alt={member.fullName} />}
        <AvatarFallback className="text-xs font-sans">{getInitials(member.fullName)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className={cn(tokens.body.emphasis, 'truncate')}>{member.fullName}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{member.currentLevel?.label || 'Unknown'}</span>
          {showArrow && member.nextLevel && (
            <>
              <ArrowRight className="w-3 h-3" />
              <span>{member.nextLevel.label}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Composite score badge */}
        <Badge
          variant="outline"
          className={cn(
            'text-xs tabular-nums',
            member.isFullyQualified
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              : member.compositeScore >= 90
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                : ''
          )}
        >
          {member.compositeScore}%
        </Badge>

        {/* Time at level */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span className="tabular-nums">{formatMonths(member.timeAtLevelDays)}</span>
        </div>

        {/* Staleness tier badge (only in stalled section) */}
        {stalenessTier && !showArrow && (
          <Badge variant="outline" className={cn('text-[10px]', STALENESS_CONFIG[stalenessTier].className)}>
            {STALENESS_CONFIG[stalenessTier].label}
          </Badge>
        )}
      </div>
    </div>
  );
}

export function LevelReadinessCard() {
  const { teamProgress, isLoading } = useTeamLevelProgress();
  const { data: snapshotMap } = useReadLevelSnapshots(6);

  // Persist current month's scores (deduped by unique constraint)
  useWriteLevelSnapshots(teamProgress);

  const { readyToPromote, stalled } = useMemo(() => {
    const readyToPromote = teamProgress.filter(
      m => m.status !== 'at_top_level' && (m.isFullyQualified || m.compositeScore >= 90)
    ).sort((a, b) => b.compositeScore - a.compositeScore);

    const stalled = teamProgress.filter(m => {
      if (m.status === 'at_top_level' || m.compositeScore >= 80) return false;

      // Try snapshot-based staleness first
      const userSnapshots = snapshotMap?.get(m.userId);
      const snapshotResult = isSnapshotStalled(userSnapshots, m.compositeScore, 2);

      if (snapshotResult !== null) {
        // Have snapshot data — use trend-based detection
        return snapshotResult;
      }

      // Fallback: time-at-level heuristic when no snapshots exist yet
      return m.timeAtLevelDays >= 180;
    }).sort((a, b) => b.timeAtLevelDays - a.timeAtLevelDays);

    return { readyToPromote, stalled };
  }, [teamProgress, snapshotMap]);

  if (isLoading) {
    return (
      <Card className={tokens.card.wrapper}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <GraduationCap className={tokens.card.icon} />
            </div>
            <div className="flex items-center gap-2">
              <CardTitle className={tokens.card.title}>LEVEL READINESS</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className={tokens.loading.skeleton} />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <PinnableCard
      elementKey="level_readiness"
      elementName="Level Readiness"
      category="Staffing Analytics"
      metricData={{
        readyToPromote: readyToPromote.length,
        stalledCount: stalled.length,
      }}
    >
      <Card className={tokens.card.wrapper}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={tokens.card.iconBox}>
                <GraduationCap className={tokens.card.icon} />
              </div>
              <div className="flex items-center gap-2">
                <CardTitle className={tokens.card.title}>LEVEL READINESS</CardTitle>
                <MetricInfoTooltip description="Identifies stylists who qualify for promotion and flags those whose progression has stalled for 6+ months." />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {readyToPromote.length > 0 && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                  {readyToPromote.length} ready
                </Badge>
              )}
              {stalled.length > 0 && (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">
                  {stalled.length} stalled
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Section 1: Ready to Promote */}
          <div>
            <h3 className={cn(tokens.heading.subsection, 'mb-2 flex items-center gap-2')}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Ready to Promote
            </h3>
            {readyToPromote.length === 0 ? (
              <p className={cn(tokens.body.muted, 'py-3')}>No stylists currently qualify for promotion</p>
            ) : (
              <div className="divide-y divide-border/50">
                {readyToPromote.map(m => (
                  <StylistRow key={m.userId} member={m} showArrow />
                ))}
              </div>
            )}
          </div>

          <Separator className="opacity-50" />

          {/* Section 2: Stalled Progression */}
          <div>
            <h3 className={cn(tokens.heading.subsection, 'mb-2 flex items-center gap-2')}>
              <AlertTriangle className="w-3 h-3 text-orange-500" />
              Stalled Progression
            </h3>
            {stalled.length === 0 ? (
              <p className={cn(tokens.body.muted, 'py-3')}>No stalled progressions detected</p>
            ) : (
              <div className="divide-y divide-border/50">
                {stalled.map(m => (
                  <StylistRow key={m.userId} member={m} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PinnableCard>
  );
}
