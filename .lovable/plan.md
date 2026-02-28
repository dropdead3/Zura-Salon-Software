

## Problem

In edit mode, every section is wrapped in `EditorSectionCard` which applies bento-card styling: `rounded-[20px]`, `shadow`, `border`, `bg-[hsl(0_0%_99%)]`, and `p-6/7/8` padding. Combined with `space-y-5` on the parent and `InsertionLine`'s fixed `h-6` height, this creates visible card separations between every section.

## Plan

### 1. Restyle EditorSectionCard — remove bento container look
Strip the rounded corners, shadow, border, and background from the wrapper. Keep the hover controls overlay (grip, eye, duplicate, delete) but render the section content edge-to-edge. The card becomes a transparent wrapper with hover-activated controls only.

Changes to `EditorSectionCard.tsx`:
- Remove: `rounded-[20px]`, `shadow-[...]`, `border border-border/40`, `bg-[hsl(...)]`
- Remove: conditional padding (`p-6 sm:p-7 lg:p-8`)
- Keep: `group`, `relative`, hover controls overlay, selection ring, opacity for disabled

### 2. Restyle InsertionLine — zero-height with hover expand
Make the insertion line take zero visible height by default and expand smoothly on hover so it doesn't create gaps between sections.

Changes to `InsertionLine.tsx`:
- Change from `h-6` to `h-0 group-hover/insert:h-8` with transition
- Keep the "+ Add Section" pill on hover

### 3. Remove parent spacing in PageSectionRenderer
Change the edit-mode container from `space-y-5` to `space-y-0` so sections sit flush against each other.

