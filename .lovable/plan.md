

# Auto-Trigger AI for Question Queries

## What Changes

When a user types a question starting with "how", "what", "why", etc. and there are no strong navigation matches (score < 0.5), the command surface will automatically activate AI mode and send the query after a brief typing pause — no need to click "Ask Zura" or press Enter.

## How It Works

A debounced effect in `ZuraCommandSurface.tsx` watches for the combination of:
1. `isQuestionQuery(query)` is true
2. No strong results (`!hasResults || rankedResults[0]?.score < 0.5`)
3. `aiMode` is not already active
4. Query length ≥ 8 characters (avoids triggering on just "how do")
5. User has stopped typing for ~1.2 seconds

When all conditions are met, it auto-sets `aiMode(true)` and calls `sendMessage(query)`. The AI answer streams in-place in the command surface — exactly as if the user had clicked "Ask Zura."

If the user keeps typing before the debounce fires, the timer resets. If the user selects a result or presses Escape before the timer fires, the timer is cancelled.

## File Changes (1 file)

**`src/components/command-surface/ZuraCommandSurface.tsx`** — Add a `useEffect` with a `setTimeout` (~1200ms debounce). Dependencies: `query`, `aiMode`, `hasResults`, top result score. On cleanup, clear the timeout. When it fires, call `setAiMode(true)` and `sendMessage(query)`. Also add `addRecent(query)` so the question is saved to history.

No other files change. The `isQuestionQuery` detection already exists in `commandTypes.ts` and handles "how", "what", "why", "where", "when", "who", "which", "can i", "tell me", "explain", "help me", "show me", plus any query ending with `?`.

## User Experience

- Type "how do i refund" → results show "No direct match" + AI card → after 1.2s pause, AI mode auto-activates and Zura starts answering
- Type "schedule" → strong nav match exists → AI never auto-triggers
- Type "how" → too short (< 8 chars) → waits for more input
- Type "how do i refund" then immediately press Enter → manual trigger fires first (existing behavior), debounce is cancelled

## Technical Detail

- Debounce timer stored in a `useRef<ReturnType<typeof setTimeout>>` 
- Cleared on unmount, on query change, and on close
- Guard: if `aiMode` is already true or `isLoading` is true, skip
- The 1.2s delay feels natural — long enough to confirm the user stopped typing, short enough to feel responsive

