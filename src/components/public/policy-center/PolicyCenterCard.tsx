/**
 * Wave 28.8 + 28.10 — Single policy card on the public Client Policy Center.
 *
 * Renders the approved `client` variant body as markdown inside a collapsible.
 * Read-only — operators edit upstream via Policy OS.
 *
 * 28.10: When `requiresAcknowledgment` is true and the client has not yet
 * acknowledged, surfaces a typed-signature acknowledgment footer.
 */
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { PublicPolicyEntry } from '@/hooks/policy/usePublicOrgPolicies';
import { useRecordPolicyAcknowledgment } from '@/hooks/policy/usePolicyAcknowledgments';
import {
  AcknowledgeIdentityModal,
  loadStoredIdentity,
  type AckIdentity,
} from './AcknowledgeIdentityModal';

interface PolicyCenterCardProps {
  policy: PublicPolicyEntry;
  defaultOpen?: boolean;
  requiresAcknowledgment?: boolean;
  alreadyAcknowledged?: boolean;
  alreadyAcknowledgedAt?: string | null;
  onAcknowledged?: (info: { policyId: string; ackedAt: string; identity: AckIdentity }) => void;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function PolicyCenterCard({
  policy,
  defaultOpen = false,
  requiresAcknowledgment = false,
  alreadyAcknowledged = false,
  alreadyAcknowledgedAt = null,
  onAcknowledged,
}: PolicyCenterCardProps) {
  const [open, setOpen] = useState(defaultOpen || (requiresAcknowledgment && !alreadyAcknowledged));
  const lastUpdated = formatDate(policy.approvedAt);
  const { toast } = useToast();
  const record = useRecordPolicyAcknowledgment();

  const [identityOpen, setIdentityOpen] = useState(false);
  const [identity, setIdentity] = useState<AckIdentity | null>(null);
  const [signature, setSignature] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [localAcked, setLocalAcked] = useState<{ at: string } | null>(null);

  // Hydrate identity from localStorage and prefill signature with name.
  useEffect(() => {
    if (requiresAcknowledgment && !identity) {
      const stored = loadStoredIdentity();
      if (stored) {
        setIdentity(stored);
        setSignature((s) => s || stored.name);
      }
    }
  }, [requiresAcknowledgment, identity]);

  const acknowledged = alreadyAcknowledged || !!localAcked;
  const ackedAtDisplay = useMemo(() => {
    const iso = localAcked?.at ?? alreadyAcknowledgedAt;
    return iso ? formatDateTime(iso) : null;
  }, [localAcked, alreadyAcknowledgedAt]);

  const submit = async (idForSubmit: AckIdentity) => {
    try {
      const result = await record.mutateAsync({
        policy_id: policy.policyId,
        client_email: idForSubmit.email,
        client_name: idForSubmit.name,
        signature_text: signature.trim() || idForSubmit.name,
        acknowledgment_method: 'typed_signature',
      });
      setLocalAcked({ at: result.acknowledged_at });
      toast({
        title: 'Acknowledged',
        description: `Recorded at ${formatDateTime(result.acknowledged_at)}.`,
      });
      onAcknowledged?.({
        policyId: policy.policyId,
        ackedAt: result.acknowledged_at,
        identity: idForSubmit,
      });
    } catch (err) {
      toast({
        title: 'Could not record acknowledgment',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = () => {
    if (!agreed) return;
    if (!signature.trim()) return;
    if (!identity) {
      setIdentityOpen(true);
      return;
    }
    submit(identity);
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      id={`policy-${policy.policyId}`}
      className={cn(
        'rounded-xl border bg-card/60 backdrop-blur-sm overflow-hidden transition-colors',
        requiresAcknowledgment && !acknowledged
          ? 'border-primary/40 hover:border-primary/60'
          : 'border-border hover:border-border/80',
      )}
    >
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center justify-between gap-4 px-5 py-4 text-left',
          'transition-colors hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/40',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-sans text-base text-foreground">{policy.title}</h3>
            {requiresAcknowledgment && !acknowledged && (
              <span className="font-sans text-[10px] uppercase tracking-wider text-primary border border-primary/40 rounded-full px-2 py-0.5">
                Acknowledgment needed
              </span>
            )}
            {acknowledged && (
              <span className="inline-flex items-center gap-1 font-sans text-[10px] uppercase tracking-wider text-success">
                <CheckCircle2 className="h-3 w-3" />
                Acknowledged
              </span>
            )}
          </div>
          {lastUpdated && (
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              Updated {lastUpdated}
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="border-t border-border/60 px-5 py-5 space-y-5">
          <article className="prose prose-sm dark:prose-invert max-w-none font-sans text-sm leading-relaxed text-foreground/90 prose-headings:font-sans prose-headings:text-foreground prose-headings:font-medium prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:font-medium prose-strong:text-foreground">
            <ReactMarkdown>{policy.bodyMd}</ReactMarkdown>
          </article>

          {requiresAcknowledgment && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              {acknowledged ? (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-sans text-sm text-foreground">
                      You acknowledged this policy.
                    </p>
                    {ackedAtDisplay && (
                      <p className="font-sans text-xs text-muted-foreground">
                        Recorded {ackedAtDisplay}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-sans text-sm text-foreground">
                    Type your full name and confirm to acknowledge this policy.
                  </p>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`sig-${policy.policyId}`}
                      className="font-sans text-xs text-muted-foreground"
                    >
                      Your full name (signature)
                    </Label>
                    <Input
                      id={`sig-${policy.policyId}`}
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="Jane Doe"
                      autoComplete="name"
                    />
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id={`agree-${policy.policyId}`}
                      checked={agreed}
                      onCheckedChange={(v) => setAgreed(v === true)}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`agree-${policy.policyId}`}
                      className="font-sans text-xs text-foreground/80 leading-relaxed cursor-pointer"
                    >
                      I have read and agree to this policy.
                    </Label>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-1">
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={!agreed || !signature.trim() || record.isPending}
                      className="font-sans"
                    >
                      {record.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      ) : null}
                      Acknowledge
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>

      {/* Identity capture for first-time acknowledgers */}
      {requiresAcknowledgment && !acknowledged && (
        <AcknowledgeIdentityModal
          open={identityOpen}
          onOpenChange={setIdentityOpen}
          onConfirm={(id) => {
            setIdentity(id);
            if (!signature.trim()) setSignature(id.name);
            submit(id);
          }}
        />
      )}
    </Collapsible>
  );
}
