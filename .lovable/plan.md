

# Grounded Navigation Intelligence System

## Root Cause

The AI assistant receives a static system prompt listing sidebar labels and "forbidden" terms, but the LLM still generates freeform step-by-step instructions from inference. The prompt says "never fabricate" but the model has no structured data to ground against -- it only has prose. The architecture lets the AI answer navigation questions in the same freeform mode as conceptual questions, with no retrieval step.

The second problem: when a user types a question like "how do I change user roles and permissions?" in the command surface, and the search ranking finds a strong nav match (Roles & Controls Hub scores high via synonyms), the AI answer card **still fires independently** (line 252: auto-AI triggers after 1200ms if `isQuestionQuery` and score < 0.5). The AI answer and the nav result compete, and the AI answer often contains hallucinated steps.

## Architecture Change

Build a **Navigation Knowledge Base** as structured data, then inject matched routes into the AI request body so the model grounds its answer on verified destinations instead of inferring them.

```text
User question
    │
    ▼
┌──────────────────────┐
│ Query Classification │  (already exists: isQuestionQuery + parseQuery)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Route Retrieval       │  NEW: match question against NavKnowledgeBase
│ (deterministic)       │  Returns: matched routes, tabs, workflows, roles
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────┐
│ AI Answer Generation             │
│ System prompt + retrieved routes │  AI explains ONLY from retrieved data
│ If no routes matched → say so    │
└──────────────────────────────────┘
```

## Implementation Plan

### 1. Create Navigation Knowledge Base (`src/lib/navKnowledgeBase.ts`)

A structured, queryable registry derived from `dashboardNav.ts` + access-hub tabs + hub children. Each entry:

```typescript
interface NavDestination {
  id: string;
  label: string;              // exact sidebar/page label
  path: string;               // route path
  section: string;            // Main | My Tools | Manage | System
  parent?: string;            // parent hub label if nested
  tabs?: { id: string; label: string; purpose: string }[];
  purpose: string;            // what you do here (1 sentence)
  keywords: string[];         // search terms that should match
  roles: string[];            // which roles can access
  workflows?: { task: string; steps: string[] }[];  // verified multi-step flows
}
```

Populate from existing `dashboardNav.ts` arrays + hardcoded tab/workflow data for key hubs (Roles & Controls Hub, Analytics Hub, Operations Hub, Settings). ~50 entries total.

Export a `findMatchingDestinations(query: string, userRole: string): NavDestination[]` function that uses keyword matching + synonym resolution to return ranked matches.

### 2. Create Grounding Pipeline (`src/lib/navGrounding.ts`)

```typescript
function classifyAndGround(query: string, userRole: string): GroundedContext {
  // 1. Classify: navigation vs conceptual
  const isNavQuestion = detectNavigationIntent(query);
  
  // 2. If navigation, retrieve from knowledge base
  const matches = isNavQuestion ? findMatchingDestinations(query, userRole) : [];
  
  // 3. Build grounding context for AI
  return {
    isNavigation: isNavQuestion,
    verifiedDestinations: matches,
    confidence: matches.length > 0 ? 'high' : 'low',
    // Serialized for injection into AI request
    groundingPrompt: buildGroundingPrompt(matches, userRole),
  };
}
```

Navigation intent detection: looks for patterns like "how do I", "where is", "where can I", "how to", "find", "go to", "navigate to", "open", "access", combined with product terms.

### 3. Wire Grounding Into AI Request

**In `useAIAssistant.ts`**: Add optional `groundingContext` parameter to `sendMessage`. Include it in the request body.

**In `ZuraCommandSurface.tsx`**: Before calling `sendMessage`, run the grounding pipeline. Pass results to the edge function.

**In `AIHelpTab.tsx`**: Same -- run grounding before sending.

### 4. Update Edge Function (`supabase/functions/ai-assistant/index.ts`)

Accept `groundingContext` in the request body. When present:

- If `isNavigation` and verified destinations exist: prepend a structured block to the system prompt:
  ```
  VERIFIED NAVIGATION CONTEXT (you MUST use these exact names and paths):
  - Destination: Roles & Controls Hub (sidebar: System section)
  - Path: /dashboard/admin/access-hub
  - Tabs: Permissions, User Roles, Invitations, ...
  - The user's role (admin) has access to this page.
  
  Answer using ONLY the verified destinations above. Do not add steps not listed here.
  ```

- If `isNavigation` but no verified destinations: instruct the AI:
  ```
  I could not verify the exact destination for this question. 
  Tell the user you're not certain and suggest pressing Cmd/Ctrl+K to search, 
  or list the closest likely sections without fabricating specific steps.
  ```

- If not a navigation question: use current behavior (freeform with base prompt).

### 5. Suppress AI Auto-Trigger When Nav Match Is Strong

In `ZuraCommandSurface.tsx` (line 250): raise the auto-AI threshold from `score >= 0.5` to `score >= 0.35`, so that when synonyms resolve "permissions" to "Roles & Controls Hub" with a decent score, the AI card does NOT auto-fire. The user sees the nav result first and can manually switch to AI mode if needed.

### 6. Add Confidence Display to AI Answer Card

When the grounding context indicates low confidence for a navigation question, display a subtle banner at the top of the AI answer:
"I couldn't fully verify these steps in the current build. Use Cmd/Ctrl+K to search for the exact page."

### 7. Clean Up Naming Inconsistency

In `hubLinksConfig` (dashboardNav.ts line 195): change `'Roles Hub'` to `'Roles & Controls Hub'`.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/navKnowledgeBase.ts` | NEW -- structured navigation registry + query matcher |
| `src/lib/navGrounding.ts` | NEW -- classification + grounding pipeline |
| `src/hooks/useAIAssistant.ts` | Accept + pass `groundingContext` |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Run grounding before AI calls; raise auto-AI threshold |
| `src/components/dashboard/help-fab/AIHelpTab.tsx` | Run grounding before AI calls |
| `src/components/command-surface/CommandAIAnswerCard.tsx` | Show confidence banner for low-confidence nav answers |
| `supabase/functions/ai-assistant/index.ts` | Accept `groundingContext`, inject verified routes into prompt |
| `src/config/dashboardNav.ts` | Fix "Roles Hub" label |

## What This Fixes

- "How do I change user roles and permissions?" -- grounding finds Roles & Controls Hub, AI answers from verified destination only
- "Where do I invite someone?" -- grounding finds Invitations tab, AI gives exact steps
- "How do I see analytics?" -- grounding finds Analytics Hub, no fabricated sub-pages
- If the user asks about something not in the knowledge base, AI says so instead of guessing
- Role-aware: if a stylist asks about permissions, the answer explains they don't have access

## What This Does NOT Change

- Conceptual questions ("what does utilization mean?") still use freeform AI
- Search ranking, synonym registry, and query parser remain unchanged
- No database changes needed

