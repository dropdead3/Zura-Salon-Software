## Problem

In the screenshot, the Unsaved Changes dialog feels cramped: the title "UNSAVED CHANGES" hugs the top-left, and the three action buttons (Stay here / Discard changes / Save & continue) sit tight against the right edge with minimal breathing room between them. Current padding is `p-8` (32px) and footer button gap is `space-x-2` (8px).

## Fix

Single file: `src/components/ui/unsaved-changes-dialog.tsx`.

- Bump container padding `p-8` → `p-10` (32px → 40px) on all sides for noticeably more breathing room around title, body, and buttons.
- Bump container `gap-4` → `gap-6` (16px → 24px) to add vertical separation between the header block and the footer button row.
- Bump header internal spacing `space-y-2` → `space-y-3` so the title and body copy don't feel stacked.
- Bump button-to-button spacing `sm:space-x-2` → `sm:space-x-3` (8px → 12px) so Discard / Save have a clearer beat between them.
- Add `pt-2` on the footer row for a touch of extra air above the buttons.
- Bump the two helper-line top margins from `mt-1.5` → `mt-2` to match the airier rhythm.

No structural or behavioral changes — purely spacing.

## Visual result

```text
┌──────────────────────────────────────────┐
│                                          │
│   UNSAVED CHANGES                        │
│                                          │
│   You have unsaved edits in this         │
│   section. Save them as a draft first,   │
│   or discard and continue.               │
│                                          │
│   Drafts stay private until you Publish  │
│                                          │
│   Press Esc to stay on this section.     │
│                                          │
│         Stay here   Discard   Save       │
│                                          │
└──────────────────────────────────────────┘
```

(40px ring of padding, 24px between header & footer, 12px between buttons)
