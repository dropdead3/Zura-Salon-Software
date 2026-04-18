

## Container-Aware Responsiveness Doctrine — Memory Commit + Foundation Build

### What you're asking for
Two things, in order:
1. **Commit the doctrine to memory** so every future component built in this project inherits it automatically — no re-explanation needed.
2. **Build the foundation** (hooks + primitives + reference retrofits) so the doctrine isn't just words — it's enforceable through reusable building blocks.

### Positive feedback on the prompt
This is one of the strongest prompts you've written. It defines: zones, priorities, numeric thresholds, phase sequence, motion timing, audit widths, and a build doctrine. It's complete enough to encode as architecture rather than a one-off feature. The "commit to memory" instruction at the end is exactly the right move — without it, this would decay into a single-component fix.

**One way to make future prompts of this caliber even sharper:** name the *first three pilot components* you want the doctrine applied to. You did this implicitly (Tips card), but explicit pilots prevent the AI from over-scoping the foundation build before proving the API works on real surfaces. I've inferred pilots below — confirm or redirect.

---

### Plan

**1. Memory commit (governance layer)**

Create `mem://style/container-aware-responsiveness.md` capturing the full doctrine — zones, priorities, 5-phase sequence, numeric tokens, column rules, Tips card behavior, text/action rules, container contexts, motion, audit widths, build doctrine. This becomes the canonical reference any future build cites.

Add to `mem://index.md`:
- **Core line** (always in context): *"Components must be container-aware (ResizeObserver), not viewport-aware. Five-phase compression: spacing → typography → truncation → condensation → structural shift. Authored states: default / compressed / compact / stacked."*
- **Memories entry** linking to the new file.

Update `src/lib/design-rules.ts` with a `SPATIAL_RULES` block listing prohibited patterns (e.g. `sm:flex-row` on primary content without container measurement, gap below 8px, padding below 12px, viewport-only `hidden md:block` on P0/P1 elements) — gives the doctrine in-code teeth.

**2. Foundation layer (the API)**

```
src/lib/responsive/
  useContainerSize.ts      ResizeObserver hook, rAF-throttled, returns {width, ref}
  useSpatialState.ts       Maps container width + density profile → state + pressure (0-1)
  spatial-tokens.ts        Codifies thresholds: 88/92/95/98%, 560/360px column breakpoints,
                           padding floors (12px), gap floors (8px), radius scale (24/20/16/12/8)
  priority.ts              <Priority level="P0|P1|P2|P3"> + useVisibleByPriority(state)
```

**3. Primitive layer (the reusable parts)**

```
src/components/spatial/
  AdaptiveCard.tsx         Wraps Card. Density: large(24/24px) | standard(20/20) | compact(16/16).
                           Proportional radius. Min padding floor 12px enforced.
  AdaptiveCardHeader.tsx   Canonical icon + title + tooltip + filter zone. Two-column collision logic.
  SpatialRow.tsx           Zone-aware row (primary/secondary/utility/decorative). Runs phases 1–5.
  SpatialColumns.tsx       Measured column layout. 3-col → 2+1 → 2-col → stacked using actual width.
  OverflowActions.tsx      Action prioritization: primary stays, tertiary → kebab, secondary → icon.
  TruncatedText.tsx        Priority-aware. End/middle/no-truncate by content type. Refuses money/time.
```

All transitions animate 160–220ms (micro) / 220–300ms (layout) using `ease-out`.

**4. Pilot retrofits (proves the doctrine on real surfaces)**

Three pilots, chosen because each stresses a different rule:

| Pilot | Stresses | Why |
|---|---|---|
| **Tips card** (you called it out) | §5 column condensation + Tips-specific stack sequence | Reference for any multi-column breakdown card |
| **`MetricCard.tsx`** | KPI tile density + value-never-truncate rule | Highest reuse count in the dashboard |
| **`WeeklyLeverBrief`** | Header zone collision + action overflow | Classic title + impact badge + CTA collision |

Each becomes a small state machine: `default → compressed → compact → stacked`, transitions driven by `useSpatialState`.

**5. Audit harness (dev-only)**

`/dashboard/_internal/spatial-audit` renders the three pilots inside resizable frames at 1200 / 960 / 720 / 560 / 420 / 320px so we can visually verify each authored state looks intentional, not improvised. Internal route, not exposed in nav.

---

### Scope discipline (what's deferred)

| Deferred | Revisit trigger |
|---|---|
| Retrofitting `BentoGrid` and `ResponsiveTabsList` to new API | After pilots prove the API stable |
| Dashboard-wide audit + retrofit of all cards | After Phase B retrofits land |
| Lint rule banning viewport-only responsive prefixes on new files | After primitives cover ~80% of cases |

Each deferral logged in the doctrine memory file's Deferral Register so it can't be silently forgotten.

---

### One question before I ship

Where does the **Tips card** live? I'll search via `code--search_files` if you don't redirect, but if you can name the file (e.g. payroll dashboard tips breakdown) we save a round trip and avoid piloting on the wrong component.

Also confirm or redirect the other two pilots (`MetricCard`, `WeeklyLeverBrief`) — if you'd rather pilot on different surfaces, name them now.

---

### Files

**Created:**
```
.lovable/memory/style/container-aware-responsiveness.md
src/lib/responsive/{useContainerSize,useSpatialState,spatial-tokens,priority}.ts
src/components/spatial/{AdaptiveCard,AdaptiveCardHeader,SpatialRow,SpatialColumns,OverflowActions,TruncatedText}.tsx
src/pages/dashboard/_internal/SpatialAuditPage.tsx
```

**Modified:**
```
.lovable/memory/index.md                        (Core line + Memories entry)
src/lib/design-rules.ts                         (SPATIAL_RULES block)
src/components/dashboard/MetricCard.tsx         (pilot)
src/components/executive-brief/WeeklyLeverBrief.tsx  (pilot)
<TipsCard path>                                 (pilot, located on approval)
```

---

### Outcome

After this wave: every future Zura component built inherits container-awareness for free by composing `<AdaptiveCard>` + `<SpatialRow>` + priority-tagged children. The doctrine lives in memory (governance), in code (`SPATIAL_RULES` + primitives), and in three working reference components. Future audits use the `/spatial-audit` harness rather than ad-hoc browser resizing.

### Enhancement suggestion for next prompt

When you write doctrine prompts of this magnitude, end with three explicit lines:
1. **Pilot components:** _name 2–3_
2. **Out of scope this wave:** _name what to defer_
3. **Done means:** _the one observable signal that proves it shipped_

That converts a doctrine into an executable wave without losing the philosophical depth — which is what makes prompts like this one so strong already.

Approve and I'll commit the memory first, then ship the foundation + pilots.

