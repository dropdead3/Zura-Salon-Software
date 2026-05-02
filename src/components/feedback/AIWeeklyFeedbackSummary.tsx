import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

interface Fix {
  title: string;
  evidence: string;
  suggestedAction: string;
}

interface SummaryResponse {
  summary: { fixes: Fix[] } | null;
  responseCount: number;
  negativeCount?: number;
  avgRating?: string;
  message?: string;
}

/**
 * AI Weekly Feedback Summary — operator-triggered.
 * Surfaces "3 things to fix this week" grounded in actual feedback.
 * Operator-approved doctrine: never auto-acts, never auto-creates tasks.
 */
export function AIWeeklyFeedbackSummary() {
  const { effectiveOrganization } = useOrganizationContext();
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!effectiveOrganization?.id) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        'ai-feedback-weekly-summary',
        { body: { organizationId: effectiveOrganization.id } },
      );
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setData(result as SummaryResponse);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not generate summary';
      if (msg.includes('Rate')) toast.error('AI is busy — try again shortly.');
      else if (msg.includes('credits')) toast.error('AI credits exhausted.');
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Weekly Feedback Summary
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              "3 things to fix this week" — drafted from feedback. Operator decides.
            </p>
          </div>
          <Button
            onClick={generate}
            disabled={loading}
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : data ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {data ? 'Regenerate' : 'Generate'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!data && !loading && (
          <p className="text-xs text-muted-foreground">
            Generate a summary of this week's feedback patterns.
          </p>
        )}
        {data?.message && (
          <p className="text-xs text-muted-foreground">{data.message}</p>
        )}
        {data?.summary && data.summary.fixes.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No clear patterns this week ({data.responseCount} responses, {data.negativeCount} negative).
          </p>
        )}
        {data?.summary && data.summary.fixes.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {data.responseCount} responses · {data.negativeCount} negative · avg {data.avgRating}/5
            </p>
            {data.summary.fixes.map((fix, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/60 bg-card/40 p-3 space-y-1.5"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-primary shrink-0">#{i + 1}</span>
                  <p className="text-sm font-medium">{fix.title}</p>
                </div>
                <p className="text-xs text-muted-foreground italic">{fix.evidence}</p>
                <p className="text-xs">
                  <span className="font-medium text-foreground">Suggested action: </span>
                  <span className="text-muted-foreground">{fix.suggestedAction}</span>
                </p>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/60">
              AI drafted. Operator approval required — never auto-acted on.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
