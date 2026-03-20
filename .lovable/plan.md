

## Add Secondary "+ Add Another Service" Button to Confirm Footer

### Change

In `src/components/dock/schedule/DockNewBookingSheet.tsx`, add a secondary button in the confirm step footer (lines 902-922) above the "Confirm Booking" button.

- Add a `rounded-full` outline/ghost button styled with a dashed or transparent border and violet text: `+ Add Another Service`
- On tap, calls `onAddService` (already wired) which navigates back to the service categories
- Placed between the price summary and the "Confirm Booking" button
- Style: full-width, `rounded-full`, transparent bg with violet text, matching the dock visual identity

### Layout
```text
┌─────────────────────────────────────┐
│  Estimated Total              $85   │
│  [ + Add Another Service ]  (outline)│
│  [    Confirm Booking    ]  (violet) │
└─────────────────────────────────────┘
```

Single file, single region edit (~lines 907-908).

