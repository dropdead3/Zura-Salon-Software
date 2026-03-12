import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { ClientTransformation } from '@/hooks/useClientTransformations';
import type { ClientFormula } from '@/hooks/backroom/useClientFormulaHistory';

interface CompareVisitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryA: ClientTransformation;
  entryB: ClientTransformation;
  formulasA: ClientFormula[];
  formulasB: ClientFormula[];
}

export function CompareVisitsDialog({
  open,
  onOpenChange,
  entryA,
  entryB,
  formulasA,
  formulasB,
}: CompareVisitsDialogProps) {
  const formatDate = (d: string | null) =>
    d ? format(new Date(d + 'T00:00:00'), 'MMM d, yyyy') : 'No date';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={tokens.heading.card}>Compare Transformations</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Column A */}
          <div className="space-y-3">
            <div className="text-center">
              <span className={tokens.body.emphasis}>{formatDate(entryA.taken_at)}</span>
              {entryA.service_name && (
                <Badge variant="secondary" className="ml-2 text-[10px]">{entryA.service_name}</Badge>
              )}
            </div>

            {/* Before */}
            <div>
              <span className={tokens.label.tiny}>Before</span>
              <div className="aspect-[3/4] rounded-lg bg-muted overflow-hidden mt-1">
                {entryA.before_url ? (
                  <img src={entryA.before_url} alt="Before" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className={tokens.body.muted}>No photo</span>
                  </div>
                )}
              </div>
            </div>

            {/* After */}
            <div>
              <span className={tokens.label.tiny}>After</span>
              <div className="aspect-[3/4] rounded-lg bg-muted overflow-hidden mt-1">
                {entryA.after_url ? (
                  <img src={entryA.after_url} alt="After" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className={tokens.body.muted}>No photo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Formula */}
            {formulasA.length > 0 && (
              <div>
                <span className={tokens.label.tiny}>Formula</span>
                {formulasA.map(f => (
                  <div key={f.id} className="mt-1 text-xs space-y-0.5">
                    {f.formula_data?.map((line, i) => (
                      <div key={i} className={tokens.body.muted}>
                        {line.productName} — {line.quantity}{line.unit || 'g'}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {entryA.notes && (
              <div>
                <span className={tokens.label.tiny}>Notes</span>
                <p className={cn(tokens.body.muted, 'mt-1 text-xs')}>{entryA.notes}</p>
              </div>
            )}
          </div>

          {/* Column B */}
          <div className="space-y-3">
            <div className="text-center">
              <span className={tokens.body.emphasis}>{formatDate(entryB.taken_at)}</span>
              {entryB.service_name && (
                <Badge variant="secondary" className="ml-2 text-[10px]">{entryB.service_name}</Badge>
              )}
            </div>

            <div>
              <span className={tokens.label.tiny}>Before</span>
              <div className="aspect-[3/4] rounded-lg bg-muted overflow-hidden mt-1">
                {entryB.before_url ? (
                  <img src={entryB.before_url} alt="Before" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className={tokens.body.muted}>No photo</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <span className={tokens.label.tiny}>After</span>
              <div className="aspect-[3/4] rounded-lg bg-muted overflow-hidden mt-1">
                {entryB.after_url ? (
                  <img src={entryB.after_url} alt="After" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className={tokens.body.muted}>No photo</span>
                  </div>
                )}
              </div>
            </div>

            {formulasB.length > 0 && (
              <div>
                <span className={tokens.label.tiny}>Formula</span>
                {formulasB.map(f => (
                  <div key={f.id} className="mt-1 text-xs space-y-0.5">
                    {f.formula_data?.map((line, i) => (
                      <div key={i} className={tokens.body.muted}>
                        {line.productName} — {line.quantity}{line.unit || 'g'}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {entryB.notes && (
              <div>
                <span className={tokens.label.tiny}>Notes</span>
                <p className={cn(tokens.body.muted, 'mt-1 text-xs')}>{entryB.notes}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
