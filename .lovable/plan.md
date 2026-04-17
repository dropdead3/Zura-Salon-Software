

## Prompt review

Clear and focused — names the surface (quick actions), the UI concern, and the conditional logic. Even sharper next time: hint at the visual direction you want ("more compact", "icon-only on mobile", "match the lifecycle bar style") so I don't guess at aesthetics. Right now the screenshot tells me the issue (Call/Text look disabled/ghosted, Send Payment Link wraps to its own row awkwardly), but a one-line preference saves a round-trip.

## Plan — Wave 18.1: Quick Actions UI Polish

**Doctrine anchor:** UI Canon (button tokens, spacing, calm/executive aesthetic).

### What's wrong now (from screenshot)

1. **Call** and **Text** render as muted/disabled-looking pills even when they're actionable — the disabled visual state is leaking, or they always render and just look dead when no phone exists
2. **Send Payment Link** wraps to its own line awkwardly, breaking the row rhythm
3. Mixed button widths (Call/Text are tight, Email/Rebook are wider, Send Payment Link is widest) → ragged layout
4. No visual grouping — communication actions (Call/Text/Email) and transactional actions (Rebook/Send Payment) feel equal weight

### Fix

**Conditional rendering (hard rule):**
- Render `Call` only if `clientPhone` exists (drop entirely otherwise — no disabled state)
- Render `Text` only if `clientPhone` exists
- Render `Email` only if `clientEmail` exists AND it's not a placeholder (`/^(na|none|noemail|test)@/i`)
- Render `Rebook` always (no data dependency)
- Render `Send Payment Link` always (handles its own internal validation)

**Visual cleanup:**
- Single horizontal flex row, `gap-2`, `flex-wrap` for narrow widths
- All buttons use `tokens.button.cardAction` (h-9, px-4, rounded-full) for consistent pill height
- Communication actions (Call, Text, Email) use `variant="outline"` — secondary weight
- Transactional actions (Rebook, Send Payment Link) use `variant="default"` — primary emphasis
- Icon-only on very narrow widths (< 380px drawer) using responsive label hiding (`<span className="hidden sm:inline">`)
- If **no actions render at all** (rare: no phone, no email, send-pay disabled), hide the row entirely — silence is valid output

**Empty/edge cases:**
- If only Rebook + Send Payment Link render, they sit left-aligned, not stretched
- Tooltip on each communication button shows the actual value (e.g., "Call (555) 123-4567")

### Acceptance checks

1. No phone → no Call/Text buttons (not disabled, just absent)
2. No email or placeholder email → no Email button
3. All rendered buttons same height (h-9), consistent radius (rounded-full)
4. No awkward wrapping at standard drawer width (480px)
5. Communication vs transactional visual hierarchy clear
6. Tests still 111/111

### Files touched

- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx` — quick actions row only (the section added in Wave 18)

### Deferred (unchanged)

- P2 (split file at 3,000 LOC)
- P2 (shared NoteCard)
- P2 (rich audit-driven timeline)

