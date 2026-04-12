

# Fix Platform Accounts Page — Button & Page Explainer

## Problems

1. **PageExplainer inside PlatformButton**: Line 166 places `<PageExplainer pageId="platform-accounts" />` *inside* the `<PlatformButton>` JSX, between the Plus icon and "New Account" text. This causes the explainer to render as a child of the button, creating the visual overlap seen in the screenshot.

2. **Page Explainers don't belong on platform pages**: Per governance rules, Page Explainers are an organization dashboard feature. Platform admin pages should not include them.

## Fix

**File:** `src/pages/dashboard/platform/Accounts.tsx`

- Delete line 166 (`<PageExplainer pageId="platform-accounts" />`) entirely
- Remove the `PageExplainer` import (line 56)

This restores the button to its correct layout (`<Plus icon> New Account`) and removes the misplaced explainer from the platform page.

| File | Change |
|---|---|
| `src/pages/dashboard/platform/Accounts.tsx` | Remove PageExplainer import and usage (lines 56, 166) |

