import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Check, Minus } from 'lucide-react';
import { ROLE_OPTIONS, EMPLOYMENT_TYPES } from '@/lib/handbook/brandTones';

interface Props {
  sections: any[];
  enabledRoles: string[];
  enabledEmploymentTypes: string[];
}

export function ApplicabilityMatrix({ sections, enabledRoles, enabledEmploymentTypes }: Props) {
  const roleCols = ROLE_OPTIONS.filter((r) => enabledRoles.includes(r.key));
  const empCols = EMPLOYMENT_TYPES.filter((e) => enabledEmploymentTypes.includes(e.key));

  if (sections.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <p className="font-sans text-sm text-muted-foreground">
            Select sections in the scope builder above to preview applicability.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border-border bg-card/80">
      <CardHeader>
        <CardTitle className={cn(tokens.card.title, 'tracking-wide')}>Applicability Preview</CardTitle>
        <p className="font-sans text-sm text-muted-foreground">
          Sections shown against the roles and employment types you enabled. You'll fine-tune each cell in the next step.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                <th className={cn(tokens.table.columnHeader, 'text-left py-2 pr-4 sticky left-0 bg-card')}>Section</th>
                {empCols.map((e) => (
                  <th key={e.key} className={cn(tokens.table.columnHeader, 'text-center py-2 px-2')}>{e.label}</th>
                ))}
                {roleCols.map((r) => (
                  <th key={r.key} className={cn(tokens.table.columnHeader, 'text-center py-2 px-2')}>{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => {
                const applies = s.applies_to || {};
                const empSet: string[] = applies.employment_types || [];
                const roleSet: string[] = applies.roles || [];
                const allRoles = roleSet.length === 0;
                return (
                  <tr key={s.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-4 sticky left-0 bg-card">
                      <span className="font-sans text-sm text-foreground">{s.title}</span>
                    </td>
                    {empCols.map((e) => (
                      <td key={e.key} className="text-center py-3 px-2">
                        {empSet.length === 0 || empSet.includes(e.key) ? (
                          <Check className="w-4 h-4 text-primary inline-block" />
                        ) : (
                          <Minus className="w-4 h-4 text-muted-foreground/40 inline-block" />
                        )}
                      </td>
                    ))}
                    {roleCols.map((r) => (
                      <td key={r.key} className="text-center py-3 px-2">
                        {allRoles || roleSet.includes(r.key) ? (
                          <Check className="w-4 h-4 text-primary inline-block" />
                        ) : (
                          <Minus className="w-4 h-4 text-muted-foreground/40 inline-block" />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
