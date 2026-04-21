

# Fix Aeonik Pro headings rendering with Termina letter-spacing

## The bug

`src/index.css` (line 1016-1017) applies `@apply font-display` to every `h1-h6` element globally:

```css
h1, h2, h3, h4, h5, h6 { @apply font-display; }
```

`.font-display` sets `letter-spacing: 0.08em` plus `text-transform: uppercase`. When a heading is overridden to Aeonik (`<h3 className="font-sans ...">`), the `.font-sans` utility correctly undoes the uppercase (`text-transform: none !important`) — but it **never resets `letter-spacing`**, so the 0.08em tracking leaks through.

Result: every Aeonik heading anywhere in the app renders with Termina-grade letter-spacing. The policies intro page makes it obvious ("Your business shape", "What you offer", "What you already have", plus the four downstream-surface labels "Handbook", "Client policy center", etc.), but the bug is global — anywhere a heading tag uses `font-sans`, it's tracked when it shouldn't be.

This is why the doctrine rule "Aeonik Pro… NEVER uppercase" is enforced in `.font-sans` but the companion tracking rule was never paired.

## The fix (single line of CSS)

In `src/index.css`, inside the `.font-sans` utility (around line 1057), add `letter-spacing: normal`:

```css
.font-sans {
  text-transform: none !important;
  letter-spacing: normal;
}
```

This neutralizes any inherited tracking from the global `h1-h6 { @apply font-display }` rule whenever an element is explicitly classed `font-sans`. Tailwind's `tracking-*` utilities still override it when intentional (e.g. `font-sans tracking-wide` still works).

One character change of impact, zero regressions: `font-display` headings keep their 0.08em tracking untouched; only headings that opt into `font-sans` get the reset.

## Other issues on the policies intro page (same doctrine)

While on the page, two small nearby inconsistencies worth fixing in the same pass:

1. **Section 2/3 paragraph headings use `tokens.body.emphasis`** (`font-sans text-sm font-medium`). At `text-sm` these read as body-weight captions, not as titles under an icon box. Promote to `text-base font-medium` so the hierarchy reads: icon → title → body. Keep Aeonik, stay non-uppercase.

2. **Section break spacing** uses `pt-12 border-t border-border/40 space-y-6` on three sections. The `border-border/40` is visible in light themes but barely perceptible on the current dark preview — this is working as designed, no change needed, just flagging for the next theme pass.

## Files affected

- `src/index.css` — add one line to `.font-sans` utility. (Global fix.)
- `src/components/dashboard/policy/PolicySetupIntro.tsx` — bump the two heading sites from `tokens.body.emphasis` to `cn(tokens.body.emphasis, 'text-base')` so the titles scale appropriately.

No token changes (the token system is correct; only the base-layer heading cascade needed a letter-spacing reset). No doctrine updates — the existing "Aeonik never uppercase" rule in `font-sans` gains a parallel "Aeonik never inherits Termina tracking" behavior.

## Acceptance

1. "Your business shape", "What you offer", "What you already have" render with normal Aeonik Pro kerning — letters sit at natural spacing, not visibly tracked.
2. Same for "Handbook", "Client policy center", "Checkout & booking", "Manager prompts" below.
3. All Termina surfaces on the page (the "POLICY INFRASTRUCTURE" eyebrow, the "WHAT SETUP DECIDES" and "HOW THE SYSTEM USES YOUR POLICIES" section headers) still render uppercase and tracked at 0.08em — unchanged.
4. Spot-check one or two other dashboard pages (e.g. Command Center, Analytics) to confirm no regression on cards that intentionally use tracking on `font-sans` via explicit `tracking-*` classes.

## Doctrine compliance

- **UI canon**: pairs the "Aeonik never uppercase" rule with its missing "Aeonik never inherits display tracking" companion. Both are global, both live in the same `.font-sans` utility.
- **Anti-noop**: one-line CSS fix with system-wide effect; no component-level workarounds proliferated.
- **Silence**: no visual noise added — if anything, removed.

## Why this wasn't caught earlier

The global `h1-h6 { @apply font-display }` was introduced to default Termina-ify any bare heading. The `.font-sans` override was written later and correctly undid the uppercase transform (the most visible symptom) but left the tracking — which is subtler — untouched. It's exactly the kind of cross-layer interaction the token system is supposed to prevent; adding the missing line closes the loop.

