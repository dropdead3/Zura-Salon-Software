/**
 * Wave 28.8 + 28.10 — Category group on the public Client Policy Center.
 *
 * Termina header + description + stack of PolicyCenterCard items.
 * 28.10: passes acknowledgment props per-card.
 */
import { PolicyCenterCard } from './PolicyCenterCard';
import type { PublicPolicyGroup } from '@/hooks/policy/usePublicOrgPolicies';
import type { AckIdentity } from './AcknowledgeIdentityModal';

interface PolicyCategoryGroupProps {
  group: PublicPolicyGroup;
  acknowledgedPolicyIds?: Set<string>;
  onAcknowledged?: (info: { policyId: string; ackedAt: string; identity: AckIdentity }) => void;
}

export function PolicyCategoryGroup({
  group,
  acknowledgedPolicyIds,
  onAcknowledged,
}: PolicyCategoryGroupProps) {
  return (
    <section className="space-y-4" aria-labelledby={`policy-cat-${group.category}`}>
      <header className="space-y-1">
        <h2
          id={`policy-cat-${group.category}`}
          className="font-display text-sm tracking-[0.14em] uppercase text-foreground"
        >
          {group.label}
        </h2>
        {group.description && (
          <p className="font-sans text-sm text-muted-foreground max-w-2xl">
            {group.description}
          </p>
        )}
      </header>

      <div className="space-y-3">
        {group.policies.map((p) => (
          <PolicyCenterCard
            key={p.policyId}
            policy={p}
            requiresAcknowledgment={p.requiresAcknowledgment}
            alreadyAcknowledged={acknowledgedPolicyIds?.has(p.policyId) ?? false}
            onAcknowledged={onAcknowledged}
          />
        ))}
      </div>
    </section>
  );
}
