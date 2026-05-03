/**
 * ReputationGate — Renders children only when the org has the Zura Reputation
 * subscription. Unentitled orgs see an upgrade stub with an inline "Start trial"
 * CTA that creates a Stripe Checkout session via `create-reputation-checkout`.
 *
 * Use at the top of any Reputation-only surface (Feedback Hub, theme tagger,
 * Zura Review Library curation, etc.). For stylist-facing surfaces, prefer
 * `silent` mode — silence is valid output and stylists can't act on a paywall
 * (see Stylist Privacy Contract).
 */
import { useState, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Star, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useReputationEntitlement } from '@/hooks/reputation/useReputationEntitlement';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useSettingsOrgId } from '@/hooks/useSettingsOrgId';
import { supabase } from '@/integrations/supabase/client';
import { tokens } from '@/lib/design-tokens';
import { toast } from 'sonner';

interface ReputationGateProps {
  children: ReactNode;
  /** Render nothing when unentitled (use for stylist-facing surfaces). */
  silent?: boolean;
  /** Optional context shown above the upgrade CTA. */
  surfaceLabel?: string;
}

export function ReputationGate({ children, silent, surfaceLabel }: ReputationGateProps) {
  const { isEntitled, isLoading } = useReputationEntitlement();
  const { dashPath } = useOrgDashboardPath();
  const orgId = useSettingsOrgId();
  const [starting, setStarting] = useState(false);

  if (isLoading) return null;
  if (isEntitled) return <>{children}</>;
  if (silent) return null;

  async function startTrial() {
    if (!orgId) {
      toast.error('No organization context');
      return;
    }
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-reputation-checkout', {
        body: { organization_id: orgId },
      });
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error('No checkout URL returned');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error('Failed to start checkout: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setStarting(false);
    }
  }

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
      <CardContent className="p-8">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <Star className="w-7 h-7 text-amber-500" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={tokens.label.tiny}>
                {surfaceLabel ?? 'Zura Reputation'}
              </span>
            </div>
            <h3 className="font-display text-xl tracking-wide">
              Convert happy clients into five-star proof
            </h3>
            <p className="text-sm text-muted-foreground max-w-xl">
              Subscribe to Zura Reputation to unlock review-request automation,
              the AI theme tagger, and the curated Review Library that wires
              5-star reviews directly into your website. 14-day free trial,
              then $49/month.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={startTrial} disabled={starting}>
                {starting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    Start 14-day trial <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
              <Button variant="ghost" asChild>
                <Link to={dashPath('/apps?app=reputation')}>Learn more</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
