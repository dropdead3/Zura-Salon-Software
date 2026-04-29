# Zura Chat History

Today the Zura AI panel (`AIHelpTab`) holds messages in local React state via `useAIAgentChat`. Closing the panel, refreshing, or switching pages wipes the conversation. We'll add durable, per-user, per-org chat history.

## What the user gets

- Every Zura conversation is saved automatically (no "save" button).
- A history drawer inside the Zura panel listing past conversations (most recent first), with auto-generated titles.
- Click a past conversation to resume it (full message thread + any follow-up).
- "New chat" button to start fresh.
- Rename and delete conversations.
- History is scoped to the current user **and** current organization (no cross-tenant leakage).

## Data model (new tables)

`ai_conversations`
- `id uuid pk`
- `organization_id uuid not null` (FK, cascade)
- `user_id uuid not null` (owner; auth.users)
- `title text` (auto-generated from first user message, editable)
- `last_message_at timestamptz`
- `created_at`, `updated_at`
- RLS: only the owning user, scoped to an org they belong to, can select/insert/update/delete. No org-wide read — these are private per user.

`ai_conversation_messages`
- `id uuid pk`
- `conversation_id uuid not null` (FK cascade)
- `role text check in ('user','assistant','system')`
- `content text not null`
- `action jsonb` (mirrors `AIAction` for replay of preview cards)
- `created_at timestamptz`
- RLS: select/insert allowed only when the parent conversation belongs to the requesting user (via `EXISTS` subquery). Delete cascades with conversation.

Indexes: `(user_id, organization_id, last_message_at desc)` on conversations; `(conversation_id, created_at)` on messages.

## Hook changes — `useAIAgentChat`

Extend (don't break existing API):
- New state: `conversationId`, `conversations` list.
- On first `sendMessage` of a session, insert a row in `ai_conversations` (title = first 60 chars of user message, refined later).
- Persist every user + assistant message (and any `action` payload) to `ai_conversation_messages` immediately after they're added to local state.
- New methods:
  - `loadConversation(id)` — fetch messages, hydrate `messages` state, set `conversationId`.
  - `startNewChat()` — clear local state and `conversationId`.
  - `renameConversation(id, title)`, `deleteConversation(id)`.
- New query hook `useAIConversations()` — TanStack Query, key `['ai-conversations', orgId, userId]`, returns list ordered by `last_message_at desc`.
- After each successful exchange, update parent `last_message_at` and bump `updated_at`.
- Title refinement: after the first assistant reply, fire a lightweight call to summarize the exchange into a 4–6 word title (reuse `ai-assistant` edge function with a constrained prompt; fallback to the truncated first message if it fails or 429s).

## UI changes — `AIHelpTab`

- Add a compact header row above the message area with two icon buttons: **History** (clock icon) and **New chat** (plus icon).
- "History" opens an inline list (slide-down panel within the Zura tab, not a separate Sheet — keeps the floating panel self-contained):
  - Each row: title, relative timestamp ("2h ago"), kebab menu (Rename, Delete).
  - Click row → `loadConversation(id)`, collapse the list, scroll thread to bottom.
- "New chat" calls `startNewChat()` and returns to the empty state with role-based prompts.
- Empty state unchanged when no `conversationId` is active.
- Pending-action cards are *not* persisted as durable messages; if a conversation is reloaded, in-flight pending actions are dropped (they expire server-side anyway). Persisted `action` payloads on completed assistant messages render as read-only summaries (no Approve/Cancel buttons).

## Security & governance alignment

- RLS enforces strict per-user, per-org isolation (matches `multi-tenancy-rbac` rules).
- No platform staff backdoor — even `is_platform_user` does not read other users' chats.
- Action audit trail (`ai_agent_actions`) stays the system of record for governance; chat history is conversational UX only and never used to re-authorize a capability.
- When deleting a conversation, message rows cascade; audit rows in `ai_agent_actions` are **not** deleted (compliance).

## Files to touch

New:
- `supabase/migrations/<ts>_ai_conversation_history.sql` — two tables, RLS, indexes.
- `src/hooks/team-chat/useAIConversations.ts` — list/rename/delete query hook.
- `src/components/dashboard/help-fab/AIHistoryPanel.tsx` — inline history list.

Edited:
- `src/hooks/team-chat/useAIAgentChat.ts` — persistence, load/new/rename/delete.
- `src/components/dashboard/help-fab/AIHelpTab.tsx` — header controls + history panel mount.
- `supabase/functions/ai-assistant/index.ts` — optional title-summarization branch (only if a `summarize_title: true` flag is sent; reuses existing auth path).

## Out of scope (callouts)

- No sharing conversations across users.
- No full-text search across history (can add later with a `tsvector` column).
- No export/download (defer; audit log already exports CSV).

## Open question

Default retention: keep history forever, or auto-prune conversations older than 90 days? Recommend **forever**, with a future setting toggle, since storage is cheap and operators occasionally reference older Zura threads. Will proceed with "keep forever" unless you say otherwise.
