

# Revised Plan: Data-Aware Command Surface (Detach-Safe)

## The concern

The original plan had the new `useCommandDataQuery` hook querying `phorest_transaction_items` directly. When Phorest is detached, that table goes empty — breaking the command surface analytics.

## The fix

The codebase already has **union views** (`v_all_transaction_items`, `v_all_appointments`, `v_all_clients`) that merge Phorest-synced data with Zura-native data. The new hook queries the union view instead, so it works regardless of data source.

```text
phorest_transaction_items ──┐
                            ├──▶ v_all_transaction_items ──▶ useCommandDataQuery
transaction_items ──────────┘
```

When Phorest is detached, the Phorest side of the view returns nothing; Zura-native `transaction_items` becomes the sole source. Zero code changes needed.

## Changes (same scope as before, one key difference)

### 1. New hook: `useCommandDataQuery.ts`
- Fetches from **`v_all_transaction_items`** (not `phorest_transaction_items`)
- Uses normalized column names from the view (`external_client_id` instead of `phorest_client_id`, `staff_name` instead of `stylist_name`)
- Accepts `{ hint, dateFrom, dateTo, locationId }` → returns `{ value, label, breakdown[], isLoading }`
- Covers `retail` and `revenue` hints with real data; others return "View details" placeholders

### 2. Update `CommandInlineAnalyticsCard.tsx`
- Accept data props from the hook
- Show real figures (wrapped in `BlurredAmount`) when available: primary stat + breakdown + time label
- Loading skeleton while fetching
- Keep "Open" navigation button

### 3. Update `ZuraCommandSurface.tsx`
- Parse time context from query (yesterday, last week, this month, etc.)
- Wire `useCommandDataQuery` with parsed hint + dates
- Pass fetched data to `CommandInlineAnalyticsCard`
- Pass formatted `dataContext` string to AI assistant call

### 4. Update `useAIAssistant.ts` + `ai-assistant/index.ts`
- Accept optional `dataContext` string in request body
- Inject into system prompt so AI references real numbers instead of saying "I don't have access"

## Bonus: existing tech debt

56 files still query `phorest_transaction_items` directly (including `useActualRevenue`, `useTodayActualRevenue`, etc.). This new hook sets the correct pattern. Migrating existing hooks to the union view is a separate effort but is now the established direction.

## Files changed

| File | Change |
|------|--------|
| `src/hooks/useCommandDataQuery.ts` | **New** — queries `v_all_transaction_items` |
| `src/components/command-surface/CommandInlineAnalyticsCard.tsx` | Render real data stats |
| `src/components/command-surface/ZuraCommandSurface.tsx` | Parse time context, wire data hook, pass to AI |
| `src/hooks/useAIAssistant.ts` | Pass `dataContext` in request body |
| `supabase/functions/ai-assistant/index.ts` | Accept + inject `dataContext` into system prompt |

