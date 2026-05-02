import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStaffFeedbackStats } from '@/hooks/useNPSAnalytics';
import { resolveStaffNamesByUserIds } from '@/utils/resolveStaffNames';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';

interface StaffFeedbackSummaryProps {
  organizationId?: string;
}

/**
 * Staff feedback summary with resolved display names.
 * Replaces the placeholder "Staff Member" text on the FeedbackHub > By Staff tab.
 * Sorted by avg rating desc; staff with <3 responses are signal-suppressed to a footer count.
 */
export function StaffFeedbackSummary({ organizationId }: StaffFeedbackSummaryProps) {
  const { data: staffStats, isLoading } = useStaffFeedbackStats(organizationId);

  const staffIds = staffStats ? Object.keys(staffStats) : [];
  const { data: nameMap } = useQuery({
    queryKey: ['staff-names', staffIds.sort().join(',')],
    queryFn: () => resolveStaffNamesByUserIds(staffIds),
    enabled: staffIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={tokens.card.title}>Staff Feedback Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const entries = Object.entries(staffStats ?? {});
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={tokens.card.title}>Staff Feedback Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={tokens.empty.container}>
            <Users className={tokens.empty.icon} />
            <p className={tokens.empty.description}>No staff feedback yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visible = entries
    .filter(([, s]) => s.totalResponses >= 3)
    .sort(([, a], [, b]) => b.avgRating - a.avgRating);
  const suppressed = entries.length - visible.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Staff Feedback Summary</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Sorted by overall rating · ≥3 responses
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <div className={tokens.empty.container}>
            <p className={tokens.empty.description}>
              Need at least 3 responses per staff member to surface.
              {suppressed > 0 && ` (${suppressed} below threshold)`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map(([staffId, stats]) => (
              <div
                key={staffId}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {nameMap?.[staffId] ?? 'Loading…'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalResponses} response{stats.totalResponses === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-5 text-sm shrink-0">
                  <Stat label="Rating" value={stats.avgRating.toFixed(1)} />
                  <Stat label="NPS" value={Math.round(stats.avgNPS).toString()} />
                  <Stat label="Friendly" value={stats.avgFriendliness.toFixed(1)} />
                </div>
              </div>
            ))}
            {suppressed > 0 && (
              <p className="text-xs text-muted-foreground pt-2 italic">
                {suppressed} additional staff hidden (fewer than 3 responses)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-medium leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
