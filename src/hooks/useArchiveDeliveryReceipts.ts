import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ArchiveDeliveryReceipts {
  emailSent: number;
  smsSent: number;
  smsFailed: number;
  emailOpens: number;
  failedSmsReasons: Array<{ to: string | null; error: string | null }>;
  windowEndsAt: string | null;
  isWithinWindow: boolean;
}

const RECEIPT_WINDOW_HOURS = 24;

/**
 * Surface delivery receipts for a single archive event.
 *
 * Honest-signal-only: this codebase's `email_send_log` does not record
 * bounce / failure status (only an attempted send + message_id). What we
 * CAN show:
 *  - Email sends attempted (from email_send_log)
 *  - Email opens (from email_tracking_events joined via message_id)
 *  - SMS sends + failures w/ Twilio error_message (from client_communications)
 *
 * Bounce/complaint capture would require a Resend webhook handler — out of
 * scope, see plan Out of Scope section.
 */
export function useArchiveDeliveryReceipts(
  archiveLogId: string | null | undefined,
  archivedAt: string | null | undefined,
  organizationId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['archive-delivery-receipts', organizationId, archiveLogId],
    queryFn: async (): Promise<ArchiveDeliveryReceipts> => {
      const empty: ArchiveDeliveryReceipts = {
        emailSent: 0,
        smsSent: 0,
        smsFailed: 0,
        emailOpens: 0,
        failedSmsReasons: [],
        windowEndsAt: null,
        isWithinWindow: false,
      };
      if (!archiveLogId || !organizationId) return empty;

      // Email send rows tagged with this archive_log_id.
      const { data: emailRows } = await supabase
        .from('email_send_log')
        .select('id, message_id')
        .eq('organization_id', organizationId)
        .eq('archive_log_id', archiveLogId);

      const emailSent = emailRows?.length ?? 0;
      const messageIds = (emailRows ?? [])
        .map((r) => r.message_id)
        .filter((m): m is string => !!m);

      // Open events on those message_ids.
      let emailOpens = 0;
      if (messageIds.length > 0) {
        const { data: events } = await supabase
          .from('email_tracking_events')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('event_type', 'open')
          .in('message_id', messageIds);
        emailOpens = events?.length ?? 0;
      }

      // SMS rows tagged with this archive_log_id.
      const { data: smsRows } = await supabase
        .from('client_communications')
        .select('id, status, error_message, to_phone')
        .eq('organization_id', organizationId)
        .eq('archive_log_id', archiveLogId)
        .eq('channel', 'sms');

      const smsSent = (smsRows ?? []).filter((r) => r.status === 'sent' || r.status === 'delivered').length;
      const smsFailed = (smsRows ?? []).filter((r) => r.status === 'failed' || r.status === 'undelivered').length;
      const failedSmsReasons = (smsRows ?? [])
        .filter((r) => r.status === 'failed' || r.status === 'undelivered')
        .slice(0, 3)
        .map((r) => ({ to: r.to_phone, error: r.error_message }));

      const windowEndsAt = archivedAt
        ? new Date(new Date(archivedAt).getTime() + RECEIPT_WINDOW_HOURS * 3600_000).toISOString()
        : null;
      const isWithinWindow = !!windowEndsAt && Date.now() < new Date(windowEndsAt).getTime();

      return { emailSent, smsSent, smsFailed, emailOpens, failedSmsReasons, windowEndsAt, isWithinWindow };
    },
    enabled: !!archiveLogId && !!organizationId,
    // Auto-refresh every 60s while inside the 24h window so receipts trickle in.
    refetchInterval: (q) => {
      const data = q.state.data as ArchiveDeliveryReceipts | undefined;
      return data?.isWithinWindow ? 60_000 : false;
    },
    staleTime: 30_000,
  });
}
