import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { RoleChip } from './RoleChip';

interface Props {
  section: any;
  selected: boolean;
  onToggle: (key: string) => void;
}

const RECOMMENDATION_STYLES: Record<string, string> = {
  required: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
  recommended: 'bg-primary/10 text-primary border-primary/30',
  optional: 'bg-muted text-muted-foreground border-border',
};

export function SectionLibraryCard({ section, selected, onToggle }: Props) {
  const roles: string[] = Array.isArray(section.default_roles) ? section.default_roles : [];
  const recStyle = RECOMMENDATION_STYLES[section.recommendation] || RECOMMENDATION_STYLES.recommended;

  return (
    <Card
      className={cn(
        'transition-all cursor-pointer hover:border-primary/40',
        selected ? 'border-primary/60 bg-primary/[0.03]' : 'border-border bg-card/80'
      )}
      onClick={() => onToggle(section.key)}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Checkbox checked={selected} onCheckedChange={() => onToggle(section.key)} className="mt-1" />
            <div className="min-w-0">
              <h3 className={cn(tokens.heading.card, 'truncate')}>{section.title}</h3>
              <p className="font-sans text-sm text-muted-foreground mt-1">{section.description}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn('font-sans text-xs uppercase tracking-wider shrink-0', recStyle)}>
            {section.recommendation}
          </Badge>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
          <div>
            <p className="font-display text-[10px] tracking-widest text-muted-foreground uppercase mb-1">What it covers</p>
            <p className="font-sans text-xs text-foreground/80">{section.what_it_covers}</p>
          </div>
          <div>
            <p className="font-display text-[10px] tracking-widest text-muted-foreground uppercase mb-1">Why it matters</p>
            <p className="font-sans text-xs text-foreground/80">{section.why_it_matters}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="font-sans text-xs text-muted-foreground">Applies to: {section.who_applies}</span>
          {roles.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {roles.slice(0, 3).map((r) => <RoleChip key={r} roleKey={r} />)}
              {roles.length > 3 && <span className="font-sans text-xs text-muted-foreground">+{roles.length - 3}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
