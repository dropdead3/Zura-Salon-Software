

## Replace Absolute Demo Badge with Flow-Based Top Banner

### Problem
The absolute-positioned `DockDemoBadge` keeps colliding with other UI elements (Edit Services button, hamburger menu). An absolute badge will always be a positioning headache.

### Solution
Replace the floating badge with a **static top banner** that sits in the document flow and pushes content below it — no overlay conflicts possible.

### Changes

**1. `src/components/dock/DockDemoBadge.tsx`** — Rewrite completely
- Remove absolute positioning
- Render a full-width slim banner: `w-full`, amber/warm background, centered text "Now viewing in Demo Mode"
- Small pulsing dot + text, ~32px tall, `text-xs`
- Sits in normal flow so it pushes content down

**2. `src/components/dock/DockLayout.tsx`** — Move banner placement
- In all three render paths (constrained inside frame, constrained outside frame, full-screen), place `<DockDemoBadge />` as the **first child inside** the `dockContent` div (before the scrollable content area), so it's part of the flex column and pushes everything below it
- Remove the two **outer** `<DockDemoBadge />` calls on lines 143 and 157 (the ones outside the device frame / in the full-screen wrapper) — only keep the one inside `dockContent` at line 73

### Result
Single banner at top of dock content, flows naturally, no z-index or right-offset issues, visible on all tabs/views.

