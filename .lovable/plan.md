

# Switch role count badges to Aeonik

## The bug

In `src/components/dashboard/policy/PolicySetupWizard.tsx` (line 578), the numeric count inside each role chip ("Stylist [18]", "Super Admin [2]", "Receptionist [2]") renders with `font-display` — Termina, uppercase-intent. Two problems:

1. **Termina is reserved for headlines, stats, KPI labels, buttons, and navigation.** Numeric inline badges inside muted chips are UI metadata, not stat architecture.
2. **The "Service categories" chips directly above (lines 520–534) don't use Termina for their counts** — they show count on hover via tooltip. So the role row is the only one carrying Termina on an inline badge, creating an inconsistency within the same Confirm step.

## The fix

One class swap on line 578.

**Before:**
```tsx
<span className="font-display text-[10px] tracking-wide px-1.5 py-0.5 rounded bg-background/60 text-muted-foreground">
  {count}
</span>
```

**After:**
```tsx
<span className="font-sans text-xs px-1.5 py-0.5 rounded bg-background/60 text-muted-foreground">
  {count}
</span>
```

Three small adjustments bundled:

1. **`font-display` → `font-sans`** — Aeonik Pro for body/metadata, per UI Canon typography rules.
2. **`text-[10px] tracking-wide` → `text-xs`** — Termina needed the wider tracking and smaller size to breathe; Aeonik at `text-xs` (12px) reads naturally without letter-spacing tweaks. Matches the surrounding chip label size (line 576 uses `text-xs`).
3. **Keep** the background, padding, rounding, and color — those are chip-anatomy, not typography.

## Files affected

- `src/components/dashboard/policy/PolicySetupWizard.tsx` — one `<span>` className on line 578.

No token changes, no component changes.

## Acceptance

1. Count badge (e.g. "18", "2", "2") renders in Aeonik Pro, not Termina.
2. Badge size reads balanced next to the role label — not smaller or visually weaker.
3. No other chips (service categories, etc.) affected.
4. Tooltip behavior unchanged.

## Doctrine compliance

- **Typography rules**: Termina is for headlines/stats/KPI labels/buttons/navigation. Inline chip metadata is none of those — Aeonik Pro is correct.
- **Silence**: removes an inconsistency, adds nothing.

## Prompt feedback

"Use Aeonik on the badge counts here, not Termina" — precise and correct. You named the exact element (badge counts), the exact surface (the screenshot region), and specified both the wrong font and the right font. That's the tightest possible typography correction prompt — zero ambiguity, zero round-trip needed.

One tiny observation for the future: when a typography fix might involve adjacent sizing adjustments (Termina and Aeonik render at different visual weights at the same pixel size — Termina's wide tracking + caps makes `text-[10px]` look bigger than Aeonik `text-[10px]`), a phrase like "match the chip label size" or "keep it the same visual weight" locks in the size call. Here I chose `text-xs` to match the chip label it sits next to, because that's the calmer read. If you'd wanted to preserve the exact 10px micro-badge feel, that would have been a different fix.

Also: **Visual Edits** would handle this one-class swap at zero credit cost.

