/**
 * Wave 28.8 + 28.10 — Client Policy Center
 *
 * Public, org-scoped page at `/org/:orgSlug/policies` that renders approved
 * client-facing policy variants live from `policy_variants.body_md` (no copy).
 *
 * 28.10: When any policy has `requires_acknowledgment=true` and the visitor
 * has not yet acknowledged it (per-email lookup via localStorage), surfaces a
 * banner at the top with a CTA that scrolls to the first un-acknowledged card.
 */
import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { usePublicOrg } from '@/contexts/PublicOrgContext';
import { usePublicOrgPolicies } from '@/hooks/policy/usePublicOrgPolicies';
import { PolicyCategoryGroup } from '@/components/public/policy-center/PolicyCategoryGroup';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { loadStoredIdentity } from '@/components/public/policy-center/AcknowledgeIdentityModal';
import type { AckIdentity } from '@/components/public/policy-center/AcknowledgeIdentityModal';

const ACKED_STORAGE_PREFIX = 'zura.policy-acked.';

function loadAckedSet(orgId: string, email: string | null): Set<string> {
  if (!email) return new Set();
  try {
    const key = `${ACKED_STORAGE_PREFIX}${orgId}.${email.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistAckedSet(orgId: string, email: string, set: Set<string>) {
  try {
    const key = `${ACKED_STORAGE_PREFIX}${orgId}.${email.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export default function ClientPolicyCenter() {
  const { organization, orgSlug } = usePublicOrg();
  const { data: groups, isLoading } = usePublicOrgPolicies(organization.id);

  const orgName = organization.name || 'Salon';
  const pageTitle = `${orgName} — Policies`;
  const description = `Booking, service, and client policies for ${orgName}. Updated continuously.`;
  const canonical = `${window.location.origin}/org/${orgSlug}/policies`;

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: orgName,
    url: canonical,
  };

  const [identity, setIdentity] = useState<AckIdentity | null>(null);
  const [acked, setAcked] = useState<Set<string>>(new Set());

  // Hydrate identity + acked set from localStorage.
  useEffect(() => {
    const stored = loadStoredIdentity();
    if (stored) {
      setIdentity(stored);
      setAcked(loadAckedSet(organization.id, stored.email));
    }
  }, [organization.id]);

  const handleAcknowledged = ({
    policyId,
    identity: id,
  }: {
    policyId: string;
    ackedAt: string;
    identity: AckIdentity;
  }) => {
    setIdentity(id);
    setAcked((prev) => {
      const next = new Set(prev);
      next.add(policyId);
      persistAckedSet(organization.id, id.email, next);
      return next;
    });
  };

  const requiringAck = useMemo(() => {
    if (!groups) return [] as { policyId: string; title: string }[];
    const out: { policyId: string; title: string }[] = [];
    for (const g of groups) {
      for (const p of g.policies) {
        if (p.requiresAcknowledgment && !acked.has(p.policyId)) {
          out.push({ policyId: p.policyId, title: p.title });
        }
      }
    }
    return out;
  }, [groups, acked]);

  const scrollToFirstUnacked = () => {
    const first = requiringAck[0];
    if (!first) return;
    const el = document.getElementById(`policy-${first.policyId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <Layout>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta name="robots" content="index, follow" />
        <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
      </Helmet>

      <div className="min-h-[60vh] px-4 sm:px-6 lg:px-8 py-12 max-w-3xl mx-auto">
        <header className="mb-10 space-y-3">
          <p className="font-display text-xs tracking-[0.18em] uppercase text-muted-foreground">
            {orgName}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl tracking-[0.06em] uppercase text-foreground">
            Policies
          </h1>
          <p className="font-sans text-base text-muted-foreground max-w-xl">
            The standards we operate by. Booking, services, conduct, and how we resolve
            the unexpected. Updated continuously.
          </p>
        </header>

        {requiringAck.length > 0 && (
          <div className="mb-8 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <p className="font-sans text-sm text-foreground">
                  <span className="font-medium">
                    {requiringAck.length}{' '}
                    {requiringAck.length === 1 ? 'policy requires' : 'policies require'}
                  </span>{' '}
                  your acknowledgment.
                </p>
                <Button size="sm" variant="outline" onClick={scrollToFirstUnacked}>
                  Review now
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !groups || groups.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No policies published yet"
            description="This salon hasn't published their client-facing policies. Check back soon."
          />
        ) : (
          <div className="space-y-12">
            {groups.map((group) => (
              <PolicyCategoryGroup
                key={group.category}
                group={group}
                acknowledgedPolicyIds={acked}
                onAcknowledged={handleAcknowledged}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
