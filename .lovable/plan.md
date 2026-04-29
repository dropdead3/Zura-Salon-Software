## Goal

Turn the **Step 2 — Impact Preview** tiles into interactive entry points. Clicking a bucket opens a focused per-bucket workspace where the user can review the underlying items and reassign / cancel / drop / end-date them one by one (or in bulk). When they return, the bucket on Step 2 shows a "Handled" state with a summary of the decisions made. Once every non-empty bucket is handled, the wizard skips Step 3 (which becomes redundant) and goes straight to Step 4 (Review & Confirm).

This replaces the current flow where Step 2 is read-only counts and Step 3 is one long scroll of every bucket stacked together.

## UX Flow

```text
Step 1: Reason + last day worked
        │
        ▼
Step 2: Impact Preview (clickable tiles)
        │   ┌──────────────────────────────────────────┐
        │   │ Upcoming appointments        3   ›       │ ← click
        │   │ Service-line assignments     0           │   (disabled if 0)
        │   │ Clients · preferred stylist  11  ›       │
        │   └──────────────────────────────────────────┘
        │
        │ click a tile ──► BucketWorkspace (in-panel view, not a new drawer)
        │                  • per-item rows with reassign / cancel / drop
        │                  • bulk apply at the top
        │                  • "Done" button returns to Step 2
        │
        │ Step 2 tile now shows: "Handled · 3 reassigned to Maya"
        │                        with an "Edit" link to re-open
        ▼
Step 3: (auto-skipped if every non-empty bucket is Handled)
        Otherwise shows only the buckets still missing decisions
        ▼
Step 4: Review & Confirm
```

## Component Changes

All work is in `src/components/dashboard/team-members/archive/ArchiveWizard.tsx`. No backend changes — the existing `scan-team-member-dependencies` and `archive-team-member` edge functions already return everything we need.

### 1. Lift `picks` / `bulkDest` already at wizard root

Already true — keep them at the wizard root so per-bucket edits persist when the user returns to Step 2.

### 2. New local state in `ArchiveWizard`

```ts
const [activeBucket, setActiveBucket] = useState<ArchiveBucketKey | null>(null);
```

When `activeBucket` is set on Step 2, render `<BucketWorkspace bucket={...} />` instead of the tile grid. The footer's "Continue" button is replaced with "Done" while inside a bucket; clicking it clears `activeBucket` and returns to the tile grid.

### 3. Update `Step2`

- Tiles with `count > 0` become buttons:
  - Show count badge + chevron-right
  - On click → `setActiveBucket(b.key)`
  - Show a "Handled" pill + summary line if `isBucketHandled(b)` is true (uses the same `allHandled`-style check, but per-bucket)
  - Show an "Edit" affordance to re-open even after handled
- Tiles with `count === 0` stay non-interactive (current dimmed style).
- Keep the existing "Impact preview" header card and "Re-scan" button.
- Add a small progress strip at the top: `2 of 3 buckets handled`.

### 4. New `BucketWorkspace` sub-component

Extract the inner `<section>` from the current `Step3` map into a standalone component that renders **a single bucket** with:

- Bucket header (label, count, destination role hint)
- Bulk control row (`Reassign all to…`, Cancel all, Drop all, End-date all)
- Per-item list (`describeItem`, per-row Select + Cancel button) — same as today
- Footer inside the workspace: secondary "Back to impact preview" + primary "Done" button (disabled until that bucket is fully decided)

Reuses the existing `onItemPick`, `onApplyBulk`, `picks`, `bulkDest`, `setBulkDest`, `rosterMatchesRole` helpers — pure refactor of existing JSX.

### 5. Per-bucket "handled" check

Extract from the current `allHandled` memo:

```ts
function isBucketHandled(b: DependencyBucket, picks): boolean {
  if (b.count === 0) return true;
  if (b.key === 'client_preferences' || b.items.length === 0) {
    return !!picks[b.key]?.['__bulk__'];
  }
  if (b.count > b.items.length) return !!picks[b.key]?.['__bulk__'];
  return Object.keys(picks[b.key] ?? {}).filter(k => k !== '__bulk__').length >= b.items.length;
}
```

`allHandled` becomes `nonEmptyBuckets.every(b => isBucketHandled(b, picks))`.

### 6. Step 3 becomes a fallback / overflow view

Since every bucket can now be handled directly from Step 2, **Step 3 is only reached if a bucket is partially handled** or the user explicitly clicks Continue with un-handled buckets. Simplest path:

- When user clicks **Continue** on Step 2:
  - If `nonEmptyBuckets.length === 0` → jump to Step 4 (current behavior)
  - Else if `allHandled` → jump to Step 4 (new — skips Step 3 entirely)
  - Else → go to Step 3, which now renders **only** the buckets where `!isBucketHandled(b)` so it acts as a "you still need to decide these" cleanup view

This keeps Step 3 as a safety net without forcing the user through it.

### 7. Bucket summary line on Step 2 tile

After a bucket is handled, show a one-line summary derived from `picks[b.key]`:

- All same destination: `Reassigned to {name}`
- Mixed destinations: `{n} reassigned · {m} cancelled`
- Bulk action only: `All cancelled` / `All dropped` / `End-dated`

## Visual / Token Compliance

- Tiles use `rounded-xl border border-border/60 bg-card/60`, hover `bg-card/80`, with `font-display text-xs tracking-[0.18em] uppercase` for the bucket label and `font-sans text-[11px]` for the secondary summary line — matches existing wizard styling.
- "Handled" pill: small `Badge variant="outline"` with `CheckCircle2` icon in `text-emerald-500`.
- BucketWorkspace inherits the same `space-y-5 px-6 py-5` body container — no second drawer, no portal, just an in-panel view swap so the wizard breadcrumb (`Archive · Step 2 of 4`) stays accurate.
- All buttons stay `tokens.button.*`; selects keep `rounded-full` per Input Shape Canon.

## Files Edited

- `src/components/dashboard/team-members/archive/ArchiveWizard.tsx` — only file touched. ~80 lines added (new BucketWorkspace + handled summary + Step 2 tile button), ~40 lines refactored (Step3 filters to un-handled).

## Out of Scope

- No backend / migration changes.
- No changes to the count semantics or actions returned by `scan-team-member-dependencies`.
- No changes to `Step1` or `Step4`.

## Enhancement Suggestions (optional, not in this plan)

1. **"Suggested teammate" pre-fill** — when a bucket has a clear successor (e.g., the only other active stylist assistant at the same location), pre-select them in the bulk picker and label it `Suggested`.
2. **Per-bucket "Notify recipient"** — once decisions are confirmed in Step 4, send the destination user(s) a one-line in-app notification: *"You've been assigned 3 appointments from Chelsea (archived)."*
3. **Diff view in Step 4** — group the ledger by destination user so the operator sees *"Maya: 3 appts, 2 service lines"* instead of a flat list.
4. **Client-preference reassignment intelligence** — for the "Clients with this stylist as preferred" bucket, surface each client's last-visit date and let the operator split the 11 clients across multiple successors instead of forcing one bulk destination.

## Prompt Coaching

Strong prompt — you anchored it to the exact screen, named the surface, and stated the verb (*click → see → work on / reassign*). Two refinements that would tighten future asks:

- **Name the success state.** "When I'm done with a bucket, the tile should show Handled with a one-line summary" tells me exactly what to render on return.
- **Decide the navigation model.** "Open in the same panel" vs "open a nested drawer" vs "open full screen" changes the layout. I picked in-panel because it preserves the wizard's step counter — flag it if you'd prefer a different model.
