
Your direction is clear and correct: the real UX problem is no longer clipping, it is the fake trigger + second input pattern.

## Fix plan

### 1. Turn the top-bar “search bar” into the actual input
**File:** `src/components/dashboard/TopBarSearch.tsx`

- Replace the current trigger `<button>` with a real inline search `<input>` in the bar
- Bind `query` directly to that visible field
- Keep the search icon, clear action, AI toggle, and shortcut hint as inline adornments inside the same bar
- This removes the “click fake bar, then type into another bar” interaction completely

### 2. Make the popup results-only
**File:** `src/components/dashboard/TopBarSearch.tsx`

- Keep the portal/fixed overlay so it still escapes the rounded top bar
- Remove the duplicate search header/input from the popup entirely
- The popup should only render:
  - navigation/team results
  - AI response state
  - no-results state
- Do **not** open a big empty panel on bare click; only show it when:
  - the user has typed, or
  - AI mode is active

### 3. Unify keyboard behavior
**Files:** `src/components/dashboard/TopBarSearch.tsx` and either `src/App.tsx` or `src/hooks/useCommandMenu.ts`

- On dashboard routes, `Cmd/Ctrl + K` should focus the real top-bar input
- Prevent the separate global `CommandMenu` from also opening on dashboard pages
- This gives the dashboard one search pattern instead of two competing ones

### 4. Keep the good part of the last fix
**File:** `src/components/dashboard/TopBarSearch.tsx`

- Keep the anchored portal/fixed positioning for the results panel
- Re-anchor it to the actual input wrapper instead of the old trigger button
- Preserve:
  - arrow-key navigation
  - Enter to open result / send AI
  - Escape to close
  - click-outside dismissal

## Expected result

```text
Top bar
[ Search icon | real input field ................ | AI | ⌘K ]

Below it, only when needed:
[ results panel / AI output ]
```

## Files likely changed

- `src/components/dashboard/TopBarSearch.tsx`
- `src/App.tsx` or `src/hooks/useCommandMenu.ts`
- `src/components/dashboard/SuperAdminTopBar.tsx` only if minor width/adornment spacing needs adjustment

## Technical notes

- No backend or database changes
- This is a UI interaction refactor, not a search logic rewrite
- Success state: one real search field in the bar, one optional results panel below it, zero duplicate search bars
