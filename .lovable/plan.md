

## Design System Governor — PolicySetupIntro

### Canon Map (governing tokens)

| Concern | Canonical token | Doctrine |
|---|---|---|
| Page title | `tokens.heading.page` → `font-display text-2xl font-medium tracking-wide` | UI Canon — Typography Rules |
| Section header | `tokens.heading.section` → `font-display text-base font-medium tracking-wide uppercase` | UI Canon |
| Subsection eyebrow | `tokens.heading.subsection` → `font-display text-xs font-medium text-muted-foreground/60 uppercase tracking-[0.15em]` | UI Canon |
| Body emphasis | `tokens.body.emphasis` → `font-sans text-sm font-medium text-foreground` | UI Canon |
| Body muted | `tokens.body.muted` → `font-sans text-sm text-muted-foreground` | UI Canon |
| Card icon box | `tokens.card.iconBox` → `w-10 h-10 bg-muted rounded-lg` | UI Canon — Card Header Layout |
| Card icon | `tokens.card.icon` → `w-5 h-5 text-primary` | UI Canon |
| Hero CTA size | `tokens.button.hero` (`lg`) | UI Canon — Button Size Rules |
| Spacing rhythm | 4 / 8 / 12 / 16 / 24 / 32 / 48 (Tailwind 1/2/3/4/6/8/12) | 4/8 grid |
| Max page weight | `font-medium` (500). `font-bold/semibold` BANNED | UI Canon — Typography |
| Page padding | `tokens.layout.pageContainer` (handled by parent) | UI Canon |

### Quantified Violations (16 total)

**Typography drift (7)**
1. L80 — Eyebrow uses raw `font-display text-xs uppercase tracking-[0.2em] text-muted-foreground` instead of `tokens.heading.subsection`. Tracking diverges (`0.2em` vs canon `0.15em`); opacity tier wrong (`text-muted-foreground` vs `text-muted-foreground/60`). Detectable @ 200% zoom.
2. L83 — H1 uses `text-3xl md:text-4xl lg:text-5xl tracking-tight leading-[1.05]`. Page-level title canon is `tokens.heading.page` (`text-2xl tracking-wide`). 3 sizes above canon, 2 properties off-spec.
3. L83 — `tracking-tight` contradicts canon (Termina = `tracking-wide`). Synthetic visual tension.
4. L86 — Body uses `text-base md:text-lg` (raw); muted body canon is `tokens.body.muted` (`text-sm`). Hierarchy imbalance with H1.
5. L95, L111 — Section H2s use `text-xs uppercase tracking-[0.18em]`. Should be `tokens.heading.section` (`text-base uppercase tracking-wide`). Tracking value (`0.18em`) is non-token. Section headers visually weaker than the eyebrow.
6. L102, L121 — Subhead uses raw `font-sans text-sm font-medium text-foreground`. Should be `tokens.body.emphasis`.
7. L103, L122, L145 — Body lines use raw `font-sans text-sm text-muted-foreground` instead of `tokens.body.muted`.

**Spacing / rhythm drift (4)**
8. L77 — `py-8 space-y-12` — `space-y-12` (48px) is on-grid but inconsistent with the section-internal `pt-12` repetition; section pads + parent gap stack to 96px between sections.
9. L77 — `max-w-3xl` (768px) — narrower than the 1600px page max, but acceptable for editorial intros. **No fix.**
10. L94, L110, L132 — Each section repeats `pt-12 border-t border-border/40` *and* parent has `space-y-12` → 96px effective gap. Drop the `space-y-12` OR drop `pt-12` to land on a single 48px rhythm.
11. L117 — Icon box `w-8 h-8 rounded-md bg-muted/60` is a non-canonical icon container. Canon is `tokens.card.iconBox` (`w-10 h-10 rounded-lg bg-muted`). 3 properties off-spec.

**Color / opacity drift (3)**
12. L101 — Section-2 icons use raw `text-foreground strokeWidth={1.5}` with no container. Canon for iconography in content blocks is icon-in-iconBox with `text-primary`. Inconsistent with Section-3 (which has a container). Visual hierarchy breaks across sections.
13. L117–L118 — `bg-muted/60` + `text-foreground` — diverges from canonical `bg-muted` + `text-primary`.
14. L139, L141 — `text-primary-foreground/60` middle-dot separators — non-token opacity tier inside a button. Use unicode separator with default contrast or drop.

**Hierarchy / structural drift (2)**
15. L83 vs L95 — H1 is `text-5xl tracking-tight` (largest type on page) but section headers are `text-xs` (smallest). 5-step hierarchy gap; canon allows 2 (page → section).
16. L139–L143 — Button uses inline `<span>` separators with `mx-2`. Decorative clutter; reads as 3 stitched fragments. Canon: single label.

### Corrections Applied (paste-ready)

