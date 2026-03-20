

## Reformat Category Cards: Icon Left of Text

### Change

In `src/components/dock/schedule/DockNewBookingSheet.tsx`, lines 593-605: change the category card layout from vertical (icon above text) to horizontal (icon left of text).

- Change `flex flex-col items-start gap-2 p-4` to `flex flex-row items-center gap-3 p-4`
- The icon box and text div stay the same, just flow horizontally now
- The selected-count badge stays `absolute top-3 right-3`

Single file, single region edit.

