

# Make Checkout Confirm Dialog Responsive

The dialog uses a fixed `sm:max-w-[440px]` and has no scroll handling, so on smaller screens or shorter viewports the content overflows and gets clipped.

## Changes (`BackroomCheckoutConfirmDialog.tsx`)

1. **Line 47** — Update `DialogContent` className:
   - Change to `max-w-[95vw] sm:max-w-[440px]` for horizontal responsiveness
   
2. **Line 55** — Make the content area scrollable:
   - Add `max-h-[70vh] overflow-y-auto` to the main `space-y-4` container so content scrolls on short viewports

3. **Text sizing** — Add responsive text on the grand total display:
   - Line 126: Change `text-lg` to `text-base sm:text-lg` on the monthly total amount

4. **Actions** — Line 170: Change `flex justify-end` to `flex flex-col sm:flex-row sm:justify-end` so buttons stack on very narrow screens, with `w-full sm:w-auto` on each button

