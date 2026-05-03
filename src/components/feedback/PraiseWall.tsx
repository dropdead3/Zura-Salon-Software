import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { tokens } from '@/lib/design-tokens';
import { Sparkles, Star, Heart, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { usePraiseWall, type PraiseItem } from '@/hooks/usePraiseWall';
import { useOrgAssignees, assigneeLabel } from '@/hooks/useOrgAssignees';
import { useCreateCoachingNote } from '@/hooks/useStylistCoachingNotes';

function PraiseCard({
  item,
  stylistName,
  recognized,
  onRecognize,
}: {
  item: PraiseItem;
  stylistName: string | null;
  recognized: boolean;
  onRecognize: () => void;
}) {
  return (
    <div className="group relative rounded-xl border border-border/60 bg-gradient-to-br from-amber-50/40 to-card dark:from-amber-950/10 p-4 space-y-3">
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

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground truncate">
          {stylistName ?? 'Unassigned stylist'}
        </span>
        {item.staff_user_id ? (
          recognized ? (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Check className="h-3 w-3" /> Recognized
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs gap-1.5"
              onClick={onRecognize}
            >
              <Heart className="h-3 w-3" /> Recognize
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}

export function PraiseWall() {
  const { data, isLoading } = usePraiseWall(12);
  const { data: assignees = [] } = useOrgAssignees();
  const createNote = useCreateCoachingNote();
  const [recognized, setRecognized] = useState<Set<string>>(new Set());

  const nameById = new Map(
    assignees.map((a) => [a.user_id, assigneeLabel(a)] as const),
  );

  const handleRecognize = async (item: PraiseItem) => {
    if (!item.staff_user_id || recognized.has(item.id)) return;
    const stylistName = nameById.get(item.staff_user_id) ?? 'this stylist';
    await createNote.mutateAsync({
      stylist_user_id: item.staff_user_id,
      feedback_response_id: item.id,
      category: 'recognition',
      note_text: `Client praise: "${item.comments.slice(0, 240)}${item.comments.length > 240 ? '…' : ''}"\n\nShare this with ${stylistName} — high-trust feedback worth naming.`,
    });
    setRecognized((s) => new Set(s).add(item.id));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={tokens.card.iconBox}>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Praise Wall</CardTitle>
              <CardDescription>
                Recent 5-star and NPS-9+ comments. One click logs a recognition coaching note.
              </CardDescription>
            </div>
          </div>
          {(data?.length ?? 0) > 0 && (
            <Badge variant="secondary">{data!.length} this quarter</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <div className={tokens.empty.container}>
            <Sparkles className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No praise yet</h3>
            <p className={tokens.empty.description}>
              5-star reviews with written comments from the last 90 days will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data!.map((item) => (
              <PraiseCard
                key={item.id}
                item={item}
                stylistName={item.staff_user_id ? nameById.get(item.staff_user_id) ?? null : null}
                recognized={recognized.has(item.id)}
                onRecognize={() => handleRecognize(item)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
