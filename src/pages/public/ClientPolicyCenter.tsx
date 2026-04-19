/**
 * Wave 28.8 — Client Policy Center
 *
 * Public, org-scoped page at `/org/:orgSlug/policies` that renders approved
 * client-facing policy variants live from `policy_variants.body_md` (no copy).
 *
 * Doctrine:
 *  - Tenant isolated via PublicOrgProvider (orgSlug → organization_id).
 *  - Visibility contract: empty state if no approved client variants exist.
 *  - Single source of truth: renders Policy OS output directly.
 */
import { Helmet } from 'react-helmet-async';
import { Loader2, FileText } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { usePublicOrg } from '@/contexts/PublicOrgContext';
import { usePublicOrgPolicies } from '@/hooks/policy/usePublicOrgPolicies';
import { PolicyCategoryGroup } from '@/components/public/policy-center/PolicyCategoryGroup';
import { EmptyState } from '@/components/ui/empty-state';

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
              <PolicyCategoryGroup key={group.category} group={group} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
