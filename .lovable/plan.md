
# Website Editor — Full UX Overhaul

## The core problem

The current editor stuffs three things into the dashboard column (sidebar + form + preview), so the preview iframe gets ~30% width (~400–500px). At that width:

- **Desktop view is a lie** — the iframe is 500px wide, so the site renders its mobile/tablet breakpoint, not desktop.
- **Tablet doesn't exist** — only Desktop/Mobile toggles.
- **Mobile is fake** — a 390px box inside an already-narrow panel, no device chrome, no scaling.
- The preview competes with the sidebar and form for space, and the dashboard chrome (page header, top nav, tabs) eats vertical room → the iframe is short and clipped.

The fix is structural, not cosmetic: the editor needs its own full-viewport workspace with a true scaled preview.

## What we'll build

### 1. Promote the editor to a full-workspace layout

When the user enters Theme → Customize (editor mode), replace the dashboard chrome with a dedicated workspace that fills the viewport:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ ← Back   Drop Dead Salons / Home / Hero Section          [Save] [Publish] │  ← thin top bar (48px)
├──────────┬─────────────────────────────────┬──────────────────────────────┤
│          │                                 │  Desktop  Tablet  Mobile  ⟳  │  ← preview toolbar
│ Sections │   Editor form (Hero Section)    ├──────────────────────────────┤
│ list     │                                 │                              │
│          │   Eyebrow text  [____________]  │   ┌────────────────────┐     │
│ • Hero   │   Headline      [____________]  │   │  Scaled iframe     │     │
│ • About  │   Subheadline   [____________]  │   │  rendered at       │     │
│ • ...    │   ...                           │   │  TRUE viewport     │     │
│          │                                 │   │  (1440 / 834 / 390)│     │
│  (260px) │   (flexible, ~480px min)        │   │  then scaled to    │     │
│          │                                 │   │  fit pane          │     │
│          │                                 │   └────────────────────┘     │
│          │                                 │   1440 × 900 · 67% scale     │
└──────────┴─────────────────────────────────┴──────────────────────────────┘
```

Three resizable panes (`ResizablePanelGroup`, already in use):
- **Sections sidebar** — 260px default, collapsible to icon rail
- **Editor form** — flexible, holds the section editor
- **Preview pane** — flexible, holds the device-frame iframe

The whole workspace is `h-screen w-screen fixed inset-0 z-50` so dashboard chrome doesn't steal vertical space. "Back" returns to the Website Hub overview.

### 2. True-viewport scaled preview (the key fix)

This is the part that solves the "doesn't show desktop accurately" problem.

The iframe always renders at the **real** viewport width for the chosen device — never at the pane width. We then CSS-scale it to fit the pane:

| Device  | Iframe size      | Behavior                          |
|---------|------------------|-----------------------------------|
| Desktop | 1440 × 900       | Scales down to fit pane width     |
| Tablet  | 834 × 1194       | Portrait iPad, with device chrome |
| Mobile  | 390 × 844        | iPhone 14, with device chrome     |
| Fit     | 100% of pane     | Fluid, for quick edits            |

Implementation:

```tsx
// inside the preview pane
const targetWidth  = DEVICE[device].w;   // e.g. 1440
const targetHeight = DEVICE[device].h;   // e.g. 900
const scale = Math.min(paneW / targetWidth, paneH / targetHeight, 1);

<div
  style={{
    width:  targetWidth,
    height: targetHeight,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  }}
>
  <iframe src={previewUrl} style={{ width: '100%', height: '100%' }} />
