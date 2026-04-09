

# Fix AI Assistant Accuracy -- Ground System Prompt in Real Navigation

## Problem
The AI assistant (Zura) in the command palette is hallucinating navigation instructions. It told the user to go to "Management Hub > Team Directory > Access or Permissions tab" to change permissions, when the actual path is **Roles & Controls Hub** (`/dashboard/admin/access-hub`). The root cause is the `BASE_SYSTEM_PROMPT` in the edge function (`supabase/functions/ai-assistant/index.ts`) which contains only vague feature descriptions with no actual navigation paths, route structures, or role-specific access rules. The AI model fills in plausible-sounding but incorrect details.

## Solution
Replace the vague system prompt with a grounded navigation map derived from the actual `dashboardNav.ts` config, including exact section names, sidebar labels, and route purposes.

## Changes

### File: `supabase/functions/ai-assistant/index.ts`
Rewrite `BASE_SYSTEM_PROMPT` (lines 19-37) to include:

1. **Exact navigation structure** with sidebar section names and what each link does:
   - Main: Command Center, Schedule, Team Chat
   - My Tools: Today's Prep, My Stats, My Pay, Training, Ring the Bell, etc.
   - Manage: Analytics Hub, Report Generator, Operations Hub
   - System: **Roles & Controls Hub** (permissions, role assignments, invitations), Settings

2. **Role-specific access guidance** so the AI knows which roles can access what:
   - Super Admin/Admin: Full access to Manage + System sections
   - Manager: Access to Operations Hub, scheduling
   - Stylist: My Tools section (stats, pay, training, leaderboard)
   - Front Desk (receptionist): Waitlist, schedule

3. **Common task routing** -- explicit mappings for frequently asked questions:
   - "Change permissions" → Roles & Controls Hub (`/dashboard/admin/access-hub`)
   - "View analytics" → Analytics Hub
   - "Manage team" → Operations Hub
   - "Invite someone" → Roles & Controls Hub > Invitations tab
   - "View my stats" → My Stats in sidebar
   - "Change settings" → Settings in sidebar

4. **Strict instruction** to never fabricate navigation paths -- if unsure, say so and suggest using Cmd/Ctrl+K search

### File: `supabase/functions/ai-assistant/index.ts` (also in same edit)
Pass the user's current role from the frontend so the AI can give role-appropriate answers. The `userRole` field already exists in the schema but is not being sent from the command surface.

### File: `src/components/command-surface/ZuraCommandSurface.tsx`
Update the `sendMessage` call (around line 247 and 316) to pass the user's effective role via the existing `organizationId` parameter pattern, and add the role to the request body. The hook already accepts `organizationId` -- we also need to send `userRole`.

### File: `src/hooks/useAIAssistant.ts`
Add `userRole` as an optional parameter to `sendMessage` and include it in the request body (the edge function schema already accepts it).

## Technical Details
- The edge function schema already supports `userRole` -- just not wired up
- No database changes needed
- No new dependencies
- ~60 lines changed in the system prompt, ~5 lines in wiring the role through
- The `zura-config-loader` dynamic config will continue to prepend org-specific knowledge before the improved base prompt

