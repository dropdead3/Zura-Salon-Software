

## Problem

Two issues create the "broken apart bento" appearance in the editor's Preview mode:

1. **Layout.tsx detection gap**: `getIsEditorPreview()` only checks `params.has('preview')`, missing `?mode=view`. So Preview mode falls through to the public-site footer-reveal layout with `rounded-b-[2rem]`, `shadow`, and `marginBottom: footerHeight` — creating a large outer container break.

2. **Section-level rounded containers**: Several sections apply `rounded-2xl` or `rounded-3xl` to their inner content blocks, creating visible bento-card separations between sections. The key offenders:
   - `BrandStatement.tsx` → `rounded-2xl` on the dark block
   - `NewClientSection.tsx` → `rounded-t-2xl` on the gradient card  
   - `ExtensionsSection.tsx` → `rounded-3xl` on the dark block

These rounded containers were intentionally styled to look like individual "Apple bento cards" floating within the page. The user wants sections to flow edge-to-edge without visible separations.

---

## Plan

### Step 1: Fix Layout.tsx editor detection
Update `getIsEditorPreview()` to also check `params.has('mode')` so that `?mode=view` routes into the simplified layout (no footer reveal, no rounded bottom, no shadow).

### Step 2: Remove bento rounding from BrandStatement
Change `rounded-2xl` to no rounding on the dark content block, making it full-width edge-to-edge within its section.

### Step 3: Remove bento rounding from NewClientSection
Change `rounded-t-2xl` to no rounding on the gradient card container.

### Step 4: Remove bento rounding from ExtensionsSection
Change `rounded-3xl` to no rounding on the dark content block.

### Step 5: Audit and verify
Check that these sections now flow seamlessly into each other without visible breaks or gaps in Preview mode.

