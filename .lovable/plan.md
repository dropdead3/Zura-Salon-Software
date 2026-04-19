

## Diagnosis

Looking at the screenshot, the current tooltip works but reads as a flat text dump:
- "Doesn't perform" list is a long run-on sentence with `·` separators — hard to scan, and items wrap awkwardly mid-line ("New Client Consultation").
- No visual distinction between the **positive** state (Accepting clients) and the **negative** state (Doesn't perform). They're styled identically.
- The dot before "Accepting clients" is the only color cue — exclusions have no semantic marker.
- Section labels (`DOESN'T PERFORM`) are uppercase but the content below sits flush, no rhythm.
- Tooltip width feels arbitrary — it expands to fit the longest line, which makes 7 items render as a wall of text.

## Proposed enhancement (visual only, no data changes)

Update the avatar tooltip in `src/components/dashboard/schedule/DayView.tsx`:

### 1. Convert exclusion list → chip/pill cluster
Each excluded category and service becomes a small pill: `rounded-full px-2 py-0.5 bg-destructive/10 text-destructive/80 text-[11px]`. Wraps naturally, scans instantly, no awkward `·` separators.

### 2. Differentiate categories vs services
- **Categories** (broader): slightly stronger pill — `bg-destructive/15 text-destructive border border-destructive/20`
- **Services** (granular): lighter pill — `bg-muted text-muted-foreground`

This communicates "Color (entire category)" carries more weight than "Styling (one service)".

### 3. Cap width + tighten layout
- Tooltip: `max-w-[280px]` so pills wrap predictably instead of one long line.
- Section spacing: `space-y-2.5` between header rows and content, `gap-1.5` between pills.

### 4. Upgrade the status row
Promote "Accepting clients" / "Not accepting" into a pill row that mirrors the exclusion pills:
- Green pill with dot for accepting, muted red pill for not accepting.
- Removes the lone-dot inconsistency.

### 5. Specialties as positive chips (consistency)
If specialties already render, convert them to the same chip pattern but in `bg-emerald-500/10 text-emerald-700` so the tooltip reads as: **green chips = does**, **red chips = doesn't**, instantly parseable.

### 6. Section headers
Keep the `text-[10px] uppercase tracking-wider` label, but add a faint divider above (`border-t border-border/40 pt-2.5`) and color-code: "Specialties" → muted-foreground, "Doesn't perform" → `text-destructive/60`.

### Final structure
```
[Avatar name]
[● Accepting clients pill]
─────────────────
SPECIALTIES
[chip] [chip] [chip]
─────────────────
DOESN'T PERFORM
[Category chip] [Category chip]
[service] [service] [service]
```

### Verification
- Tooltip on a stylist with many exclusions wraps cleanly within 280px.
- Categories visually outweigh individual services.
- Color semantics are consistent (green = capability, red = exclusion).
- No text changes, no new data fetches — purely presentational.

### Prompt feedback
Open-ended "improve the UI" prompts give wide latitude but also risk drift. A tighter version like *"Make the exclusion list scannable — too dense as a comma list"* would point me directly at the pain point. Pattern: **"What's wrong + what direction to go"** beats **"make it better"**.

### Enhancement suggestions
- Add a tiny count badge in the section header: `DOESN'T PERFORM (7)`.
- For very long exclusion lists (>6), collapse with "+N more" and show full list on click.
- Mirror the same chip system in the booking flow when an operator tries to assign a stylist to an excluded service — shows the same red chip as a soft block.

