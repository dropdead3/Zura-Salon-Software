# Zura AI Chat Modal — Audit + Fix Plan

## Audit findings (priority order)

### P0 — Bugs (correctness)

1. **Conversation context corruption.** `useAIAgentChat.sendMessage` builds `history` from local `messages` *after* the loading bubble has been pushed. The loading message has `content: ''` and `role: 'assistant'`, so every turn after the first sends an empty assistant turn to the model. **Fix:** filter `m.isLoading` out before mapping, or build history from a snapshot taken before the loading bubble is appended.

2. **Auto-scroll never reaches the viewport.** `scrollRef` is attached to the shadcn `<ScrollArea>` (wrapper), but the actual scroll container is `[data-radix-scroll-area-viewport]` inside it. Setting `scrollTop` on the wrapper is a no-op, so long threads do not auto-scroll to the latest message. **Fix:** query the inner viewport (`scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]')`) and scroll that, or use a sentinel `<div>` at the bottom with `scrollIntoView`.

3. **`+ New` button has no visible effect when the thread is already empty (the user's complaint).** It clears local state and `conversationId`, but if you're already on the empty state nothing changes — looks broken. Same when a conversation is mid-load (`isLoading` disables it silently). **Fix below.**

4. **Loaded action previews render without status context.** `loadConversation` sets `status: 'executed'` on every persisted action, but `confirmAction`/`cancelAction` persist a *text* result without the action snapshot, so the original preview card never re-renders on reload — only the bare ✅/❌ string. **Fix:** persist the assistant result message with the action payload (status `executed` or `cancelled`).

5. **Empty-state flicker on history load.** `loadConversation` sets `isLoading=true` then awaits the query; during that window `messages.length === 0` and the empty-state hero + suggestion prompts flash before the thread hydrates. **Fix:** track a `isHydrating` flag and show a thin loading row instead of the hero.

### P1 — UX gaps

6. **No streaming.** Zura uses `supabase.functions.invoke` (buffered), while the rest of the platform streams (`useAIAssistant`). A reply that takes 6–8s feels frozen. **Fix:** switch the chat path to the streaming `fetch` pattern already proven in `useAIAssistant`, persisting the final string when the stream closes. Action payloads still arrive at the end as a structured trailer (already supported by `ai-agent-chat`).

7. **Suggested prompts vanish forever after the first message.** Once a thread starts, there's no way back to the role-based prompts without explicitly hitting "+ New". **Fix:** show a compact "Suggested" chip row above the input on a fresh thread (≤ 1 user turn), then collapse it.

8. **Title never refines.** Plan called for an auto-summarized 4–6 word title after the first assistant reply; never implemented. Titles stay as the truncated first message forever. **Fix:** after the first successful assistant turn on a new conversation, fire a lightweight `summarize_title: true` call to `ai-assistant` and `update` the row. Silent fallback on 429.

9. **No "scroll to bottom" affordance.** Once a user scrolls up to read history, new messages push off-screen with no jump-to-latest pill.

10. **`+ New` clears without confirmation in the middle of a pending action.** Currently disabled while `isLoading` is true, but not while `pendingAction` is set. Switching threads mid-approval drops the action server-side eventually but is confusing. **Fix:** disable "+ New" and history-row clicks while `pendingAction` is set, with a tooltip ("Resolve the pending action first").

### P2 — Polish

11. **No timestamps, no copy-message, no regenerate** on assistant bubbles. Standard chat affordances.
12. **History panel:** no search, no date grouping (Today / Yesterday / This week / Older). With 100 conversations the list becomes unreadable.
13. **`+ New` icon-only on small widths** would save space; current "+ New" + "History" eats the full top row.
14. **Send button missing `aria-label`** ("Send message"); History/New buttons fine.
15. **`isLoading` disables the Input** even while waiting for `loadConversation` — user can't queue a question. Acceptable but worth a subtle skeleton.
16. **No keyboard shortcuts** (`⌘K` new chat, `⌘/` history) — minor.

### Out of scope (acknowledge, defer)

- Full-text search across history (needs `tsvector`).
- Export thread as Markdown.
- Per-conversation pinning / archiving.
- Sharing threads with teammates (governance work).

---

## Fix plan (what to ship)

Ordered by leverage. Ship as a single wave; all changes are inside the help-fab module + `useAIAgentChat` + one tiny edge-function addition.

### 1. Make "+ New" meaningful
- Disable when thread is already empty *and* no `conversationId` is set (nothing to clear).
- Disable while `pendingAction` is set, with tooltip.
- On click from a non-empty state, animate the thread out and toast `New conversation started`.
- Keep label as `New` (icon + text); add tooltip `Start a new chat` so the affordance is obvious.

### 2. Fix the conversation-context bug
In `sendMessage`, build `history` from `messages.filter(m => !m.isLoading)` *before* appending the loading bubble.

### 3. Fix auto-scroll
Replace `scrollRef.current.scrollTop = …` with a bottom sentinel (`<div ref={bottomRef} />`) and `bottomRef.current?.scrollIntoView({ block: 'end' })`. Trigger on `messages`, `pendingAction`, and `isLoading` changes.

### 4. Persist action snapshots on result messages
In `confirmAction` and `cancelAction`, pass the resolved action (with `status: 'executed' | 'cancelled'`) into `persistMessage` so reloads restore the preview card.

### 5. Add streaming
Port `useAIAssistant`'s SSE reader into `useAIAgentChat.sendMessage`. Accumulate into the in-place loading bubble (replace `isLoading: true` placeholder with progressive text). On stream close, parse the trailing JSON envelope from `ai-agent-chat` for `action`. Persist the final assembled string + action.

### 6. Suggested-prompt chip strip
While `messages.length <= 1` (just the first user turn or empty), render a horizontal chip row above the input with the role-scoped prompts. Hide once the thread has progressed.

### 7. Auto-title refinement
After the first assistant turn on a new conversation, call `ai-assistant` with `{ summarize_title: true, messages: [first user, first assistant] }`. Update the `ai_conversations` row title (≤ 60 chars, ≤ 6 words). Edge-function branch: ~10 lines, reuses existing auth path.

### 8. Hydration state for `loadConversation`
Add a `isHydrating` flag (separate from `isLoading`); render a one-line "Loading conversation…" placeholder instead of the empty-state hero while it's true.

### 9. History panel polish
- Group by `Today / Yesterday / This week / Older` (computed from `last_message_at`).
- Add a search input at the top (client-side `includes` filter on `title`).
- Show kebab menu always (not only on hover) for touch users.

### 10. Affordances
- Bottom sentinel doubles as a "scroll to latest" pill when user has scrolled up ≥ 200px.
- Copy-message button on hover for assistant bubbles.
- Send button `aria-label="Send message"`.

---

## Files touched

Edit:
- `src/hooks/team-chat/useAIAgentChat.ts` — streaming, history fix, action-snapshot persistence, hydration state, title refinement trigger.
- `src/components/dashboard/help-fab/AIHelpTab.tsx` — bottom sentinel + scroll, suggested chips while empty/short, "+ New" tooltip + disable rules, copy-message, scroll-to-latest pill.
- `src/components/dashboard/help-fab/AIHistoryPanel.tsx` — search + date grouping, always-visible kebab.
- `supabase/functions/ai-assistant/index.ts` — `summarize_title` branch (small).

No DB migration needed — schema already supports the action snapshot column.

---

## Open questions

1. **Streaming priority** — adopting streaming touches the action-trailer parsing and is the biggest change. Ship it now (recommended), or defer and only fix the P0 bugs in this wave?
2. **History grouping vs search** — both, or just one for this wave?
3. **"+ New" behavior on empty state** — disable (current proposal) or repurpose as "Show suggestions" to give it a job? Recommend: disable, since suggestions return automatically via the chip strip in fix #6.

Will proceed with all 10 fixes above unless you say otherwise.
