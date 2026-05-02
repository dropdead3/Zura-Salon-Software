import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { GraduationCap, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useStylistCoachingNotes, useAcknowledgeCoachingNote, type CoachingCategory } from '@/hooks/useStylistCoachingNotes';
import { formatDistanceToNow } from 'date-fns';

const CATEGORY_LABELS: Record<CoachingCategory, string> = {
  general: 'General',
  technical: 'Technical',
  consultation: 'Consultation',
  tone: 'Tone',
  recovery: 'Recovery',
  recognition: 'Recognition',
};

export function CoachingLoopCard() {
  const { data, isLoading } = useStylistCoachingNotes();
  const ack = useAcknowledgeCoachingNote();

  const open = (data ?? []).filter((n) => !n.acknowledged_at);
  const recent = (data ?? []).slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={tokens.card.iconBox}>
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Coaching Loop</CardTitle>
              <CardDescription>Latest stylist coaching notes from feedback signal</CardDescription>
            </div>
          </div>
          {open.length > 0 && (
            <Badge variant="secondary">{open.length} unacknowledged</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : recent.length === 0 ? (
          <div className={tokens.empty.container}>
            <GraduationCap className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No coaching notes yet</h3>
            <p className={tokens.empty.description}>
              Log notes from a recovery task or stylist row to start the loop.
            </p>
          </div>
        ) : (
          recent.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-border/60 bg-card p-3 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[note.category]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{note.note_text}</p>
              </div>
              {!note.acknowledged_at ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => ack.mutate(note.id)}
                  disabled={ack.isPending}
                  className="shrink-0"
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Mark seen
                </Button>
              ) : (
                <Badge variant="secondary" className="shrink-0">
                  <Check className="h-3 w-3 mr-1" /> Acknowledged
                </Badge>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
