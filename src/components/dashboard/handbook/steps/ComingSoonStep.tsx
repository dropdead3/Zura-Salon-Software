import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Sparkles } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  waveLabel: string;
  summary?: React.ReactNode;
}

export function ComingSoonStep({ title, description, waveLabel, summary }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className={cn(tokens.heading.section)}>{title}</h2>
        <p className="font-sans text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
      </div>

      <Card className="border-dashed border-primary/30 bg-primary/[0.02]">
        <CardContent className="py-12 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-display text-base tracking-wide">Coming in {waveLabel}</h3>
          <p className="font-sans text-sm text-muted-foreground max-w-md">
            Your selections from earlier steps are saved. This step will activate once the next wave ships.
          </p>
        </CardContent>
      </Card>

      {summary && <div>{summary}</div>}
    </div>
  );
}
