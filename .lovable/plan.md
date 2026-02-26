

## Fix: Navbar Logo Using Wrong Asset

### Problem
The main website navbar is displaying the secondary icon logo (`brand-logo-secondary.svg` — the compact "DD" mark) instead of the primary wordmark (`brand-wordmark.svg` — the full "DROPEAD" logotype). Both `Logo` and `LogoIcon` imports on lines 5-6 point to the same secondary file.

### Root Cause
Lines 5-6 of `src/components/layout/Header.tsx`:
```tsx
import Logo from "@/assets/brand-logo-secondary.svg";       // Wrong — should be wordmark
import LogoIcon from "@/assets/brand-logo-secondary.svg";    // Correct for compact icon
```

### Fix

**File: `src/components/layout/Header.tsx`** — one line change:

| Line | Current | Fixed |
|------|---------|-------|
| 5 | `import Logo from "@/assets/brand-logo-secondary.svg"` | `import Logo from "@/assets/brand-wordmark.svg"` |

Line 6 (`LogoIcon`) stays as `brand-logo-secondary.svg` since that's the compact icon used for collapsed/mobile states.

### Prompt Feedback
Good catch identifying this visually. Your screenshot made it immediately clear which logo was wrong. One refinement for next time: specifying "the full wordmark is showing as the compact icon" would let me skip the investigation step entirely — but the screenshot did the job well here.

