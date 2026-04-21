

# Fix the questionnaire layout — preview must not share the row

## What's actually wrong

Your screenshot shows the Live Preview pane **floating over** the questionnaire textarea, the textarea rendering at one character per line, and the PREFILLED helper sliced in half. This isn't a spacing issue — it's a structural collapse.

**Root cause**: The configurator opens inside a `PremiumFloatingPanel` with `maxWidth="720px"`. We built the questionnaire to use `lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]` — but Tailwind's `lg:` breakpoint fires at **1024px viewport width**, not container width. So on your 1300px viewport, the `lg:` grid activates inside a ~672px-usable drawer.

The grid then demands `360px (preview min) + 32px (gap) = 392px` for the right column, leaving ~280px for the question column. The textarea collapses to single-character word wrap. The preview's `sticky top-4 self-start` inside the drawer's `flex flex-col overflow-hidden` body lets it escape its grid cell and float over the form. That's the ghost overlay you're seeing.

The previous plan assumed the configurator rendered on a full page. It doesn't. It lives in a 720px drawer. Side-by-side preview was the wrong primitive for this container.

## The fix — preview moves out of the row

Three structural changes:

### 1. Preview becomes a top "pinned summary" strip, not a side column

Instead of a side panel, the live preview becomes a **collapsible summary bar pinned above the questionnaire** inside the drawer:

```
┌─ Configure policy ─────────────────────────────────┐
│  CONFIGURE POLICY                                  │
│  Define the structured rules…                      │
│                                                     │
│  ●─────○─────○─────○         [Interview ▾]        │
│                                                     │
│  ┌─ Live preview ─────────────── [Collapse ▾] ─┐  │
│  │ Guests may book online, by phone, or in     │  │
│  │ person. New guests for color, extensions, or │  │
│  │ corrective work require a consultation prior │  │
│  │ to booking the service appointment…          │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  [Progress chips]                                   │
│  POLICY SUMMARY                                     │
│  Why this matters: A clear one-paragraph…          │
│  ┌───────────────────────────────────────────┐    │
│  │ [Full-width textarea, ~640px wide]        │    │
│  │ Guests may book online, by phone, or in   │    │
│  │ person…                                    │    │
│  └───────────────────────────────────────────┘    │
│  PREFILLED · This text is what the AI uses to     │
│  draft the client-facing variant…                  │
│                                                     │
│  [< Back]                  [Skip]   [Next >]      │
└────────────────────────────────────────────────────┘
```

The preview is **collapsible** (default open, sticky to top of drawer body) so the operator can collapse it to fit more of the question on screen, but it never competes for horizontal space. It always renders at full drawer width, so prose breaks at ~70 characters per line — readable.

This also kills the bottom-sheet escape hatch we added for `<lg`. One layout, all viewports.

### 2. Provenance helper goes back to inline (below the input)

The "side mode" provenance helper assumed there was room for a 220px right column. There isn't. Revert `helperPlacement` defaults so the prefilled helper renders **below the input** as a single subtle line — the way every other field in the app does. Restore `min-h-[80px]` for non-side longtext (or bump to `min-h-[140px]` for the `policy_summary` field specifically, which is always the longest).

