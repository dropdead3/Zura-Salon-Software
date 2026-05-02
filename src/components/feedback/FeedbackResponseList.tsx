import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, LifeBuoy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFeedbackResponses, type FeedbackResponse } from '@/hooks/useFeedbackSurveys';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatDate } from '@/hooks/useFormatDate';
import { usePaginatedSort } from '@/hooks/usePaginatedSort';
import { TablePagination } from '@/components/ui/TablePagination';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { tokens } from '@/lib/design-tokens';

interface FeedbackResponseListProps {
  organizationId?: string;
  limit?: number;
}

function getNPSLabel(score: number): { label: string; variant: 'default' | 'secondary' | 'destructive' } {
  if (score >= 9) return { label: 'Promoter', variant: 'default' };
  if (score >= 7) return { label: 'Passive', variant: 'secondary' };
  return { label: 'Detractor', variant: 'destructive' };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

function FeedbackCard({
  response,
  recoveryHref,
}: {
  response: FeedbackResponse;
  recoveryHref?: string;
}) {
  const { formatDate } = useFormatDate();
  const npsInfo = response.nps_score !== null ? getNPSLabel(response.nps_score) : null;
  const isDetractor =
    (response.overall_rating != null && response.overall_rating <= 3) ||
    (response.nps_score != null && response.nps_score <= 6);

  return (
    <div
      className={`border rounded-lg p-4 space-y-3 ${
        isDetractor ? 'border-destructive/30 bg-destructive/5' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          {response.overall_rating && (
            <StarRating rating={response.overall_rating} />
          )}
          <p className="text-xs text-muted-foreground">
            {response.responded_at && formatDate(new Date(response.responded_at), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {npsInfo && (
            <Badge variant={npsInfo.variant} className="text-xs">
              NPS {response.nps_score} • {npsInfo.label}
            </Badge>
          )}
          {response.would_recommend !== null && (
            response.would_recommend ? (
              <ThumbsUp className="h-4 w-4 text-green-500" />
            ) : (
              <ThumbsDown className="h-4 w-4 text-red-500" />
            )
          )}
        </div>
      </div>

      {response.comments && (
        <div className="flex gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">{response.comments}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {response.service_quality && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Service:</span>
            <span className="font-medium">{response.service_quality}/5</span>
          </div>
        )}
        {response.staff_friendliness && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Staff:</span>
            <span className="font-medium">{response.staff_friendliness}/5</span>
          </div>
        )}
        {response.cleanliness && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Cleanliness:</span>
            <span className="font-medium">{response.cleanliness}/5</span>
          </div>
        )}
        {isDetractor && recoveryHref && (
          <Button
            asChild
            size={tokens.button.inline}
            variant="destructive"
            className="ml-auto gap-1.5"
          >
            <Link to={recoveryHref}>
              <LifeBuoy className="h-3.5 w-3.5" />
              Open recovery
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function FeedbackResponseList({ organizationId, limit = 50 }: FeedbackResponseListProps) {
  const { data: responses, isLoading } = useFeedbackResponses(organizationId, limit);

  const {
    paginatedData,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    showingFrom,
    showingTo,
  } = usePaginatedSort({
    data: responses || [],
    defaultPageSize: 20,
    defaultSortField: 'responded_at' as any,
    defaultSortDirection: 'desc',
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!responses?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            No feedback responses yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Recent Feedback ({totalItems})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {paginatedData.map((response) => (
            <FeedbackCard key={response.id} response={response} />
          ))}
        </div>
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          showingFrom={showingFrom}
          showingTo={showingTo}
          onPageChange={setCurrentPage}
        />
      </CardContent>
    </Card>
  );
}
