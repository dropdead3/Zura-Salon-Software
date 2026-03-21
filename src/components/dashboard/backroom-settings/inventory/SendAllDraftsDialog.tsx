/**
 * SendAllDraftsDialog — Confirmation dialog for batch-sending all draft POs.
 * Groups drafts by sendable (has email) vs skipped (no email).
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, AlertTriangle } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';

interface SendAllDraftsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftPOs: PurchaseOrder[];
  onComplete: () => void;
}

export function SendAllDraftsDialog({ open, onOpenChange, draftPOs, onComplete }: SendAllDraftsDialogProps) {
  const [sending, setSending] = useState(false);

  const sendable = draftPOs.filter(po => po.supplier_email);
  const skipped = draftPOs.filter(po => !po.supplier_email);

  const handleSendAll = async () => {
    if (sendable.length === 0) return;
    setSending(true);

    let successCount = 0;
    let failCount = 0;

    for (const po of sendable) {
      try {
        const { error } = await supabase.functions.invoke('send-reorder-email', {
          body: { purchase_order_id: po.id },
        });
        if (error) throw error;

        await supabase
          .from('purchase_orders')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', po.id);

        successCount++;
      } catch {
        failCount++;
      }
    }

    setSending(false);
    onOpenChange(false);
    onComplete();

    if (failCount === 0) {
      toast.success(`${successCount} PO${successCount !== 1 ? 's' : ''} sent to suppliers`);
    } else {
      toast.warning(`${successCount} sent, ${failCount} failed`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide">Send All Draft POs</DialogTitle>
          <DialogDescription>
            Email draft purchase orders to their respective suppliers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {sendable.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-sans">
                <span className="font-medium">{sendable.length}</span> PO{sendable.length !== 1 ? 's' : ''} will be emailed to suppliers
              </span>
            </div>
          )}

          {skipped.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/5 border border-warning/20">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
              <span className="text-sm font-sans text-muted-foreground">
                <span className="font-medium text-foreground">{skipped.length}</span> PO{skipped.length !== 1 ? 's' : ''} skipped — no supplier email
              </span>
            </div>
          )}

          {sendable.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4 font-sans">
              No draft POs have supplier emails configured.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-sans">
            Cancel
          </Button>
          <Button
            onClick={handleSendAll}
            disabled={sending || sendable.length === 0}
            className="font-sans"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-1.5" />
                Send {sendable.length} PO{sendable.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
