import { useState } from 'react';
import { Shuffle, Copy, AlertTriangle, CheckCircle2, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AvailableStylist, RandomAssignResult } from '@/hooks/useChairAssignments';

interface RandomAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stylists: AvailableStylist[];
  onRandomize: (excludeIds: string[]) => RandomAssignResult;
  onCarryover: () => Promise<RandomAssignResult | null>;
  onApply: (assignments: Array<{ chairId: string; stylistUserId: string }>) => void;
  isApplying: boolean;
}

export function RandomAssignModal({
  open,
  onOpenChange,
  stylists,
  onRandomize,
  onCarryover,
  onApply,
  isApplying,
}: RandomAssignModalProps) {
  const [excludeIds, setExcludeIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<RandomAssignResult | null>(null);
  const [mode, setMode] = useState<'idle' | 'preview'>('idle');

  const toggleExclude = (id: string) => {
    setExcludeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRandomize = () => {
    const r = onRandomize(Array.from(excludeIds));
    setResult(r);
    setMode('preview');
  };

  const handleCarryover = async () => {
    const r = await onCarryover();
    if (r) {
      setResult(r);
      setMode('preview');
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApply(result.assignments);
    setMode('idle');
    setResult(null);
    setExcludeIds(new Set());
    onOpenChange(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setMode('idle');
      setResult(null);
    }
    onOpenChange(v);
  };

  const stylistMap = new Map(stylists.map(s => [s.user_id, s]));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className={tokens.heading.card}>
            {mode === 'idle' ? 'Assign Chairs' : 'Preview Assignments'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'idle'
              ? 'Randomize or copy from last week. Exclude stylists as needed.'
              : `${result?.assignments.length ?? 0} assignments ready. ${result?.exclusions.length ?? 0} excluded.`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {mode === 'idle' ? (
            <div className="space-y-4">
              {/* Exclude list */}
              <div>
                <h4 className={cn(tokens.label.default, 'mb-2')}>Exclude stylists</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {stylists.map(s => (
                    <label
                      key={s.user_id}
                      className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={excludeIds.has(s.user_id)}
                        onCheckedChange={() => toggleExclude(s.user_id)}
                      />
                      <span className={tokens.body.default}>
                        {s.display_name || s.full_name || 'Unknown'}
                      </span>
                    </label>
                  ))}
                  {stylists.length === 0 && (
                    <p className={tokens.body.muted}>No stylists found for this location</p>
                  )}
                </div>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Exclusions */}
              {result.exclusions.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-destructive" />
                    <span className={cn(tokens.label.default, 'text-destructive')}>
                      {result.exclusions.length} stylist{result.exclusions.length > 1 ? 's' : ''} excluded
                    </span>
                  </div>
                  {result.exclusions.map(ex => (
                    <div key={ex.stylistId} className="flex items-center justify-between text-sm">
                      <span className={tokens.body.default}>{ex.stylistName}</span>
                      <Badge variant="outline" className="text-xs">
                        {ex.reason}: {ex.details}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Unassigned chairs warning */}
              {result.unassignedChairs.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span className={tokens.body.muted}>
                    {result.unassignedChairs.length} chair{result.unassignedChairs.length > 1 ? 's' : ''} will remain unassigned
                  </span>
                </div>
              )}

              {/* Assignment count */}
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <span className={tokens.body.default}>
                  {result.assignments.length} assignment{result.assignments.length !== 1 ? 's' : ''} ready
                </span>
              </div>
            </div>
          ) : null}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          {mode === 'idle' ? (
            <>
              <Button variant="outline" onClick={handleCarryover} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy Last Week
              </Button>
              <Button onClick={handleRandomize} className="gap-2">
                <Shuffle className="h-4 w-4" />
                Randomize
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setMode('idle')}>
                Back
              </Button>
              <Button onClick={handleApply} disabled={isApplying || !result?.assignments.length}>
                {isApplying ? 'Saving...' : 'Apply Assignments'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
