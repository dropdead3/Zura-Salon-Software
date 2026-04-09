/**
 * Navigation Grounding Pipeline — classifies queries and retrieves verified destinations
 * to inject into AI assistant requests, preventing hallucinated navigation answers.
 */

import { findMatchingDestinations, type NavDestination } from './navKnowledgeBase';

export interface GroundedContext {
  isNavigation: boolean;
  verifiedDestinations: NavDestination[];
  confidence: 'high' | 'medium' | 'low' | 'none';
  groundingPrompt: string;
}

// Patterns that indicate a navigation or "how-to" question about the product UI
const NAV_INTENT_PATTERNS = [
  /\b(where|how)\s+(do|can|to|would)\s+(i|we|you)\b/i,
  /\b(where\s+is|where\s+are|where\s+can)\b/i,
  /\b(how\s+to|how\s+do\s+i)\b/i,
  /\b(find|open|access|navigate|go\s+to|get\s+to|locate)\b/i,
  /\b(where\s+can\s+i\s+edit|how\s+do\s+i\s+get\s+to)\b/i,
  /\b(change|edit|update|modify|set|configure|manage|assign|add|remove|invite|create)\b.*\b(settings?|roles?|permissions?|team|staff|user|schedule|pay|commission|analytics|reports?|pto|announcements?|leads?|campaigns?|recruiting|levels?|feedback|clients?)\b/i,
  /\b(where|which)\s+(page|section|tab|hub|menu|screen|panel)\b/i,
];

// Product-specific terms that strongly suggest a product-navigation question
const PRODUCT_TERMS = [
  'sidebar', 'hub', 'tab', 'dashboard', 'command center', 'settings',
  'analytics', 'operations', 'roles', 'permissions', 'schedule',
  'team chat', 'my stats', 'my pay', 'leaderboard', 'training',
  'color bar', 'invitations', 'announcements', 'reports',
  'pto', 'recruiting', 'graduation', 'performance review',
  'client health', 'campaigns', 'seo', 'leads', 'lead management',
  'day rate', 'utilization', 'feedback', 're-engagement',
];

/**
 * Detect whether a query is asking about product navigation/UI.
 */
export function detectNavigationIntent(query: string): boolean {
  const q = query.toLowerCase();

  for (const pattern of NAV_INTENT_PATTERNS) {
    if (pattern.test(q)) return true;
  }

  const hasProductTerm = PRODUCT_TERMS.some(term => q.includes(term));
  const hasActionVerb = /\b(find|open|access|change|edit|manage|view|see|check|get|configure|set up|create|invite|assign)\b/i.test(q);
  if (hasProductTerm && hasActionVerb) return true;

  return false;
}

/**
 * Build a grounding prompt block from matched destinations.
 * Embeds the 6 hard rules directly into the context injection.
 */
function buildGroundingPrompt(destinations: (NavDestination & { matchConfidence?: string })[], userRole?: string): string {
  if (destinations.length === 0) {
    return `NAVIGATION GROUNDING: No verified destinations matched this query.

HARD RULES:
1. Do NOT fabricate navigation steps, page names, tabs, or workflow instructions.
2. Tell the user: "I couldn't verify the exact location for that feature in the current build."
3. Suggest pressing Cmd/Ctrl+K to search, or mention the closest likely area if you have a reasonable guess.
4. Do NOT output numbered steps for navigation you cannot verify.`;
  }

  const blocks = destinations.map(dest => {
    const confidence = (dest as any).matchConfidence || 'medium';
    let block = `- **${dest.label}** (sidebar: ${dest.section} section)`;
    block += `\n  Path: ${dest.path}`;
    block += `\n  Purpose: ${dest.purpose}`;
    block += `\n  Match confidence: ${confidence}`;

    if (dest.tabs && dest.tabs.length > 0) {
      block += `\n  Tabs: ${dest.tabs.map(t => `${t.label} (${t.purpose})`).join('; ')}`;
    }

    if (dest.parent) {
      block += `\n  Accessed via: ${dest.parent}`;
    }

    // Role access check
    if (userRole && !dest.roles.includes(userRole)) {
      block += `\n  ⚠️ ROLE RESTRICTION: The user's role (${userRole}) does NOT have access. Required roles: ${dest.roles.join(', ')}.`;
    } else if (userRole) {
      block += `\n  ✅ The user's role (${userRole}) has access.`;
    }

    // Include verified workflows
    if (dest.workflows && dest.workflows.length > 0) {
      for (const wf of dest.workflows) {
        block += `\n  VERIFIED WORKFLOW "${wf.task}": ${wf.steps.map((s, i) => `${i + 1}. ${s}`).join(' → ')}`;
      }
    } else {
      block += `\n  ⚠️ No verified step-by-step workflow exists for this destination. Provide the destination and its purpose ONLY. Do NOT invent steps.`;
    }

    return block;
  });

  return `VERIFIED NAVIGATION CONTEXT (you MUST use these exact names and paths):
${blocks.join('\n\n')}

HARD RULES — YOU MUST FOLLOW ALL 6:
1. This is a GROUNDED NAVIGATION TASK, not a freeform AI answer. Use ONLY the verified destinations above.
2. Never mention a page, tab, or setting label unless it appears in the VERIFIED NAVIGATION CONTEXT above.
3. Never output numbered steps unless the workflow is EXPLICITLY listed above as a "VERIFIED WORKFLOW."
4. If only the destination is verified but no workflow exists, respond with: the destination name, what it is for, and the path. Do NOT invent sub-steps, tabs to click, or buttons to press.
5. If the destination is role-dependent (see ⚠️ ROLE RESTRICTION above), state the required role explicitly and tell the user they may not have access.
6. If no verified match exists, say "I couldn't verify the exact location for that feature" and list the closest known hubs or suggest Cmd/Ctrl+K search.`;
}

/**
 * Main grounding function: classify query and retrieve verified destinations.
 */
export function classifyAndGround(query: string, userRole?: string): GroundedContext {
  const isNavigation = detectNavigationIntent(query);

  if (!isNavigation) {
    return {
      isNavigation: false,
      verifiedDestinations: [],
      confidence: 'none',
      groundingPrompt: '',
    };
  }

  const matches = findMatchingDestinations(query, userRole);

  // Derive overall confidence from best match
  let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';
  if (matches.length > 0) {
    const bestConfidence = matches[0].matchConfidence;
    confidence = bestConfidence === 'high' ? 'high' : bestConfidence === 'medium' ? 'medium' : 'low';
  } else {
    confidence = 'low';
  }

  return {
    isNavigation: true,
    verifiedDestinations: matches,
    confidence,
    groundingPrompt: buildGroundingPrompt(matches, userRole),
  };
}