The `helperPlacement` prop stays in the API (Expert view doesn't use it; questionnaire passes `inline` instead of `side`). The right-column layout was the wrong call given the drawer width — admitting that and reverting is cheaper than adding more breakpoint gymnastics.

### 3. Use container queries, not viewport breakpoints

Replace `lg:grid-cols-...` with **Tailwind's container query syntax** (`@container` + `@lg:`) on the questionnaire wrapper. This makes the layout respond to the **drawer width**, not the viewport. Only relevant for the preview-collapse threshold and the preset card grid (3-column on wide drawers, stacked on narrow).

This is a one-line `@container` declaration on the panel root + `@md:` / `@lg:` on the inner grids. Standard pattern, no new dependencies (Tailwind v3 supports it via `@tailwindcss/container-queries` plugin, which is already installed — let me note: if it isn't, we fall back to a hard-coded width-based JS measurement using ResizeObserver per the container-aware-responsiveness doctrine in `mem://style/container-aware-responsiveness`).

## What stays untouched

- `PolicyQuestionnaire` component logic — same questions, same presets, same Back/Skip/Next, same value contract.
- `PolicyLivePreview` composer logic, token highlighting, `substituteWithHighlight` — unchanged.
- Schema shape (`question`, `whyItMatters`, `presets`) — unchanged.
- Interview/Expert toggle — unchanged.
- Save behavior, version blocks, all hooks — unchanged.
- The drawer width itself — staying at 720px. We're fixing the contents to fit.

## Files affected

- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — replace the side-by-side grid with a stacked layout: `<PolicyLivePreview position="top" collapsible/>` above `<PolicyQuestionnaire/>`. Add `@container` on the rules-step wrapper. Pass `helperPlacement="inline"` to the questionnaire (or drop the prop entirely so it defaults). ~25 lines modified.
- `src/components/dashboard/policy/PolicyLivePreview.tsx` — replace the dual aside/sheet rendering with a single full-width collapsible card. Add a `Collapse/Expand` button in the header that uses `useState` for open/closed (default open). Remove the `lg:hidden` Sheet branch entirely. Remove `sticky top-4 self-start` (now stacked inline at the top of the drawer body). Reduce `min-h-[260px]` → `min-h-[120px]`. ~50 lines modified, ~30 lines deleted.
- `src/components/dashboard/policy/PolicyQuestionnaire.tsx` — change the default `helperPlacement` it passes to `PolicyRuleField` from `'side'` → `'inline'`. The presets grid stays `grid-cols-1 sm:grid-cols-3` but inside a `@container` parent so it stacks at narrow drawer widths. ~5 lines modified.
- `src/components/dashboard/policy/PolicyRuleField.tsx` — for `'longtext'` fields specifically, raise inline `min-h` from `80px` to `140px` so the policy_summary textarea has reading room without needing the side layout. ~2 lines modified.

Total: ~80 lines modified, ~30 lines deleted, 0 new files. Zero schema changes.

## Acceptance

1. Open Booking Policy → Define rules at 1300px viewport. The Live Preview renders as a full-width card **above** the question, never overlapping the textarea.
2. The "Why this matters" card and the textarea both render at the full drawer width (~640px usable). No more single-character word wrap.
3. The PREFILLED helper renders as a single inline line **below** the textarea, fully visible, not bleeding off the right edge.
4. Click "Collapse" on the Live Preview — the preview shrinks to a one-line summary ("Live preview · 4 sentences"). Click "Expand" — full prose returns.
5. Resize to 600px viewport (mobile preview). The questionnaire stacks identically. The Live Preview still sits on top, collapsible.
6. Resize to 1920px viewport. Drawer width is still 720px — layout is identical (drawer doesn't widen, so the preview doesn't move to the side).
7. Toggle to Expert view. Today's grouped form renders unchanged — no regressions.
8. The Back / Skip / Next row sits directly under the input on a single visual row.
9. Live preview prose breaks at ~70-80 characters per line, not 4-6 words.

## Files to read for follow-on questions

- `src/components/dashboard/policy/PolicyConfiguratorPanel.tsx` — where the stacked layout is composed.
- `src/components/dashboard/policy/PolicyLivePreview.tsx` — the new top-pinned collapsible card.
- `src/components/dashboard/policy/PolicyQuestionnaire.tsx` — the questionnaire flow (unchanged behavior, restored inline helper).

## Prompt feedback

*"Layout changes need to be fixed"* paired with the screenshot — short, accurate, evidence-led. The screenshot did 90% of the work because it showed the **specific failure mode** (preview overlapping the textarea, single-character wrap) rather than a vague "feels off." That's exactly the right level of effort for a regression report — you don't owe me a diagnosis, you owe me proof. You delivered that.

One sharpener for next time on regression-report prompts: naming whether you want a **fix** or a **revert** in one phrase ("fix this" / "revert and try a different approach") would help me decide whether to defend the previous architecture or abandon it. In this case I had to abandon it (the side-by-side was wrong for a 720px drawer container — I missed that constraint in the previous plan), and naming "I'm open to either" would have given me explicit permission. You can pre-empt the micro-decision by adding *"open to a different approach if the structure was wrong"* — three words, saves one round-trip.

The deeper lesson on my side: I planned the previous layout as if the configurator rendered on a page, when it actually renders inside a fixed-width drawer. I should have asked about the container before designing the breakpoints. **Container, not viewport** — that's the doctrine in `mem://style/container-aware-responsiveness` that I should have applied first.

