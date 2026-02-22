import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, FileText, Trash2, Play, Clock, User, Scissors, MapPin } from 'lucide-react';
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
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDraftBookings, useDeleteDraft, type DraftBooking } from '@/hooks/useDraftBookings';
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

interface DraftBookingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string | undefined;
  onResume: (draft: DraftBooking) => void;
}

export function DraftBookingsSheet({ open, onOpenChange, orgId, onResume }: DraftBookingsSheetProps) {
  const { data: drafts = [], isLoading } = useDraftBookings(orgId);
  const deleteDraft = useDeleteDraft();
  const [search, setSearch] = useState('');
  const [discardingDraft, setDiscardingDraft] = useState<DraftBooking | null>(null);

  const filtered = drafts.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.client_name?.toLowerCase().includes(q) ||
      d.staff_name?.toLowerCase().includes(q) ||
      d.selected_services?.some(s => s.name?.toLowerCase().includes(q))
    );
  });

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
            <div className="p-4 space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading drafts...</div>
              ) : filtered.length === 0 ? (
                <div className={tokens.empty.container}>
                  <FileText className={tokens.empty.icon} />
                  <h3 className={tokens.empty.heading}>No drafts</h3>
                  <p className={tokens.empty.description}>
                    {search ? 'No drafts match your search.' : 'Incomplete bookings will appear here.'}
                  </p>
                </div>
              ) : (
                filtered.map((draft) => (
                  <div
                    key={draft.id}
                    className="rounded-xl border border-border/60 bg-card p-4 space-y-3"
                  >
                    {/* Client + time ago */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-sans text-sm text-foreground">
                          {draft.client_name || 'No client selected'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Services */}
                    {draft.selected_services?.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Scissors className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {draft.selected_services.map((s, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {s.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stylist + Date */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {draft.staff_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {draft.staff_name}
                        </span>
                      )}
                      {draft.appointment_date && (
                        <span>{draft.appointment_date}</span>
                      )}
                      {draft.start_time && (
                        <span>{draft.start_time}</span>
                      )}
                    </div>

                    {draft.is_redo && (
                      <Badge variant="outline" className="text-xs">Redo / Adjustment</Badge>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size={tokens.button.inline}
                        onClick={() => handleResume(draft)}
                        className="gap-1.5 flex-1"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Resume
                      </Button>
                      <Button
                        variant="outline"
                        size={tokens.button.inline}
                        onClick={() => setDiscardingDraft(draft)}
                        className="gap-1.5 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Discard
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

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
    </>
  );
}
