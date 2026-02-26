

## Fix: Enable Scrolling in Editor Canvas Preview

### Problem

The editor's live preview iframe cannot be scrolled to see the full site. The user sees the Header and some sections but can't scroll down to view all content.

### Root Cause

In `src/components/layout/Layout.tsx` (line 98), the main content wrapper has `overflow-hidden`:

```tsx
<div 
  className="relative z-10 flex flex-col min-h-screen bg-background rounded-b-[2rem] md:rounded-b-[3rem] shadow-[...] overflow-hidden"
  style={{ marginBottom: footerHeight }}
>
```

This `overflow-hidden` is needed for the public site to clip content cleanly against the rounded bottom corners and the fixed-footer reveal effect. However, inside the editor preview iframe, this creates a scrolling conflict:

- The iframe viewport is smaller than the full page
- The div has `min-h-screen` (which resolves to the iframe's viewport height)
- Content is longer than the iframe viewport
- `overflow-hidden` clips that excess content
- The fixed footer architecture adds `marginBottom: footerHeight`, pushing content further

Additionally, the `CanvasPanel.tsx` canvas surface container (line 134) uses `overflow-hidden` with padding (`p-6 lg:p-8`), which reduces the iframe's visible area and clips its edges.

### Fix

Two targeted changes:

#### 1. `src/components/layout/Layout.tsx`
When in editor preview mode (`?preview=true`), remove `overflow-hidden` from the main content wrapper and disable the fixed footer reveal effect (since the user doesn't need to see the footer reveal animation in the editor). This allows the iframe document to scroll naturally.

- Detect `isEditorPreview` via `?preview` URL param (same pattern used in `PageSectionRenderer`)
- When in preview mode:
  - Remove `overflow-hidden` from the main content wrapper
  - Remove `rounded-b-*` (no need for rounded corners in editor)
  - Remove `marginBottom: footerHeight` (no fixed footer reveal)
  - Hide the fixed `<Footer />` element entirely (not needed in editor)
  - Keep the `<FooterCTA />` visible (it's part of the content flow)
- Public site rendering remains completely unchanged

#### 2. `src/components/dashboard/website-editor/panels/CanvasPanel.tsx`
Change the canvas surface container from `overflow-hidden` to `overflow-auto` to allow the preview frame to fill the full available space without clipping. Also remove the padding (`p-6 lg:p-8`) when in desktop mode so the iframe gets maximum space — or reduce it to minimal padding.

Actually, the iframe scrolls internally so the outer container padding is fine. The key change is ensuring the iframe container fills the available height properly. Currently `items-start` aligns the frame to the top which is correct. The `overflow-hidden` on this container is fine because the iframe handles its own scrolling — the real fix is inside the iframe (Layout.tsx).

### Files

| File | Change |
|---|---|
| `src/components/layout/Layout.tsx` | In preview mode: remove `overflow-hidden`, disable fixed footer, remove `marginBottom` |

One file. The iframe scrolls internally — the fix is inside the rendered content, not the iframe container.

### Technical Detail

The `isEditorPreview` detection uses the same module-level pattern already established in `PageSectionRenderer.tsx`:

```tsx
const isEditorPreview = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('preview');
```

In preview mode, the Layout simplifies to:
```tsx
// No fixed footer, no overflow-hidden, no bottom margin
<div className="relative z-10 flex flex-col min-h-screen bg-background">
  <Header />
  <main className="flex-1 bg-background">
    <PageTransition>{children}</PageTransition>
  </main>
  <FooterCTA />
</div>
```

Public site layout remains completely untouched.

