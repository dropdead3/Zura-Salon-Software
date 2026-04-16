import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, FileText, Clock, User, Scissors, ChevronDown, ChevronRight, GitCompareArrows, CheckCircle2, AlertTriangle, Loader2, Trash2, Play } from 'lucide-react';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDraftBookings, useDeleteDraft, useBatchDeleteDrafts, useSaveDraft, type DraftBooking } from '@/hooks/useDraftBookings';
import { useDraftAvailabilityCheck, formatTimeDisplay } from '@/hooks/useDraftAvailabilityCheck';
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
import { DraftCompareDialog } from './DraftCompareDialog';

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
  const [clearAllOpen, setClearAllOpen] = useState(false);

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

  const handleClearAll = () => {
    if (!orgId || drafts.length === 0) return;
    const ids = drafts.map(d => d.id);
    batchDelete.mutate(
      { ids, orgId },
      {
        onSuccess: () => {
          toast.success(`Cleared ${ids.length} draft${ids.length > 1 ? 's' : ''}`);
          setClearAllOpen(false);
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
      <PremiumFloatingPanel open={open} onOpenChange={onOpenChange} maxWidth="440px">
        <div className="p-5 pb-3 border-b border-border/40">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-sm tracking-wide uppercase flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Draft Bookings
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Resume incomplete bookings or discard them. Drafts auto-delete after 7 days.
              </p>
            </div>
            {drafts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setClearAllOpen(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 -mt-1 -mr-1"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drafts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-2">
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
                  onCloseSheet={() => onOpenChange(false)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </PremiumFloatingPanel>

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

      {/* Clear all drafts dialog */}
      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all drafts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {drafts.length} draft booking{drafts.length > 1 ? 's' : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear All
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
  onCloseSheet: () => void;
}

function ClientGroup({ clientKey, drafts, orgId, onResume, onDiscard, onDiscardAll, onCloseSheet }: ClientGroupProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const showCompare = drafts.length >= 2;

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      }
      return next;
    });
  };

  const compareArray = Array.from(compareIds);
  const compareDraftA = drafts.find(d => d.id === compareArray[0]);
  const compareDraftB = drafts.find(d => d.id === compareArray[1]);

  const handleCompareResume = (draft: DraftBooking) => {
    setCompareIds(new Set());
    onResume(draft);
    onCloseSheet();
  };

  return (
    <>
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
              <div className="flex items-center gap-2">
                {showCompare && compareIds.size === 2 && (
                  <span
                    className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1"
                    onClick={(e) => { e.stopPropagation(); }}
                  >
                    <GitCompareArrows className="h-3 w-3" />
                    Comparing
                  </span>
                )}
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
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-3 pb-3 space-y-2">
              {drafts.map((draft, index) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  orgId={orgId}
                  isMostRecent={index === 0}
                  onResume={onResume}
                  onDiscard={onDiscard}
                  showCompare={showCompare}
                  isCompareSelected={compareIds.has(draft.id)}
                  onToggleCompare={() => toggleCompare(draft.id)}
                  compareDisabled={compareIds.size >= 2 && !compareIds.has(draft.id)}
                />
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Compare dialog */}
      {compareDraftA && compareDraftB && (
        <DraftCompareDialog
          open={compareIds.size === 2}
          onOpenChange={(open) => { if (!open) setCompareIds(new Set()); }}
          draftA={compareDraftA}
          draftB={compareDraftB}
          onResume={handleCompareResume}
        />
      )}
    </>
  );
}

interface DraftCardProps {
  draft: DraftBooking;
  orgId: string | undefined;
  isMostRecent: boolean;
  onResume: (draft: DraftBooking) => void;
  onDiscard: (draft: DraftBooking) => void;
  showCompare?: boolean;
  isCompareSelected?: boolean;
  onToggleCompare?: () => void;
  compareDisabled?: boolean;
}

function DraftCard({ draft, orgId, isMostRecent, onResume, onDiscard, showCompare, isCompareSelected, onToggleCompare, compareDisabled }: DraftCardProps) {
  const { status, nextSlots, isLoading: availabilityLoading } = useDraftAvailabilityCheck(draft);
  const saveDraft = useSaveDraft();

  const handleQuickRebook = (newTime: string) => {
    if (!orgId) return;
    saveDraft.mutate({
      id: draft.id,
      organization_id: draft.organization_id,
      location_id: draft.location_id || undefined,
      appointment_date: draft.appointment_date || undefined,
      start_time: newTime,
      client_id: draft.client_id,
      client_name: draft.client_name,
      staff_user_id: draft.staff_user_id,
      staff_name: draft.staff_name,
      selected_services: draft.selected_services,
      notes: draft.notes || undefined,
      step_reached: draft.step_reached || undefined,
      is_redo: draft.is_redo,
      redo_metadata: draft.redo_metadata,
    }, {
      onSuccess: () => {
        toast.success('Time updated', {
          description: `Moved to ${formatTimeDisplay(newTime)}`,
        });
        onResume({ ...draft, start_time: newTime });
      },
    });
  };

  return (
    <div className="rounded-lg border border-border/40 bg-background/60 p-3 space-y-2">
      {/* Top row: badges + time + compare checkbox */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showCompare && (
            <Checkbox
              checked={isCompareSelected}
              onCheckedChange={() => onToggleCompare?.()}
              disabled={compareDisabled}
              className="h-3.5 w-3.5"
              aria-label="Select for comparison"
            />
          )}
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
        {draft.start_time && <span>{formatTimeDisplay(draft.start_time)}</span>}
        {draft.created_by_name && (
          <span className="text-muted-foreground/70">by {draft.created_by_name}</span>
        )}
      </div>

      {/* Availability indicator */}
      {draft.appointment_date && draft.start_time && draft.staff_user_id && (
        <div className="text-[11px]">
          {availabilityLoading ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Checking availability...</span>
            </div>
          ) : status === 'available' ? (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              <span>Slot still open</span>
            </div>
          ) : status === 'conflict' ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                <span>Original slot taken</span>
              </div>
              {nextSlots.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-muted-foreground text-[10px]">Next available:</span>
                  {nextSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickRebook(slot);
                      }}
                      className="px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground text-[10px] transition-colors"
                    >
                      {formatTimeDisplay(slot)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/30 mt-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation();
            onDiscard(draft);
          }}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Discard
        </Button>
        <Button
          size="sm"
          className="h-6 text-[10px]"
          onClick={(e) => {
            e.stopPropagation();
            onResume(draft);
          }}
        >
          <Play className="h-3 w-3 mr-1" />
          Resume
        </Button>
      </div>
    </div>
  );
}
