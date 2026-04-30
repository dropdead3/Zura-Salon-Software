# Auto-scroll Live Preview to Active Section

## Positive feedback on your prompt

This was a strong prompt: you described the trigger (clicking a rail item), the expected outcome (preview auto-scrolls to that section), and framed it as a problem to solve rather than dictating an implementation. That gives me room to find the real root cause instead of patching a symptom.

**Even better next time:** add the observed behavior alongside the expected one — e.g. "currently nothing happens" vs "it scrolls to the wrong section" vs "it works for built-ins but not custom sections". That narrows the diagnostic surface immediately and avoids me having to test every branch.

## Root cause

The scroll pipeline is fully built and only broken at one seam:

```text
SectionNavItem click
   -> onTabChange(tab)               [sidebar]
   -> editorTab state changes        [shell]
   -> effect resolves activeSectionId
   -> window.postMessage(...)        <-- broadcasts to PARENT window
                                         but LivePreviewPanel never listens
   -> LivePreviewPanel.activeSectionId prop is NEVER PASSED
   -> iframe.postMessage(PREVIEW_SCROLL_TO_SECTION) never fires
```

Specifically:
- `WebsiteEditorShell.tsx:1314` renders `<LivePreviewPanel previewUrl={...} />` with **no `activeSectionId` prop**.
- The shell's effect at line 894 broadcasts via `window.postMessage` to itself, but `LivePreviewPanel` only reacts to its prop, not to window messages.
- The iframe-side listener in `src/components/home/PageSectionRenderer.tsx` is correct and tags DOM nodes with `id="section-${section.id}"`.

## Plan

**1. Lift `activeSectionId` resolution into shell render scope and pass it as a prop.**

In `WebsiteEditorShell.tsx`:
- Replace the broadcast effect (lines 893–913) with a `useMemo` that returns the resolved `activeSectionId` from `editorTab` + `selectedPage` + `pagesConfig` using the existing logic.
- Pass it: `<LivePreviewPanel previewUrl={...} activeSectionId={activeSectionId} />`.
- Keep the `window.postMessage` broadcast as a secondary signal only if anything else listens (search confirms nothing does — safe to remove).

**2. Confirm the iframe receives the message at the right origin.**

`LivePreviewPanel` already posts `PREVIEW_SCROLL_TO_SECTION` to `previewOrigin` once `iframeReadyRef` is true, and queues it via `pendingSectionRef` if the iframe is still loading. No change needed.

**3. Handle initial load.**

When the editor first opens with a default tab (e.g. `hero`), the memo will resolve to that section's id, the prop will fire on first render, and the queued message will deliver after `onLoad`. This means the preview will land on the active section immediately, not just on subsequent clicks.

**4. Custom-section-on-non-home-page edge case.**

The current resolver searches `selectedPage.sections` then falls back to `home`. That's correct for custom sections — they live on the page that owns them. No change needed.

## Verification

After implementation, in the browser:
- Open the Website Editor, click "Brand Statement" in the rail → preview smoothly scrolls to that section and briefly highlights it.
- Click "Testimonials", "Partner Brands", a custom section → same.
- Switch to a non-home page, click a section there → preview navigates and scrolls.
- Reload the editor → preview lands on the currently-active section without an extra click.

## Files to edit

- `src/components/dashboard/website-editor/WebsiteEditorShell.tsx` — replace effect with memo, pass prop.

That's the entire fix. One file, ~15 line delta.

## Enhancement suggestions (optional, for after this lands)

- **Visual confirmation in the rail.** When the iframe scrolls past a section, post a reverse `PREVIEW_VISIBLE_SECTION` message (IntersectionObserver in the renderer) so the rail can highlight whichever section the user has scrolled to inside the preview. Closes the loop both ways.
- **Scroll offset for sticky headers.** If the published site has a sticky nav, `scrollIntoView` will hide the section's top under it. Add a `scroll-margin-top` to the section wrapper or compute an offset in the renderer's scroll handler.
- **Reduced-motion respect.** Swap `behavior: 'smooth'` for `'auto'` when the iframe's `window.matchMedia('(prefers-reduced-motion: reduce)')` matches.
