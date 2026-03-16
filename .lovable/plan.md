

# Move Unlock Button to Page Top-Right, Remove Floating Banner

## Changes (`BackroomPaywall.tsx`)

### 1. Remove the floating bottom banner
Delete the entire fixed bottom banner block (lines 993–1057), including the `BackroomCheckoutConfirmDialog` inside it.

### 2. Add an inline header row with the Unlock button
At the top of the page content (around line 386, inside `max-w-5xl`), add a flex row before the hero section that places the "Unlock Zura Backroom" button in the top-right corner:

```text
┌──────────────────────────────────────────────────────┐
│                                    [🔒 Unlock Zura Backroom →] │
│                                                                │
│                    [Hero / rest of page]                        │
└──────────────────────────────────────────────────────┘
```

- Use `flex justify-end` wrapper with the existing `Button` (rounded-full, with Lock + ArrowRight icons).
- Move `BackroomCheckoutConfirmDialog` adjacent to this button.
- Keep the `confirmDialogOpen` state and `handleCheckout` logic as-is.

### 3. Remove bottom spacer
Delete the `h-24` spacer div (around line 991) that was added for the floating bar.

### File
- `src/components/dashboard/backroom-settings/BackroomPaywall.tsx`

