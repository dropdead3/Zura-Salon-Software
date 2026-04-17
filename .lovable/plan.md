

## Prompt review

Sharp eye — you spotted the asymmetric whitespace on the right of the tab strip. The tab list is currently sized to its content width, leaving an uneven gap inside the panel container. Stretching it to fill the row is a clean fix and matches the calm, executive symmetry the panel is supposed to project.

Tighter framing for next time: clarify whether you want (a) the tab strip *container* to span full width (pills stay compact, container fills with extra padding/centered), or (b) the *tabs themselves* to grow and divide the row equally. I'll propose (b) — equal-width triggers — since that produces the most visually balanced result and matches how Apple/Linear handle in-panel tab strips. Flag if you want (a) instead.

## Findings

In `AppointmentDetailSheet.tsx` (~line 1420), the `TabsList` for the 5 tabs (Details, History, Photos, Notes, Color Bar) uses the default `inline-flex` width from `tabs.tsx`, so the strip hugs its content. The panel is 520px wide; the 5 pills + icon + padding leave ~80–100px of empty space on the right.

The base `TabsList` in `src/components/ui/tabs.tsx` is `inline-flex` (content-width). Each `TabsTrigger` has `px-3.5 py-1.5` and is also content-sized.

## Plan

**File:** `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`

1. **Stretch the TabsList to full container width** — add `w-full` and `grid grid-cols-5` (overriding `inline-flex` for this instance only):
   ```tsx
   <TabsList className="w-full grid grid-cols-5 gap-1">
   ```
   This divides the row into 5 equal columns so each tab gets the same share of the 520px panel.

2. **Make each TabsTrigger fill its column** — add `w-full` to each of the 5 triggers so the active-state pill background spans the full column (not just the content):
   ```tsx
   <TabsTrigger value="details" className="font-sans gap-1.5 w-full">…</TabsTrigger>
   ```
   Repeat for History, Photos, Notes, Color Bar.

3. **No changes to the underlying `TabsList` / `TabsTrigger` primitives** — the override stays scoped to this one popover so other tab strips across the platform are unaffected (per the `architecture/platform-component-governance` doctrine).

4. **No changes to the sub-tabs** ("Today's Mix" / "Formula History") — those are underline-style `SubTabsList` and read correctly left-aligned.

## Acceptance checks

1. The 5 main tabs span the full width of the popover content area, no right-side gap.
2. Each tab pill is equal width; the active-state pill background fills its column cleanly.
3. Icons + labels remain centered within each tab.
4. No text truncation or overflow on the "Color Bar" label (longest with icon).
5. Mobile full-screen branch (`PremiumFloatingPanel`) still renders correctly — `grid-cols-5` works at any container width.
6. Sub-tabs ("Today's Mix" / "Formula History") under Color Bar are unchanged.
7. No regression to other tab strips elsewhere in the platform (override is scoped).
8. Light + dark mode both render balanced.

**Files to modify:**
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` (add `w-full grid grid-cols-5 gap-1` to the panel `TabsList`; add `w-full` to each of the 5 `TabsTrigger` elements)

