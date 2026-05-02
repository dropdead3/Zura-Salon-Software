import { useState } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props extends Omit<ButtonProps, 'onClick'> {
  appointmentId: string;
  label?: string;
}

/**
 * Operator-triggered review request for a single appointment.
 * Calls the `send-review-request-manual` edge function (org-admin gated).
 * Honors the 90-day frequency cap by default; if the cap is hit the user is
 * prompted to confirm an override (sent with `force: true`).
 */
export function SendReviewRequestButton({ appointmentId, label = 'Send Review Request', ...rest }: Props) {
  const [busy, setBusy] = useState(false);

  const send = async (force: boolean) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-review-request-manual', {
        body: { appointment_id: appointmentId, force },
      });
      if (error) {
        // Edge function error responses surface in `data` even on non-2xx
        const payload = (error as any)?.context?.body ?? data;
        const reason = typeof payload === 'string' ? payload : payload?.error;
        if (reason === 'frequency_cap_hit') {
          if (window.confirm('This client received a review request within the last 90 days. Send anyway?')) {
            await send(true);
            return;
          }
          return;
        }
        throw new Error(reason ?? error.message);
      }
      toast.success('Review request sent');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to send review request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={() => send(false)} disabled={busy} {...rest}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {label}
    </Button>
  );
}
