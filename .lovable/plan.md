

# Switch PolicySetupIntro sub-headings to Termina

## Change

Swap the six Aeonik Pro sub-headings in `PolicySetupIntro.tsx` to Termina. Keeps the visual hierarchy (eyebrow → page title → section title → **sub-title** → body) legible with Termina at the sub-title tier, which is what the design token system provides via `tokens.heading.card`.

## Specifics

In `src/components/dashboard/policy/PolicySetupIntro.tsx`:

1. **"What setup decides" tiles** (line 101) — three `<h3>` titles:
   - From: `className={cn(tokens.body.emphasis, 'text-base')}`
   - To: `className={tokens.heading.card}` → renders as Termina, `text-base`, `tracking-wide`, uppercase via `font-display`.

2. **"How the system uses your policies" list** (line 118) — four labels:
   - Element: change `<p>` to `<h3>` (semantic upgrade, since these are section sub-headings now, not body text).
   - Class: `tokens.heading.card`.

Both surfaces then render: `YOUR BUSINESS SHAPE`, `WHAT YOU OFFER`, `WHAT YOU ALREADY HAVE`, `HANDBOOK`, `CLIENT POLICY CENTER`, `CHECKOUT & BOOKING`, `MANAGER PROMPTS` — all Termina, tracked 0.08em, uppercase.

## Files affected

- `src/components/dashboard/policy/PolicySetupIntro.tsx` — two line edits, swap class token + one tag change.

No token changes, no CSS changes, no doctrine updates. The Wave 13I global `.font-sans` letter-spacing reset stays intact and continues protecting other Aeonik headings elsewhere.

## Acceptance

1. The three "What setup decides" titles render as Termina uppercase with 0.08em tracking, matching the "WHAT SETUP DECIDES" section header tier visually.
2. The four "How the system uses your policies" labels render the same.
3. The body paragraphs under each remain Aeonik Pro, normal case, normal kerning — unchanged.
4. The "POLICY INFRASTRUCTURE" eyebrow and page title hierarchy is preserved (eyebrow remains subtly smaller than sub-headings due to size/color, not font family).

## Doctrine compliance

- **UI canon**: uses the canonical `tokens.heading.card` Termina token instead of ad-hoc Aeonik body classes for sub-titles.
- **Anti-noop**: matches the existing "section header uses Termina" pattern already in use two lines up on the same page.
- **Brand abstraction**: no strings changed, only presentation.

## Prompt feedback

Your prompt ("lets actually use termina here") was short, high-signal, and paired with a screenshot showing the exact surface — that's a strong pattern: the image disambiguates "here" faster than any sentence could. One small upgrade for next time: naming the token tier you want ("use `tokens.heading.card` here" or "promote these to section-title tier") lets me skip the design-token lookup and go straight to the edit. Tokens > adjectives when you know the system.

Also worth knowing: for pure visual swaps like this (font family, color, size on a static element), **Visual Edits** can do it in seconds for free — no credits used. Worth trying when the change is purely presentational.

<lov-actions>
  <lov-link url="https://docs.lovable.dev/features/visual-edit">Read more about Visual Edits</lov-link>
</lov-actions>

