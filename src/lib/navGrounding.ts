/**
 * Navigation Grounding Pipeline — classifies queries and retrieves verified destinations
 * to inject into AI assistant requests, preventing hallucinated navigation answers.
 */

import { findMatchingDestinations, type NavDestination } from './navKnowledgeBase';

export interface GroundedContext {
  isNavigation: boolean;
  verifiedDestinations: NavDestination[];
  confidence: 'high' | 'low' | 'none';
  groundingPrompt: string;
}

// Patterns that indicate a navigation or "how-to" question about the product UI
const NAV_INTENT_PATTERNS = [
  /\b(where|how)\s+(do|can|to|would)\s+(i|we|you)\b/i,
  /\b(where\s+is|where\s+are|where\s+can)\b/i,
  /\b(how\s+to|how\s+do\s+i)\b/i,
  /\b(find|open|access|navigate|go\s+to|get\s+to|locate)\b/i,
  /\b(change|edit|update|modify|set|configure|manage|assign|add|remove|invite|create)\b.*\b(settings?|roles?|permissions?|team|staff|user|schedule|pay|commission|analytics|reports?)\b/i,
  /\b(where|which)\s+(page|section|tab|hub|menu|screen|panel)\b/i,
];

// Product-specific terms that strongly suggest a product-navigation question
const PRODUCT_TERMS = [
  'sidebar', 'hub', 'tab', 'dashboard', 'command center', 'settings',
  'analytics', 'operations', 'roles', 'permissions', 'schedule',
  'team chat', 'my stats', 'my pay', 'leaderboard', 'training',
  'color bar', 'invitations', 'announcements', 'reports',
];

/**
 * Detect whether a query is asking about product navigation/UI.
 */
export function detectNavigationIntent(query: string): boolean {
  const q = query.toLowerCase();

  // Check explicit navigation patterns
  for (const pattern of NAV_INTENT_PATTERNS) {
    if (pattern.test(q)) return true;
  }

  // Check for product terms combined with action verbs
  const hasProductTerm = PRODUCT_TERMS.some(term => q.includes(term));
  const hasActionVerb = /\b(find|open|access|change|edit|manage|view|see|check|get)\b/i.test(q);
  if (hasProductTerm && hasActionVerb) return true;

  return false;
}

/**
 * Build a grounding prompt block from matched destinations.
 */
function buildGroundingPrompt(destinations: NavDestination[], userRole?: string): string {
  if (destinations.length === 0) {
    return `NAVIGATION GROUNDING: No verified destinations matched this query. Do NOT fabricate navigation steps. Tell the user you're not certain of the exact location and suggest pressing Cmd/Ctrl+K to search, or mention the closest likely area.`;
  }

  const blocks = destinations.map(dest => {
    let block = `- **${dest.label}** (sidebar: ${dest.section} section)\n  Path: ${dest.path}\n  Purpose: ${dest.purpose}`;

    if (dest.tabs && dest.tabs.length > 0) {
      block += `\n  Tabs: ${dest.tabs.map(t => `${t.label} (${t.purpose})`).join('; ')}`;
    }

    if (dest.parent) {
      block += `\n  Accessed via: ${dest.parent}`;
    }

    // Role access check
    if (userRole && !dest.roles.includes(userRole)) {
      block += `\n  ⚠️ The user's role (${userRole}) does NOT have access to this page.`;
    } else if (userRole) {
      block += `\n  ✅ The user's role (${userRole}) has access.`;
    }

    // Include verified workflows
    if (dest.workflows && dest.workflows.length > 0) {
      for (const wf of dest.workflows) {
        block += `\n  Workflow "${wf.task}": ${wf.steps.map((s, i) => `${i + 1}. ${s}`).join(' → ')}`;
      }
    }

    return block;
  });

  return `VERIFIED NAVIGATION CONTEXT (you MUST use these exact names and paths — do NOT add, rename, or invent steps beyond what is listed here):\n${blocks.join('\n\n')}\n\nAnswer using ONLY the verified destinations above. If the user asks about a specific tab, reference the exact tab name. Do not fabricate sub-steps not listed in the workflows.`;
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

  return {
    isNavigation: true,
    verifiedDestinations: matches,
    confidence: matches.length > 0 ? 'high' : 'low',
    groundingPrompt: buildGroundingPrompt(matches, userRole),
  };
}
