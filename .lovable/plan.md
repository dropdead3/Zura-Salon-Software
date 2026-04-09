

# Expand Navigation Knowledge Base + Harden Grounding Rules

## Current State
The grounding system (navKnowledgeBase.ts + navGrounding.ts + edge function) is already wired and deployed. However:
1. **Missing destinations**: ~20 hub-children pages from `dashboardNav.ts` are not in the knowledge base (Performance Reviews, PTO, Announcements, Recruiting, Client Health, Re-engagement, Campaigns, SEO Workshop, Lead Management, etc.)
2. **No task-to-destination registry**: Common admin intents like "run payroll," "merge clients," "edit cancellation policy," "manage PTO" have no verified workflow mappings
3. **Grounding rules not strict enough**: The edge function appends grounding context but doesn't enforce the 6 rules you outlined (no unverified steps, destination-only fallback, role-dependent flagging, etc.)
4. **Platform nav not covered**: The knowledge base only covers org-dashboard routes, not `/platform/*` routes

## Changes

### 1. Expand `src/lib/navKnowledgeBase.ts` (~40 new entries)

Add all hub-children destinations from `dashboardNav.ts`:
- Operations Hub children: Performance Reviews, PTO Balances, Announcements, Recruiting Pipeline, Graduation Tracker, Stylist Levels, Headshot Requests, Business Card Requests, Schedule 1:1, Training Hub
- Client-facing: Client Directory, Client Health, Re-engagement, Client Feedback
- Marketing: Campaigns, SEO Workshop, Lead Management
- Analytics children: Sales Analytics, Operational Analytics, Staff Utilization, Day Rate Settings, Day Rate Calendar

Each entry gets: id, label, path, section (Sub-page), parent hub, purpose, keywords, roles, and workflows where applicable.

### 2. Add Task-to-Destination Registry (new section in navKnowledgeBase.ts)

Create a `TASK_REGISTRY` mapping common admin intents to verified workflows:

| Task Intent | Destination | Workflow |
|---|---|---|
| "run payroll" / "process payroll" | My Pay / Settings (commission) | Verified steps or destination-only |
| "merge clients" | Client Directory | Navigate to client, merge action |
| "edit cancellation policy" | Settings | Settings → Policies section |
| "manage PTO" | Operations Hub → PTO Balances | Verified steps |
| "create announcement" | Operations Hub → Announcements | Already exists, expand |
| "schedule a 1:1" | Operations Hub → Schedule 1:1 | Navigate + create |
| "set up commission" | Settings | Settings → Commission section |
| "manage recruiting" | Operations Hub → Recruiting | Navigate + pipeline view |
| "view client health" | Client Health (sub-page) | Navigate from Operations Hub |
| "manage campaigns" | Campaigns | Navigate from marketing |

Update `findMatchingDestinations` to also search the task registry for intent matches.

### 3. Harden grounding rules in `src/lib/navGrounding.ts`

Update `buildGroundingPrompt` to enforce the 6 rules explicitly:

- **Rule 1**: Classification already handles this. Add stronger patterns: "where can I edit", "how do I get to".
- **Rule 2**: Add to grounding prompt: "Never mention a page, tab, or setting label unless it appears in the VERIFIED NAVIGATION CONTEXT above."
- **Rule 3**: Add: "Never output numbered steps unless the workflow is explicitly listed above."
- **Rule 4**: When only destination is matched but no workflow exists, format the grounding prompt as destination-only: label + purpose + path. No fake detail.
- **Rule 5**: Already present (role check). Make it more prominent.
- **Rule 6**: Already present (low confidence fallback). Strengthen wording.

### 4. Update edge function `supabase/functions/ai-assistant/index.ts`

Tighten the system prompt's CRITICAL RULES section to embed the 6 rules as hard constraints:
- Add explicit instruction: "If a workflow is not listed in VERIFIED NAVIGATION CONTEXT, respond with the destination and its purpose ONLY. Do not invent steps."
- Add: "If the query is role-dependent, state the required role explicitly."
- Add: "If no verified match exists, say 'I couldn't verify the exact location for that feature' and list the closest known hubs."

### 5. Improve confidence scoring in `navKnowledgeBase.ts`

Add a `confidence` field to the grounding result based on match quality:
- `high`: exact keyword or label match (score >= 8)
- `medium`: partial keyword match with workflow (score >= 4)
- `low`: weak partial match only

Pass this to the edge function so it can calibrate response format:
- High: full workflow steps allowed
- Medium: destination + purpose + "exact steps may vary"
- Low: "I couldn't verify" + closest hubs

## Files Changed

| File | Change |
|---|---|
| `src/lib/navKnowledgeBase.ts` | Add ~40 hub-children destinations + task registry + confidence scoring |
| `src/lib/navGrounding.ts` | Embed 6 rules in grounding prompt, add medium confidence tier |
| `supabase/functions/ai-assistant/index.ts` | Harden CRITICAL RULES with the 6 constraints |
| `src/components/command-surface/CommandAIAnswerCard.tsx` | Show "medium" confidence banner (softer than low) |

## What This Fixes
- "How do I manage PTO?" → verified destination with exact path
- "Where do I edit cancellation policy?" → Settings, destination-only (no fake sub-steps)
- "How do I merge clients?" → Client Directory, with honest "exact steps may vary" if workflow isn't fully mapped
- All 6 rules enforced at both the grounding layer and the AI prompt layer