</div>
```

Pane width is observed with `ResizeObserver` (we already have `useContainerSize` in `src/lib/responsive/`), so the scale recomputes when the user drags the splitter. A small footer shows "1440 × 900 · 67%".

### 3. Device frame chrome

For Tablet/Mobile, wrap the scaled iframe in a subtle device bezel (rounded corners, thin border, notch indicator for mobile). Desktop shows a browser chrome strip ("○ ○ ○  drop-dead-salons.com/"). Adds realism and makes the scale obvious.

### 4. Preview toolbar (top of preview pane)

- Device segmented control: **Desktop · Tablet · Mobile · Fit**
- Orientation toggle (portrait/landscape) — tablet/mobile only
- Zoom badge: "67%" (click to cycle 50% / 75% / 100% / Fit)
- Refresh, Copy URL, Open in new tab
- "Reload after save" toggle (auto-refresh on data save, on by default)

### 5. Sections sidebar improvements

- Page selector stays at top
- Sections list becomes a true left rail with section icons + labels
- Active section highlights, clicking scrolls the iframe to that section (already wired via `PREVIEW_SCROLL_TO_SECTION`)
- Collapsible to a 56px icon rail to give the form/preview more room

### 6. Keyboard + ergonomics

- `⌘/Ctrl + \` toggles sidebar
- `⌘/Ctrl + .` toggles preview pane
- `⌘/Ctrl + 1/2/3` switches Desktop/Tablet/Mobile
- `Esc` exits editor back to hub
- Splitter positions persisted to localStorage per user

### 7. Mobile (operator on a phone/tablet)

On viewports < 1024px, the workspace becomes tabbed: **Sections | Editor | Preview** as a bottom tab bar instead of three columns. Same components, different layout shell.

## Files to change

| File | Change |
|------|--------|
| `src/components/dashboard/website-editor/LivePreviewPanel.tsx` | Replace contents: add device presets (Desktop/Tablet/Mobile/Fit), scaled iframe, ResizeObserver, orientation, device chrome, zoom badge |
| `src/components/dashboard/settings/WebsiteSettingsContent.tsx` | When `mode === 'editor'`, render a new `WebsiteEditorWorkspace` instead of the inline `ResizablePanelGroup`. Move the editor switch logic into the new workspace. |
| `src/components/dashboard/website-editor/WebsiteEditorWorkspace.tsx` *(new)* | Full-viewport shell: top bar, three resizable panes, mobile tab fallback, keyboard shortcuts, persisted layout |
| `src/components/dashboard/website-editor/PreviewDeviceFrame.tsx` *(new)* | Bezel/chrome wrapper for desktop/tablet/mobile |
| `src/hooks/usePreviewDevice.ts` *(new)* | Device + orientation + zoom state, persisted to localStorage, exposes presets |
| `src/components/dashboard/admin/WebsiteHub.tsx` | Mount the workspace as a portal/overlay when entering editor mode so it escapes the DashboardLayout chrome |

No DB or backend changes. Pure UI/layout refactor — same `previewUrl`, same `site_settings`, same postMessage protocol.

## Technical notes

- **Why scaling vs. responsive resize**: scaling guarantees the iframe receives a 1440px window and renders the actual desktop layout. Resizing the iframe to 500px would just trigger the site's responsive breakpoints — which is exactly the bug today.
- **Performance**: CSS transform `scale()` is GPU-composited, no layout thrash on splitter drag. ResizeObserver is debounced to a single rAF.
- **Iframe reload behavior**: device switch does NOT reload the iframe (only changes outer dimensions + transform). Only the manual refresh button or save events trigger reload.
- **Org route preview URL** (`/org/drop-dead-salons?preview=true&mode=view`) is unchanged and continues to work — the workspace is purely a better presentation layer around it.
- **Brand/typography**: top bar uses `font-display` uppercase per UI canon; toolbar uses `tokens.button.inline`; pane backgrounds use `bg-muted/30` with `rounded-xl` per Bento Card System.

## Out of scope (future phases)

- Inline click-to-edit inside the preview iframe (would require a full overlay protocol)
- Undo/redo history per section
- Version compare (current vs. published)
- Multi-device side-by-side view

## Prompt feedback

Strong prompt: you named the symptom ("preview doesn't show desktop/tablet/mobile accurately") and the scope ("entirety of the edit website feature"), which let me focus on the structural fix instead of guessing.

To get even sharper plans next time, try adding:
1. **Priority signal** — "the preview accuracy is the #1 fix; layout polish is secondary" tells me where to invest detail.
2. **Constraint hints** — e.g. "must still live inside the dashboard" vs. "okay to take over the full screen" (I assumed the latter, which unlocks the real fix).
3. **Reference behavior** — "like Framer / Webflow / Shopify theme editor" instantly anchors the target UX.

Example upgrade: *"The Website Editor preview doesn't render desktop/tablet/mobile accurately because it's squeezed into the dashboard column. Redesign it as a full-screen workspace (Framer-style) where the preview iframe always renders at true device width and is scaled to fit. Preview accuracy is the priority."*
