import { formatDistanceToNow, format } from 'date-fns';
import { Clock, User, Scissors, FileText, Play, StickyNote } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DraftBooking } from '@/hooks/useDraftBookings';
import { isStructurallyEqual } from '@/lib/stableStringify';

interface DraftCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftA: DraftBooking;
  draftB: DraftBooking;
  onResume: (draft: DraftBooking) => void;
}

const WIZARD_STEPS = ['client', 'service', 'stylist', 'confirm'] as const;

function fieldDiffers(a: unknown, b: unknown): boolean {
  return !isStructurallyEqual(a, b);
}

function DiffCell({ label, valueA, valueB, renderValue }: {
  label: string;
  valueA: unknown;
  valueB: unknown;
  renderValue?: (v: unknown) => React.ReactNode;
}) {
  const differs = fieldDiffers(valueA, valueB);
  const render = renderValue || ((v: unknown) => (v as string) || '—');

  return (
    <>
      <div className={cn('p-2 rounded-lg', differs && 'bg-primary/10')}>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-display">{label}</span>
        <div className="text-sm font-sans mt-0.5">{render(valueA)}</div>
      </div>
      <div className={cn('p-2 rounded-lg', differs && 'bg-primary/10')}>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-display">{label}</span>
        <div className="text-sm font-sans mt-0.5">{render(valueB)}</div>
      </div>
    </>
  );
}

function StepDots({ stepReached }: { stepReached: string | null }) {
  const currentIdx = stepReached ? WIZARD_STEPS.indexOf(stepReached as any) : -1;
  return (
    <div className="flex items-center gap-1">
      {WIZARD_STEPS.map((s, i) => (
        <div
          key={s}
          className={cn('h-1.5 w-1.5 rounded-full', i <= currentIdx ? 'bg-primary' : 'bg-muted')}
          title={s}
        />
      ))}
      {stepReached && (
        <span className="text-[10px] text-muted-foreground ml-1 capitalize">{stepReached}</span>
      )}
    </div>
  );
}

export function DraftCompareDialog({ open, onOpenChange, draftA, draftB, onResume }: DraftCompareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 max-h-[85vh] overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="font-display tracking-wide text-base">COMPARE DRAFTS</DialogTitle>
          <DialogDescription className="font-sans text-sm">
            Side-by-side comparison for {draftA.client_name || 'No Client Selected'}. Fields that differ are highlighted.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(85vh-140px)] px-6 py-4">
          {/* Two-column grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Column headers */}
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="text-xs text-muted-foreground font-sans">
                {formatDistanceToNow(new Date(draftA.created_at), { addSuffix: true })}
              </span>
              <StepDots stepReached={draftA.step_reached} />
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="text-xs text-muted-foreground font-sans">
                {formatDistanceToNow(new Date(draftB.created_at), { addSuffix: true })}
              </span>
              <StepDots stepReached={draftB.step_reached} />
            </div>

            {/* Services */}
            <DiffCell
              label="Services"
              valueA={draftA.selected_services}
              valueB={draftB.selected_services}
              renderValue={(v) => {
                const svcs = v as { id: string; name: string }[];
                if (!svcs?.length) return '—';
                return (
                  <div className="flex flex-wrap gap-1">
                    {svcs.map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{s.name}</Badge>
                    ))}
                  </div>
                );
              }}
            />

            {/* Stylist */}
            <DiffCell label="Stylist" valueA={draftA.staff_name} valueB={draftB.staff_name} />

            {/* Date & Time */}
            <DiffCell
              label="Date & Time"
              valueA={`${draftA.appointment_date || '—'} ${draftA.start_time || ''}`}
              valueB={`${draftB.appointment_date || '—'} ${draftB.start_time || ''}`}
            />

            {/* Notes */}
            <DiffCell label="Notes" valueA={draftA.notes} valueB={draftB.notes} />

            {/* Created by */}
            <DiffCell label="Created by" valueA={draftA.created_by_name} valueB={draftB.created_by_name} />

            {/* Redo */}
            <DiffCell
              label="Redo"
              valueA={draftA.is_redo ? 'Yes' : 'No'}
              valueB={draftB.is_redo ? 'Yes' : 'No'}
            />

            {/* Resume buttons */}
            <div className="pt-3">
              <Button size="sm" className="w-full gap-1.5" onClick={() => onResume(draftA)}>
                <Play className="h-3.5 w-3.5" />
                Resume This One
              </Button>
            </div>
            <div className="pt-3">
              <Button size="sm" className="w-full gap-1.5" onClick={() => onResume(draftB)}>
                <Play className="h-3.5 w-3.5" />
                Resume This One
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
