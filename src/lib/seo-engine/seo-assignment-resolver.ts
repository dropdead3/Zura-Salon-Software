/**
 * SEO Assignment Resolver — Pure function.
 * Template + org context → user_id.
 * AI never determines assignment.
 */

import { SEO_ASSIGNMENT_RULES, type AssignableRole } from '@/config/seo-engine/seo-assignment-rules';

export interface OrgMemberContext {
  userId: string;
  roles: AssignableRole[];
  /** True if this person performed the service in question */
  isServiceProvider?: boolean;
}

export interface AssignmentResult {
  assignedTo: string | null;
  assignedRole: AssignableRole | null;
  reason: string;
}

/**
 * Resolve assignment for a task template given available org members.
 */
export function resolveAssignment(
  templateKey: string,
  members: OrgMemberContext[],
  serviceProviderUserId?: string,
): AssignmentResult {
  const rule = SEO_ASSIGNMENT_RULES[templateKey];

  if (!rule) {
    return {
      assignedTo: null,
      assignedRole: null,
      reason: `No assignment rule for template: ${templateKey}`,
    };
  }

  // If rule says assign to service provider, try that first
  if (rule.assignToServiceProvider && serviceProviderUserId) {
    const provider = members.find((m) => m.userId === serviceProviderUserId);
    if (provider) {
      return {
        assignedTo: provider.userId,
        assignedRole: rule.primaryRole,
        reason: `Assigned to service provider (${rule.primaryRole}).`,
      };
    }
  }

  // Try primary role
  const primaryMatch = members.find((m) => m.roles.includes(rule.primaryRole));
  if (primaryMatch) {
    return {
      assignedTo: primaryMatch.userId,
      assignedRole: rule.primaryRole,
      reason: `Assigned to ${rule.primaryRole}.`,
    };
  }

  // Walk fallback chain
  for (const fallbackRole of rule.fallbackChain) {
    const fallbackMatch = members.find((m) => m.roles.includes(fallbackRole));
    if (fallbackMatch) {
      return {
        assignedTo: fallbackMatch.userId,
        assignedRole: fallbackRole,
        reason: `Fallback: assigned to ${fallbackRole} (${rule.primaryRole} unavailable).`,
      };
    }
  }

  return {
    assignedTo: null,
    assignedRole: null,
    reason: `No eligible member found for ${templateKey}. Checked: ${rule.primaryRole}, ${rule.fallbackChain.join(', ')}.`,
  };
}
