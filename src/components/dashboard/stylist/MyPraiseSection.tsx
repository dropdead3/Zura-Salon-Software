/**
 * MyPraiseSection — stylist-side Praise Wall.
 *
 * Stylist Privacy Contract anchor: data sourced from useMyPraise which
 * filters strictly by `staff_user_id = auth.uid()`. No org rollups, no
 * peer comments, no manager KPIs.
 *
 * Surfaces the stylist's own 5-star / NPS-9+ feedback from the last 90
 * days as a quiet morale + coaching reinforcement loop. Renders nothing
 * when the stylist has no qualifying praise (silence is valid output).
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tokens } from '@/lib/design-tokens';
import { useMyPraise, type MyPraiseItem } from '@/hooks/useMyPraise';
import { useReputationEntitlement } from '@/hooks/reputation/useReputationEntitlement';

function PraiseTile({ item }: { item: MyPraiseItem }) {
  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-amber-50/40 to-card dark:from-amber-950/10 p-4 space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`h-3.5 w-3.5 ${(item.overall_rating ?? 0) >= s ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}`}
            />
          ))}
        </div>
        {item.nps_score !== null && item.nps_score >= 9 && (
          <Badge variant="secondary" className="text-[10px] h-5">NPS {item.nps_score}</Badge>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {item.responded_at && formatDistanceToNow(new Date(item.responded_at), { addSuffix: true })}
        </span>
      </div>
      <p className="text-sm leading-relaxed line-clamp-4">"{item.comments}"</p>
    </div>
  );
}

export function MyPraiseSection() {
  const { data, isLoading } = useMyPraise(9);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={tokens.card.title}>My Praise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Silence is valid output — no praise yet means we render nothing.
  if (!data || data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={tokens.card.iconBox}>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>My Praise</CardTitle>
              <CardDescription>
                Recent love from your clients. Read it. Bring it on the floor.
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">{data.length} this quarter</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.map((item) => <PraiseTile key={item.id} item={item} />)}
        </div>
      </CardContent>
    </Card>
  );
}
