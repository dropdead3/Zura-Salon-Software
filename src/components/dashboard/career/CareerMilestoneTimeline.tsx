import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { MILESTONE_TYPES, getCareerStage } from '@/config/capital-engine/stylist-financing-config';
import { format } from 'date-fns';
import { Award } from 'lucide-react';

interface Milestone {
  id: string;
  milestone_type: string;
  from_stage: string | null;
  to_stage: string;
  spi_at_milestone: number;
  ors_at_milestone: number | null;
  achieved_at: string;
}

interface Props {
  milestones: Milestone[];
}

export function CareerMilestoneTimeline({ milestones }: Props) {
  if (milestones.length === 0) return null;

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Award className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className={tokens.card.title}>Career Milestones</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {milestones.map((m) => {
            const typeInfo = MILESTONE_TYPES[m.milestone_type as keyof typeof MILESTONE_TYPES] ?? {
              label: m.milestone_type,
              icon: '📌',
            };
            const toStage = getCareerStage(m.to_stage);

            return (
              <div
                key={m.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/40"
              >
                <span className="text-lg shrink-0">{typeInfo.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm">{typeInfo.label}</p>
                  <p className="text-xs text-muted-foreground font-sans">
                    {m.from_stage && (
                      <>
                        {getCareerStage(m.from_stage).label}
                        <span className="mx-1">→</span>
                      </>
                    )}
                    {toStage.label}
                    <span className="mx-2">·</span>
                    SPI {Math.round(m.spi_at_milestone)}
                    {m.ors_at_milestone !== null && ` · ORS ${Math.round(m.ors_at_milestone)}`}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground font-sans shrink-0">
                  {format(new Date(m.achieved_at), 'MMM d, yyyy')}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
