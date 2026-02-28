

## Problem

The editor canvas iframe renders at a narrower viewport than the live front-end site. The logo uses responsive classes `h-8 lg:h-7` — at `<1024px` (editor iframe width) the logo is 32px, at `>=1024px` (live site) it's 28px. While the CSS sizes differ, the overall impression in the editor is that the logo appears smaller because the entire iframe is rendered in a narrower container. The header also shifts from `h-14` to `h-16` at the `lg` breakpoint, changing proportions.

The core fix is to unify the logo and header sizing so they're consistent regardless of viewport width.

## Plan

### 1. Normalize logo height in Header.tsx

Change the logo `<img>` class from `h-8 lg:h-7` to a single consistent `h-7` (28px). This ensures the same logo size whether viewed in the editor iframe or on the live site.

**Line 354**: `"h-8 lg:h-7 w-auto"` → `"h-7 w-auto"`

### 2. Normalize header row height

Change the header row from `h-14 lg:h-16` to a consistent `h-16` so the logo-to-header proportion stays the same at all widths.

**Line 338**: `"flex items-center justify-between h-14 lg:h-16 gap-4"` → `"flex items-center justify-between h-16 gap-4"`

Two single-class edits in `Header.tsx`.

