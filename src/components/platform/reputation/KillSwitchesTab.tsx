/**
 * KillSwitchesTab — Master kill-switch console for the Reputation engine.
 * Three independent toggles (dispatch, manual send, webhook processing)
 * with a shared reason/notes capture. Engaging any switch stamps the
 * actor + reason and writes a `reputation_admin_actions` audit row.
 */
import { useState } from 'react';
import {
  PlatformCard, PlatformCardHeader, PlatformCardTitle, PlatformCardContent, PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformSwitch } from '@/components/platform/ui/PlatformSwitch';
import { PlatformLabel } from '@/components/platform/ui/PlatformLabel';
import { PlatformTextarea } from '@/components/platform/ui/PlatformTextarea';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import {
  useReputationKillSwitches,
  useToggleReputationKillSwitch,
  type ReputationKillSwitchKey,
} from '@/hooks/reputation/useReputationKillSwitches';
import { Loader2, AlertOctagon } from 'lucide-react';
import { format } from 'date-fns';

interface SwitchDef {
  key: ReputationKillSwitchKey;
  label: string;
  description: string;
}

const SWITCHES: SwitchDef[] = [
  {
    key: 'dispatch_disabled',
    label: 'Dispatch (cron)',
    description: 'Halts the hourly review-request dispatch job across all organizations.',
  },
  {
    key: 'manual_send_disabled',
    label: 'Manual sends',
    description: 'Blocks operator-triggered one-off review requests from the org dashboard.',
  },
  {
    key: 'webhook_processing_disabled',
    label: 'Stripe webhooks',
    description: 'No-ops the Reputation branch of the Stripe webhook (checkout, cancel, sync).',
  },
];

export function KillSwitchesTab() {
  const { data, isLoading } = useReputationKillSwitches();
  const toggle = useToggleReputationKillSwitch();
  const [reason, setReason] = useState('');

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  const anyEngaged =
    data.dispatch_disabled || data.manual_send_disabled || data.webhook_processing_disabled;

  return (
    <div className="space-y-6">
      {anyEngaged && (
        <PlatformCard className="border-amber-500/40 bg-amber-500/5">
          <PlatformCardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-display text-sm tracking-wide uppercase text-amber-600 dark:text-amber-400">
                  Reputation Engine — Kill Switch Engaged
                </p>
                {data.disabled_reason && (
                  <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">
                    Reason: <span className="text-[hsl(var(--platform-foreground))]">{data.disabled_reason}</span>
                  </p>
                )}
                {data.disabled_at && (
                  <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">
                    Engaged {format(new Date(data.disabled_at), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            </div>
          </PlatformCardContent>
        </PlatformCard>
      )}

      <PlatformCard>
        <PlatformCardHeader>
          <PlatformCardTitle>Reason for next change</PlatformCardTitle>
          <PlatformCardDescription>
            Captured on the audit row + stamped on the singleton row when engaging a switch. Required for outage / legal hold paper trail.
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent>
          <PlatformLabel htmlFor="reason">Reason</PlatformLabel>
          <PlatformTextarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Twilio outage — pausing dispatch until upstream is healthy"
            rows={2}
          />
        </PlatformCardContent>
      </PlatformCard>

      <PlatformCard>
        <PlatformCardHeader>
          <PlatformCardTitle>Master switches</PlatformCardTitle>
          <PlatformCardDescription>
            Each switch short-circuits the corresponding edge-function path. Fail-open: if the read fails, dispatch continues.
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          {SWITCHES.map((s) => {
            const engaged = data[s.key];
            return (
              <div
                key={s.key}
                className="flex items-start justify-between gap-6 p-4 rounded-lg border border-[hsl(var(--platform-border)/0.4)]"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[hsl(var(--platform-foreground))]">{s.label}</p>
                    {engaged && <PlatformBadge variant="warning">Engaged</PlatformBadge>}
                  </div>
                  <p className="text-sm text-[hsl(var(--platform-foreground-muted))]">{s.description}</p>
                </div>
                <PlatformSwitch
                  checked={engaged}
                  disabled={toggle.isPending}
                  onCheckedChange={(checked) =>
                    toggle.mutate({ key: s.key, enabled: checked, reason: reason || undefined })
                  }
                />
              </div>
            );
          })}
        </PlatformCardContent>
      </PlatformCard>
    </div>
  );
}