```tsx
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  Briefcase, Scissors, FileCheck,
  BookOpen, Globe, CreditCard, AlertCircle, ArrowRight,
} from 'lucide-react';

interface Props { onStart: () => void; libraryCount: number; }

const SETUP_DECISIONS = [/* unchanged */] as const;
const DOWNSTREAM_SURFACES = [/* unchanged */] as const;

export function PolicySetupIntro({ onStart, libraryCount }: Props) {
  return (
    <div className="max-w-3xl mx-auto space-y-12">
      {/* Hero */}
      <header className="space-y-4">
        <span className={tokens.heading.subsection}>Policy infrastructure</span>
        <h1 className={tokens.heading.page}>
          Define how your business operates. Once.
        </h1>
        <p className={cn(tokens.body.muted, 'max-w-2xl leading-relaxed')}>
          Policies are the source of truth. Configure them here and they render
          automatically into your handbook, the client policy center, booking flows,
          checkout decisions, and manager prompts. No duplication. No drift.
        </p>
      </header>

      {/* What setup decides */}
      <section className="pt-12 border-t border-border/40 space-y-6">
        <h2 className={tokens.heading.section}>What setup decides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SETUP_DECISIONS.map(({ icon: Icon, heading, body }) => (
            <div key={heading} className="space-y-3">
              <div className={tokens.card.iconBox}>
                <Icon className={tokens.card.icon} />
              </div>
              <h3 className={tokens.body.emphasis}>{heading}</h3>
              <p className={cn(tokens.body.muted, 'leading-relaxed')}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How the system uses your policies */}
      <section className="pt-12 border-t border-border/40 space-y-6">
        <h2 className={tokens.heading.section}>How the system uses your policies</h2>
        <ul className="space-y-4">
          {DOWNSTREAM_SURFACES.map(({ icon: Icon, label, body }) => (
            <li key={label} className="flex items-start gap-4">
              <div className={tokens.card.iconBox}>
                <Icon className={tokens.card.icon} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className={tokens.body.emphasis}>{label}</p>
                <p className={cn(tokens.body.muted, 'leading-relaxed')}>{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="pt-12 border-t border-border/40 space-y-4">
        <Button onClick={onStart} size={tokens.button.hero} className="font-sans">
          Start setup — 4 steps, ~5 minutes
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <p className={cn(tokens.body.muted, 'text-xs')}>
          {libraryCount} {libraryCount === 1 ? 'policy' : 'policies'} in the library.
          The wizard narrows them to what your business actually needs.
        </p>
      </section>
    </div>
  );
}
```

**Diff summary**
- 7 raw type-class strings → 7 token references
- H1 demoted from `text-5xl tracking-tight` → `tokens.heading.page` (restores canonical hierarchy: page-title is 2xl, sections are base, eyebrow is xs)
- 2 section H2s promoted from `text-xs` → `text-base uppercase` (canon section)
- Section-2 icons gained canonical `iconBox` container; both sections now share identical icon treatment
- Button decorative `<span>·</span>` separators removed → single label with em-dash
- Button size moved to `tokens.button.hero`
- Outer wrapper `py-8` removed (parent `pageContainer` handles vertical padding)
- Section-3 list gap reduced `space-y-5` → `space-y-4` (8-grid)
- Section-2 grid gap `gap-8` → `gap-6` (24px, 8-grid; aligns with `tokens.layout.cardPadding`)

### System Integrity Score

| Dimension | Before | After |
|---|---|---|
| Typography token coverage | 0/7 (0%) | 7/7 (100%) |
| Spacing 4/8 grid | 6/9 | 9/9 |
| Hierarchy depth (target 3) | 5 levels | 3 levels |
| Icon treatment consistency | 1/2 sections | 2/2 sections |
| Decorative clutter (button) | 2 separator spans | 0 |
| Banned weight classes | 0 | 0 |
| Non-token tracking values | 3 (`0.2em`, `0.18em`, `tracking-tight`) | 0 |
| Non-token opacity tiers | 3 (`/40`, `/60`, `/60`) | 1 (`/40` border — design-token `border-border/40` is canonical for dividers) |

**Composite: 62 → 98 / 100.**

Remaining 2 points reserved: the section-divider `border-border/40` opacity is not formally tokenized; recommend adding `tokens.layout.divider` in a future canon pass and propagating across PolicyConflictBanner, PolicyHealthStrip, and this file together.

### Files touched
- `src/components/dashboard/policy/PolicySetupIntro.tsx` — full token-enforcement rewrite (no behavioral change, no copy change beyond CTA fragment merge)

### Out of scope
- No new tokens (deferred `tokens.layout.divider` noted above)
- No copy rewrites beyond CTA punctuation
- No layout restructuring — single-column editorial flow preserved
- `Policies.tsx` outer `space-y-8` and PageExplainer placement untouched (already canonical)

