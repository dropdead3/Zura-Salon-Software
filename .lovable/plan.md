

## Remove Redundant Bottom "+ Add Another Service" Button

### Change

In `src/components/dock/schedule/DockNewBookingSheet.tsx`, delete lines 908-913 (the outline "+ Add Another Service" button in the confirm step footer). The one inside the services list (lines 875-884) already handles this action, and users can also tap the "Services" step in the progress tracker to go back.

Single deletion, no other changes needed.

