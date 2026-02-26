

## Fix: Reduce Navbar Height

### Problem
The navbar is too tall. The main content row uses `h-16 lg:h-20` (64px / 80px), and the scrolled state adds extra top padding (`pt-4 md:pt-6 lg:pt-8`), making the overall header feel oversized.

### Current Values (line 338)
```
h-16 lg:h-20  →  64px mobile / 80px desktop
```

Logo height (line 354): `h-12 lg:h-10` → 48px mobile / 40px desktop — also oversized for the container.

Scrolled padding (line 309): `pt-4 md:pt-6 lg:pt-8` → up to 32px extra top padding when scrolled.

### Fix

**File: `src/components/layout/Header.tsx`**

| Line | Current | Fixed | Reason |
|------|---------|-------|--------|
| 338 | `h-16 lg:h-20` | `h-14 lg:h-16` | Reduce row height: 56px mobile / 64px desktop |
| 309 | `pt-4 md:pt-6 lg:pt-8` | `pt-3 md:pt-4 lg:pt-5` | Less top padding when scrolled |
| 354 | `h-12 lg:h-10` | `h-8 lg:h-7` | Scale logo down proportionally |
| 343 | `h-12` (logo link height) | `h-8` | Match reduced logo size |

This brings the navbar closer to a standard ~56-64px height, consistent with the reference screenshot showing a compact, elegant header.

