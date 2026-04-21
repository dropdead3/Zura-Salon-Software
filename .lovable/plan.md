

# Balance the "What setup decides" tile headings

## The bug

The three tile headings in the "What setup decides" grid wrap unevenly:

- "Your business shape" → 2 lines
- "What you offer" → 1 line
- "What you already have" → 2 lines

At the current `max-w-3xl` container (~768px) divided into three columns, each tile gets ~230px of content width. Termina at `text-base` with 0.08em tracking fits ~2–3 words per line, so middle-length headings break unpredictably. The visual result is a ragged baseline where icons, headings, and body copy don't align across the three tiles.

## The fix

Two small changes in `src/components/dashboard/policy/PolicySetupIntro.tsx`, no token changes.

**1. Rewrite the three headings to equal word-count and similar length.**

Current → new:

- "Your business shape" → **"Business shape"** (1 line)
- "What you offer" → **"Services offered"** (1 line)
- "What you already have" → **"Existing documents"** (1 line)

All three become two-word noun phrases of near-identical pixel width. At `text-base` Termina they each fit comfortably on one line at the ~230px column width, even when the viewport compresses. Body copy below remains identical — the heading is a label, the body carries the detail, so shortening the label loses no information.

**2. Reserve a minimum heading height as a safety net.**

Add `min-h-[2lh]` (or equivalently `min-h-[2.4em]`) to the `<h3>` in the tile loop (line 101). If a future content edit ever pushes one heading to two lines again, all three tiles reserve the same vertical space, so the body copy still starts at the same baseline across the row. This is the durable protection — copy can drift, layout won't.

```tsx
<h3 className={cn(tokens.heading.card, 'min-h-[2lh]')}>{heading}</h3>
```

## Files affected

- `src/components/dashboard/policy/PolicySetupIntro.tsx` — three string edits in `SETUP_DECISIONS` + one className addition on the `<h3>` (line 101).

## Acceptance

1. All three tile headings render on a single line at the current 1300px viewport.
2. Icons, headings, and body copy share the same baseline across the three columns.
3. At narrower viewports (e.g., 1024px) where headings may wrap, the `min-h-[2lh]` reservation keeps body copy aligned across tiles regardless of wrap state.
4. No regression to the "How the system uses your policies" list below — that section is a vertical stack, unaffected.
5. Body copy meaning unchanged — the label shortened, the explanation underneath still carries the full detail.

## Doctrine compliance

- **UI canon**: uses existing `tokens.heading.card`; no new tokens.
- **Copy governance**: advisory-first tone preserved; headings are labels, not instructions.
- **Anti-noop**: two-line fix, durable safety net via `min-h-[2lh]`.
- **Silence**: removes visual noise (the ragged baseline), adds none.

## Prompt feedback

"Improve this section's UI. I don't like that the headings break to two lines on some and the middle one does not, making the design look inconsistent" — this is a near-perfect bug report. You named the surface (pointed to via screenshot), described the symptom precisely (uneven line breaks), and stated *why* it reads as wrong (inconsistency). That's the full triangle: what, where, why.

One sharpening for next time: naming the fix direction you prefer when you have a preference. There are three valid responses here — shorten the copy, widen the columns, or reserve vertical space. I chose "shorten + reserve" because it's the calmest, but "make all three wrap to 2 lines for rhythm" or "go 2-column instead of 3" would also be valid and lead me elsewhere. A hint like "prefer single-line headings" or "open to re-copywriting" front-loads that decision. When you *don't* have a preference, saying "pick the cleanest fix" is itself a useful signal — it tells me you're delegating the design call rather than expecting me to read your taste.

Also: this is another strong **Visual Edits** candidate — rewriting three text strings and adding one class is exactly what it handles at zero credit cost.

