

# Fix FAQ Accordion Trigger Typography

## Problem

The FAQ question text in the AccordionTrigger elements is inheriting `font-medium` from the base accordion component and appears to have unwanted letter-spacing (kerning). Per the UI canon, these are body-level text elements and should use Aeonik Pro (`font-sans`) with no tracking or extra kerning.

## Change

**File:** `src/pages/dashboard/platform/CapitalKnowledgeBase.tsx`

Update all six `AccordionTrigger` className values (lines 205, 213, 221, 229, 237, 245) to explicitly set `font-sans tracking-normal` — ensuring Aeonik Pro renders with no extra letter-spacing.

Current:
```
className="text-sm text-[hsl(var(--platform-foreground))] hover:no-underline"
```

Updated:
```
className="font-sans tracking-normal text-sm text-[hsl(var(--platform-foreground))] hover:no-underline"
```

Also check the FAQ section title (line 200) — `PlatformCardTitle` already uses `font-display` via its component styling, which is correct for section headers. No change needed there.

| File | Change |
|---|---|
| `src/pages/dashboard/platform/CapitalKnowledgeBase.tsx` | Add `font-sans tracking-normal` to all 6 AccordionTrigger classNames |

