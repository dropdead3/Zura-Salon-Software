

## Goal
Make the Required section function as a **worklist + completion gauge** — surface progress at a glance, push unfinished work to the top, and let operators collapse completed cards once the band gets dense.

## Investigation
- `src/pages/dashboard/admin/Policies.tsx` partitions `filteredLibrary` into `requiredEntries` / `otherEntries` and renders section headers with raw counts.
- `PolicyLibraryCard` already exposes adoption state via the `adopted` prop / `isAdopted` styling — same source of truth we need for partition + sort.
- The page already owns one localStorage-persisted toggle (`policies:show-non-applicable:<org>`) — same pattern reuses cleanly.

## Changes

### 1. Adoption-aware partition (in `Policies.tsx`)
Inside the existing `requiredEntries` derivation, derive:
- `requiredAdoptedCount` = `requiredEntries.filter(e => adoptedKeys.has(e.key)).length`
- `requiredSorted` = `[...requiredEntries].sort((a,b) => Number(adoptedKeys.has(a.key)) - Number(adoptedKeys.has(b.key)))` — unadopted first, adopted second; alphabetical preserved within each group via stable sort.
- `adoptedKeys` comes from existing `policies` query (same source `PolicyLibraryCard` reads).

### 2. Section header upgrade — progress chip
Replace the plain `Required (n)` label with:

```text
REQUIRED  •  3 of 7 adopted   ━━━━━━░░░░░  43%
```

- Label stays in `font-display text-xs tracking-[0.14em] uppercase text-muted-foreground` (existing pattern).
- Progress: thin 2px bar (`Progress` primitive) with `indicatorClassName="bg-primary"`, max width ~120px, sitting inline-right of the label.
- Number text uses `font-sans text-xs text-muted-foreground` — primary tone only when 100% (silent celebration, no toast).
- When section is filtered out (count 0), header doesn't render — silence doctrine preserved.
- Sticky behavior: wrap header in `sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 -mx-1 px-1` so it pins as the operator scrolls the grid. Only sticks within the Required section's scroll context (parent already scrolls naturally).

### 3. "Hide adopted" toggle (Required section only)
- Place a quiet `Switch` + `Label` ("Hide adopted") in the Required section header, right side, beside the progress chip.
- Default: **off** (show all). Persists per-org in `localStorage` under `policies:hide-adopted-required:<org>` — same pattern as the show-non-applicable toggle.
- Only renders when `requiredAdoptedCount > 0` (silence doctrine — don't show controls that have no effect).
- When on, filters `requiredSorted` to unadopted only. Progress chip still reflects true total ("3 of 7 adopted") so the gauge stays honest even when cards are hidden.
- Does NOT apply to the "Recommended & Optional" section — keeps scope tight to the actual worklist.

### 4. No changes to "Recommended & Optional" section
Stays as-is. The worklist framing only applies to the Required band where completion is structurally meaningful.

## Files touched
- `src/pages/dashboard/admin/Policies.tsx` — adoption-aware sort, progress chip, hide-adopted toggle, sticky header
- (No changes to `PolicyLibraryCard.tsx` — adoption state already styled correctly)

## Out of scope
- No new hooks, no DB changes
- No completion celebration / toast / animation when hitting 100%
- No progress chip on the Recommended section
- No collapse-to-zero auto-hide of the Required header when 100% adopted (operators still need the gauge as proof of completion)

