
## Prompt review

Strong observation — you spotted two distinct issues in one screenshot: (1) **redundant signaling** (two "first visit" messages stacked) and (2) **layout overflow** (tabs spilling on both edges). Both are real polish gaps that erode the "executive, calm" feel of the panel.

Tighter framing for next time: when you see overflow, mention whether you want the container to **grow** or the contents to **shrink/scroll**. Different fix paths. I'll propose growing the panel modestly + giving tabs a horizontal scroll fallback, since cramming 6 tabs into smaller text would degrade readability.

## Findings

**Issue 1 — Redundant first-visit messaging**
Two separate components both render "first visit" empty states for the same condition:
- `ClientMemoryPanel` (line 41-49): renders `"First visit — no history yet"` when `data.isFirstVisit` is true.
- `AppointmentDetailSheet` (line 1469-1476): renders `"First-time client — no prior service history on file."` banner when `visitStats.visitCount === 0`.

Both fire on the same client state. The green banner adds no information beyond what the dashed memory panel already says, and visually competes with it.

**Issue 2 — Tab overflow**
- `PremiumFloatingPanel` default `maxWidth = '440px'`.
- `AppointmentDetailSheet` does NOT pass a `maxWidth` override → uses 440px.
- Tabs (`TabsList` with `mx-6`) gets ~392px to render 6 triggers: Details, History, Photos, Notes, Formulas (with icon), Color Bar. The screenshot confirms this overflows: "etails" cut on left, "Color B" cut on right.

The other large detail panels in the codebase (`ClientDetailSheet`, etc.) also use the 440px default but have fewer/shorter tab labels.

## Plan

### 1. Eliminate redundant first-visit banner

**File:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` (lines 1469-1476)
- Delete the green `"First-time client — no prior service history on file."` banner block entirely.
- Keep the `ClientMemoryPanel`'s dashed `"First visit — no history yet"` indicator as the single source of truth — it's already the right placement (top of Details tab) and uses the calmer dashed-border treatment that fits the panel's executive tone.

Net result: one clear first-visit signal instead of two competing ones.

### 2. Fix tab overflow — widen panel + scrollable tab fallback

**File A:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` (line 1213)
- Pass `maxWidth="520px"` to `<PremiumFloatingPanel>`. Matches the wider variant already used by `ApplicantDetailSheet` (proven precedent in codebase). Adds ~80px → all 6 tabs fit comfortably.

**File B:** Same file, lines 1417-1428 (TabsList wrapper)
- Wrap `<TabsList>` in a horizontally scrollable container so any future tab additions (or large translations / longer labels) degrade gracefully instead of clipping:
  - Container: `mx-6 overflow-x-auto scrollbar-none`
  - TabsList itself: remove `mx-6`, keep `mb-0 shrink-0 w-max` so it sizes to content and scrolls if needed.
- This is a defensive measure; with the wider panel, scrolling shouldn't be needed in normal use.

### 3. (No DB / RLS changes — purely UI.)

## Acceptance checks

1. First-visit clients see exactly one indicator: the dashed `"First visit — no history yet"` panel inside the Details tab. The green banner is gone.
2. Returning clients see no first-visit messaging anywhere (current behavior preserved — banner deletion doesn't affect non-first-visit logic).
3. With the panel at 520px, all 6 tab labels (Details, History, Photos, Notes, Formulas with icon, Color Bar) render fully without horizontal clipping at desktop widths.
4. Tab labels do not overflow the panel edges on either side.
5. If labels ever exceed the container (longer translations, added tab), the TabsList scrolls horizontally with no scrollbar visible, instead of clipping.
6. Mobile behavior unchanged (panel still goes full-screen via `PremiumFloatingPanel`'s mobile branch).
7. Header, status pills, lifecycle bar, all tab content (Details / History / Photos / Notes / Formulas / Color Bar) render unchanged in the slightly wider panel.
8. No regression to the `ClientMemoryPanel` empty state, returning-client memory cards, or any other detail-sheet feature.

**Files to modify:**
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` (remove redundant banner; add `maxWidth="520px"`; wrap TabsList in scroll-safe container)
