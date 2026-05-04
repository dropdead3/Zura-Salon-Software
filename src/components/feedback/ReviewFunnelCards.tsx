import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MailOpen, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useReviewFunnel } from '@/hooks/useReviewFunnel';
import { tokens } from '@/lib/design-tokens';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { openReputationGlossary } from './ReputationGlossary';
import { useReputationFilter } from '@/contexts/ReputationFilterContext';

/** Response Rate KPI tile — % of sent surveys that got a reply (last 30d). */
export function ResponseRateCard() {
  const { locationId } = useReputationFilter();
  const { data, isLoading } = useReviewFunnel(30, locationId);

  if (isLoading) {
    return (
      <Card className="relative">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20" />
        </CardContent>
      </Card>
    );
  }

  const display = data?.responseRate != null ? `${Math.round(data.responseRate * 100)}%` : '—';

  return (
    <Card className="relative">
      <div className={tokens.kpi.infoIcon}>
        <MetricInfoTooltip
          title="Reply Rate"
          description="Of the feedback requests we sent in the last 30 days, the share that got a reply. Hidden until at least 10 have been sent."
          onLearnMore={() => openReputationGlossary('reply-rate')}
        />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MailOpen className="h-4 w-4 text-primary" /> Reply Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={tokens.kpi.value}>{display}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {data?.hasResponseSignal
            ? `${data.responded} replied of ${data.sent} asked`
            : (data?.sent ?? 0) === 0
            ? 'Once we send 10 feedback requests, you\'ll see what share of clients reply.'
            : `${data?.sent ?? 0} of 10 sent — keep going to see your reply rate.`}
        </p>
      </CardContent>
    </Card>
  );
}

/** Public Review Conversion KPI tile — % of promoters who clicked through to leave a public review. */
export function PublicConversionCard() {
  const { data, isLoading } = useReviewFunnel(30);

  if (isLoading) {
    return (
      <Card className="relative">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Public Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20" />
        </CardContent>
      </Card>
    );
  }

  const display =
    data?.publicConversionRate != null ? `${Math.round(data.publicConversionRate * 100)}%` : '—';

  return (
    <Card className="relative">
      <div className={tokens.kpi.infoIcon}>
        <MetricInfoTooltip
          title="Public Review Conversion"
          description="Of the happy clients we asked, the share who clicked through to leave a public review (Google, Yelp, etc.). Hidden until we have at least 5 replies."
          onLearnMore={() => openReputationGlossary('public-reviews')}
        />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" /> Public Reviews
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={tokens.kpi.value}>{display}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {data?.hasConversionSignal
            ? `${data.publicReviewClicks} click-through${data.publicReviewClicks === 1 ? '' : 's'}`
            : (data?.responded ?? 0) === 0
            ? 'Once 5 happy clients reply, you\'ll see how many we send to Google, Yelp, or Facebook.'
            : `${data?.responded ?? 0} of 5 replies in — almost ready to show your public review rate.`}
        </p>
      </CardContent>
    </Card>
  );
}
