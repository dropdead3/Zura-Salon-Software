

## Problem

The amber "Readers auto-update within ~10 minutes of upload." notice has `w-fit` which makes it shrink to content width and left-aligns within the parent. It needs to be centered.

## Solution

**File:** `src/components/dashboard/settings/terminal/SplashScreenUploader.tsx` (line 572)

Change `w-fit` to `mx-auto w-fit` on the amber notice div so it centers within the `text-center` parent container.

