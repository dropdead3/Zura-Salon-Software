

# Add `lazyWithRetry` Wrapper for Resilient Dynamic Imports

## Problem
Transient Vite dev-server 503/timeout errors during module transformation cause `React.lazy` to throw unrecoverable errors, resulting in blank screens. Once a dynamic import fails, React has no built-in retry mechanism.

## Solution
Create a `lazyWithRetry` utility that wraps `React.lazy` with automatic retry logic (exponential backoff, 3 attempts). Then replace all `lazy()` calls in `App.tsx` with `lazyWithRetry()`.

## Implementation

### Step 1: Create `src/lib/lazyWithRetry.ts`
- Export a `lazyWithRetry` function with the same signature as `React.lazy`
- On import failure, retry up to 3 times with 1s → 2s → 4s delays
- On final failure, force a page reload (clears stale module cache) unless already reloaded
- Uses `sessionStorage` flag to prevent infinite reload loops

### Step 2: Update `App.tsx`
- Replace `import { lazy } from "react"` usage with `import { lazyWithRetry } from "@/lib/lazyWithRetry"`
- Find-and-replace all `lazy(() =>` calls (~80+) with `lazyWithRetry(() =>`
- No other changes needed — the function returns the same `React.LazyExoticComponent` type

## Technical Details
- Zero impact on bundle size or runtime behavior when imports succeed on first try
- The retry + reload pattern is a well-established production practice for SPAs
- `sessionStorage` key (e.g. `"lazyRetryReloaded"`) prevents infinite reload loops
- Compatible with existing `<Suspense>` boundary and `ErrorBoundary`

