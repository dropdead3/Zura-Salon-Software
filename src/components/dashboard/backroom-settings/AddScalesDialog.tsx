import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Weight, Minus, Plus, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

const SCALE_LICENSE_MONTHLY = 10;
const SCALE_HARDWARE_PRICE = 199;

interface AddScalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddScalesDialog({ open, onOpenChange }: AddScalesDialogProps) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const { effectiveOrganization } = useOrganizationContext();

  const handleAdd = async () => {
    if (!effectiveOrganization?.id) {
      toast.error('No organization found');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-backroom-scales', {
        body: {
          organization_id: effectiveOrganization.id,
          additional_scales: qty,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        toast.success(`${qty} scale license(s) added to your subscription`);
        onOpenChange(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add scales';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={tokens.heading.section}>Add More Scales</DialogTitle>
          <DialogDescription className="font-sans text-sm">
            Add scale licenses and hardware to your existing Backroom subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Quantity selector */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Weight className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className={cn(tokens.label.default, 'text-foreground text-sm')}><p className={cn(tokens.label.default, 'text-foreground text-sm')}>Precision Scale</p></p>
                <p className="text-xs text-muted-foreground font-sans">
                  ${SCALE_HARDWARE_PRICE} one-time + ${SCALE_LICENSE_MONTHLY}/mo each
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setQty(Math.max(1, qty - 1))}
                disabled={qty <= 1}
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>
              <span className={cn(tokens.stat.large, 'w-8 text-center text-foreground')}>{qty}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setQty(Math.min(10, qty + 1))}
                disabled={qty >= 10}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="space-y-2 text-sm font-sans">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scale license × {qty}</span>
              <span className="text-foreground font-medium">+${qty * SCALE_LICENSE_MONTHLY}/mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hardware × {qty} (one-time)</span>
              <span className="text-foreground font-medium">${qty * SCALE_HARDWARE_PRICE}</span>
            </div>
          </div>

          <Button
            className="w-full font-sans font-medium gap-2"
            onClick={handleAdd}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                Add {qty} Scale{qty > 1 ? 's' : ''} — ${qty * SCALE_HARDWARE_PRICE} + ${qty * SCALE_LICENSE_MONTHLY}/mo
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
