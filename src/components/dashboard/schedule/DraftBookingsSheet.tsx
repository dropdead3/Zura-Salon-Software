import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, FileText, Trash2, Play, Clock, User, Scissors, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDraftBookings, useDeleteDraft, useBatchDeleteDrafts, type DraftBooking } from '@/hooks/useDraftBookings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const WIZARD_STEPS = ['client', 'service', 'stylist', 'confirm'] as const;

interface DraftBookingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string | undefined;
  onResume: (draft: DraftBooking) => void;
}

function StepProgress({ stepReached }: { stepReached: string | null }) {
  const currentIdx = stepReached ? WIZARD_STEPS.indexOf(stepReached as any) : -1;
  return (
    <div className="flex items-center gap-1">
      {WIZARD_STEPS.map((s, i) => (
        <div
          key={s}
          className={cn(
            'h-1.5 w-1.5 rounded-full transition-colors',
            i <= currentIdx ? 'bg-primary' : 'bg-muted'
          )}
          title={s.charAt(0).toUpperCase() + s.slice(1)}
        />
      ))}
      {stepReached && (
        <span className="text-[10px] text-muted-foreground ml-1 capitalize">{stepReached}</span>
      )}
    </div>
  );
}

export function DraftBookingsSheet({ open, onOpenChange, orgId, onResume }: DraftBookingsSheetProps) {
  const { data: drafts = [], isLoading } = useDraftBookings(orgId);
  const deleteDraft = useDeleteDraft();
  const batchDelete = useBatchDeleteDrafts();
  const [search, setSearch] = useState('');
  const [discardingDraft, setDiscardingDraft] = useState<DraftBooking | null>(null);
  const [discardingGroup, setDiscardingGroup] = useState<{ clientKey: string; ids: string[] } | null>(null);

  const filtered = drafts.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.client_name?.toLowerCase().includes(q) ||
      d.staff_name?.toLowerCase().includes(q) ||
      d.selected_services?.some(s => s.name?.toLowerCase().includes(q))
    );
  });

  // Group by client name
  const grouped = useMemo(() => {
    const map = new Map<string, DraftBooking[]>();
    for (const draft of filtered) {
      const key = draft.client_name || 'No Client Selected';
      const existing = map.get(key) || [];
      existing.push(draft);
      map.set(key, existing);
    }
    return map;
  }, [filtered]);

  const handleDiscard = () => {
    if (!discardingDraft || !orgId) return;
    deleteDraft.mutate(
      { id: discardingDraft.id, orgId },
      {
        onSuccess: () => {
          toast.success('Draft discarded');
          setDiscardingDraft(null);
        },
      }
    );
  };

  const handleDiscardGroup = () => {
    if (!discardingGroup || !orgId) return;
    batchDelete.mutate(
      { ids: discardingGroup.ids, orgId },
      {
        onSuccess: () => {
          toast.success(`${discardingGroup.ids.length} drafts discarded`);
          setDiscardingGroup(null);
        },
      }
    );
  };

  const handleResume = (draft: DraftBooking) => {
    onResume(draft);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <SheetTitle className="font-display tracking-wide text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              DRAFT BOOKINGS
            </SheetTitle>
            <SheetDescription className="font-sans text-sm">
              Resume incomplete bookings or discard them.
            </SheetDescription>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drafts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading drafts...</div>
              ) : grouped.size === 0 ? (
                <div className={tokens.empty.container}>
                  <FileText className={tokens.empty.icon} />
                  <h3 className={tokens.empty.heading}>No drafts</h3>
                  <p className={tokens.empty.description}>
                    {search ? 'No drafts match your search.' : 'Incomplete bookings will appear here.'}
                  </p>
                </div>
              ) : (
                Array.from(grouped.entries()).map(([clientKey, clientDrafts]) => (
                  <ClientGroup
                    key={clientKey}
                    clientKey={clientKey}
                    drafts={clientDrafts}
                    orgId={orgId}
                    onResume={handleResume}
                    onDiscard={setDiscardingDraft}
                    onDiscardAll={(ids) => setDiscardingGroup({ clientKey, ids })}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Single draft discard dialog */}
      <AlertDialog open={!!discardingDraft} onOpenChange={(open) => !open && setDiscardingDraft(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this draft booking for{' '}
              {discardingDraft?.client_name || 'unknown client'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch discard dialog */}
      <AlertDialog open={!!discardingGroup} onOpenChange={(open) => !open && setDiscardingGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard all drafts for {discardingGroup?.clientKey}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {discardingGroup?.ids.length} draft{(discardingGroup?.ids.length || 0) > 1 ? 's' : ''}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface ClientGroupProps {
  clientKey: string;
  drafts: DraftBooking[];
  orgId: string | undefined;
  onResume: (draft: DraftBooking) => void;
  onDiscard: (draft: DraftBooking) => void;
  onDiscardAll: (ids: string[]) => void;
}

function ClientGroup({ clientKey, drafts, onResume, onDiscard, onDiscardAll }: ClientGroupProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
        {/* Group header */}
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-sans text-sm text-foreground">{clientKey}</span>
              <span className="text-xs text-muted-foreground">
                ({drafts.length} draft{drafts.length > 1 ? 's' : ''})
              </span>
            </div>
            {drafts.length >= 2 && (
              <span
                className="text-xs text-destructive hover:underline cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDiscardAll(drafts.map(d => d.id));
                }}
              >
                Discard All
              </span>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {drafts.map((draft, index) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                isMostRecent={index === 0}
                onResume={onResume}
                onDiscard={onDiscard}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface DraftCardProps {
  draft: DraftBooking;
  isMostRecent: boolean;
  onResume: (draft: DraftBooking) => void;
  onDiscard: (draft: DraftBooking) => void;
}

function DraftCard({ draft, isMostRecent, onResume, onDiscard }: DraftCardProps) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/60 p-3 space-y-2">
      {/* Top row: badges + time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isMostRecent && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Most Recent</Badge>
          )}
          {draft.is_redo && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Redo</Badge>
          )}
          <StepProgress stepReached={draft.step_reached} />
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true })}
        </span>
      </div>

      {/* Services */}
      {draft.selected_services?.length > 0 && (
        <div className="flex items-start gap-2">
          <Scissors className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {draft.selected_services.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                {s.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Stylist + Date + Created by */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        {draft.staff_name && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {draft.staff_name}
          </span>
        )}
        {draft.appointment_date && <span>{draft.appointment_date}</span>}
        {draft.start_time && <span>{draft.start_time}</span>}
        {draft.created_by_name && (
          <span className="text-muted-foreground/70">by {draft.created_by_name}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-0.5">
        <Button
          size={tokens.button.inline}
          onClick={() => onResume(draft)}
          className="gap-1.5 flex-1"
        >
          <Play className="h-3.5 w-3.5" />
          Resume
        </Button>
        <Button
          variant="outline"
          size={tokens.button.inline}
          onClick={() => onDiscard(draft)}
          className="gap-1.5 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Discard
        </Button>
      </div>
    </div>
  );
}
