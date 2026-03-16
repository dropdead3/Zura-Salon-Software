

# Remove Price from Subscribe Button & Make It Sticky

## Changes (`BackroomPaywall.tsx`)

### 1. Remove price from CTA button (line 388)
Change the button text from `Subscribe — {formatCurrency(monthlyTotal)}/mo` to just `Subscribe` (keeping Lock and ArrowRight icons).

### 2. Make the CTA sticky within the calculator card
Move the Button, guarantee text, and validation message **outside** the scrollable `calculatorContent` div, and into the sticky card wrapper so they pin to the bottom of the card regardless of scroll position.

- In the `calculatorContent` block (~lines 380-414): remove the CTA Button, CheckoutConfirmDialog, validation message, and guarantee line.
- In the desktop sticky sidebar (~line 1033): after `{calculatorContent}`, add a bottom-pinned section with the button, dialog, validation, and guarantee text. Use `mt-4 pt-4 border-t border-border/30` for separation.
- In the mobile expanded sheet (~line 1057): same — append the CTA after `{calculatorContent}`.
- Adjust the sticky card to use `flex flex-col` and give the calculator content `flex-1 overflow-y-auto` so the button stays anchored at the bottom when the card content overflows.

