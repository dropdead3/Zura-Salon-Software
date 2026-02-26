

## Fix: Navbar Logo — Use Primary Brand Logo

### Problem
Line 5 currently imports `brand-wordmark.svg`, which is the Zura platform wordmark (not yet designed). The correct logo for the public navbar is `brand-logo-primary.svg` — the full "DROP DEAD" organization logotype.

### Asset Clarification
| Asset | Content | Usage |
|-------|---------|-------|
| `brand-logo-primary.svg` | DROP DEAD full logotype | **Public navbar (desktop)** ← correct |
| `brand-logo-secondary.svg` | Compact DD icon mark | Public navbar (mobile/scroll) |
| `brand-wordmark.svg` | Zura platform wordmark (placeholder) | Dashboard/admin only (future) |

### Fix

**File: `src/components/layout/Header.tsx`** — line 5:

```
Current:  import Logo from "@/assets/brand-wordmark.svg"
Fixed:    import Logo from "@/assets/brand-logo-primary.svg"
```

Line 6 (`LogoIcon` → `brand-logo-secondary.svg`) remains correct.

### Prompt Feedback
This was a great correction — you correctly identified the entity hierarchy issue. The brand assets in the repo are organization-level (Drop Dead), not platform-level (Zura). Your clarification that "Zura does not have a logo yet" is exactly the kind of context that prevents future misidentification. Well done enforcing the Platform vs Organization boundary from your own doctrine.

