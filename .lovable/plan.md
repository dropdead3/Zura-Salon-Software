
Your instinct was good: you correctly identified that the assistant was hallucinating navigation. The better architectural prompt, though, is not “improve the system prompt,” but “make navigation answers deterministic and let AI explain only after routing is known.”

## What I found
1. The prompt was improved, but this is still a prompt-only fix, so the model can still paraphrase or invent labels.
2. The command surface still falls back to AI when ranking is weak, and the search/synonym layer does not strongly map queries like “role permissions,” “access control,” or “invite staff” to the real destination.
3. The FAB AI tab still calls `sendMessage(...)` without organization ID or user role, so that surface is missing important grounding.
4. The command surface has one fallback path that omits `userRole`.
5. `primaryRole` is taken from `effectiveRoles[0]`, which is not guaranteed to be the highest-priority role.
6. Naming is inconsistent across the app: `Roles & Controls Hub`, `Roles Hub`, `Roles & Permissions`, and legacy `Management Hub` references all still exist.

## Implementation plan

### 1) Verify the active answer path
First confirm whether the inaccurate answer is coming from:
- the command surface,
- the FAB AI modal,
- or a stale/alternate deployed assistant path.

The screenshot wording does not fully match the current grounded prompt, so this verification should happen before changing logic.

### 2) Make navigation routing deterministic before AI answers
Use the existing search/ranking system as the first source of truth for navigation questions.

Changes:
- Expand aliases/synonyms so these map directly to the access hub:
  - role permissions
  - permissions
  - access control
  - user roles
  - invite staff / invite team member
  - roles hub / roles and controls
- Add tab-level routing candidates for the real access hub tabs:
  - `?tab=permissions`
  - `?tab=user-roles`
  - `?tab=role-access`
  - `?tab=invitations`
  - plus modules/chat/pins/role-config as needed
- For strong navigation matches, show the direct route first instead of sending the question straight to AI.

Example target behavior:
- “How do I check role permissions?” → `Roles & Controls Hub` → `Permissions` tab
- “How do I invite someone?” → `Roles & Controls Hub` → `Invitations` tab

### 3) Pass correct org + role context from every AI entry point
Wire consistent context into all assistant calls:
- `src/components/dashboard/help-fab/AIHelpTab.tsx`
- `src/components/command-surface/ZuraCommandSurface.tsx`

Changes:
- Always pass `organizationId`
- Always pass a normalized primary role
- Fix the command-surface fallback that currently omits `userRole`

### 4) Normalize role priority instead of trusting array order
Create an explicit role-priority resolver and use that everywhere AI context is derived.

Suggested priority:
`super_admin > admin > manager > receptionist > stylist > stylist_assistant > assistant ...`

That prevents users with multiple roles from getting guidance for the wrong surface.

### 5) Tighten the assistant backend for navigation-specific replies
Update `supabase/functions/ai-assistant/index.ts` so navigation questions are answered in a constrained format.

Add:
- exact route + exact sidebar label + exact tab mapping
- explicit “do not use these labels” rules for:
  - Management Hub
  - Roles Hub
  - Roles & Permissions
  - Operations card/section
- role-aware response behavior:
  - if the user does not have access, say that directly
  - then point them to the closest page they can use, or say leadership access is required

Optional stronger version:
- include the top ranked navigation candidate(s) in the request body so the AI reasons from real app candidates instead of free-form memory

### 6) Unify user-facing naming
Standardize all user-facing references on:
- `Roles & Controls Hub`

Clean up conflicting labels in config/copy where appropriate:
- `src/config/pageExplainers.ts` (`Roles & Permissions`)
- `hubLinksConfig` / any shortened `Roles Hub` label
- any legacy `Management Hub` wording that overlaps with current operations/access language

## Files likely involved
- `src/lib/synonymRegistry.ts`
- `src/hooks/useSearchRanking.ts`
- `src/components/command-surface/ZuraCommandSurface.tsx`
- `src/components/dashboard/help-fab/AIHelpTab.tsx`
- `src/hooks/useAIAssistant.ts`
- `supabase/functions/ai-assistant/index.ts`
- `src/config/pageExplainers.ts`
- possibly `src/config/dashboardNav.ts` helper labels/candidates

## Validation checklist
Test all of these after implementation:
- “how do I check role permissions?”
- “how do I invite someone?”
- “where do I change settings?”
- “where can I see my stats?”
- “how do I manage team schedules?”
- “how do I see who has what role?”

Validate as:
- owner/super admin
- admin
- manager
- stylist
- receptionist
- View As mode

## Prompt coaching for next time
Your original prompt was directionally strong. To get an even better result, I’d phrase it like this:

“Do not solve this with prompt copy alone. Audit every assistant entry point, every fallback to AI, every search synonym, every real route label, and every role-context payload. Then make navigation deterministic first, and AI explanatory second.”

That framing reduces hallucinations because it constrains the architecture, not just the wording.
