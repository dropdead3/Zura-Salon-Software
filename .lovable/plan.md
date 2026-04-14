

## Problem

The "Readers auto-update within ~10 minutes of upload." notice is styled as tiny `text-[10px] text-muted-foreground` — identical to the dimensions hint above it. It blends into the background and users miss that there's a delay before changes appear on their readers.

## Solution

Promote this line into a small inline callout with a clock icon and slightly stronger styling so it reads as a meaningful status note rather than fine print.

### Changes (single file: `SplashScreenUploader.tsx`)

**Replace** the plain `<p>` at line 511-513 with a styled inline callout:

- Add a `Clock` icon (from lucide-react) at `w-3.5 h-3.5`
- Wrap in a `flex items-center gap-1.5` container
- Use `text-xs` instead of `text-[10px]` for slightly larger text
- Apply `text-amber-600 dark:text-amber-400` to differentiate it from the dimensions hint
- Add a subtle `bg-amber-50 dark:bg-amber-500/10 rounded-md px-2.5 py-1` pill background so it reads as a notice, not fine print

Result will look like: `🕐 Readers auto-update within ~10 minutes of upload.` in a soft amber pill — visible without being alarming, consistent with the amber activation checklist styling already on this page.

