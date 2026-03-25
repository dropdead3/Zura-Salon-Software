

## Fix DockBowlActionSheet to Slide Top-Down

The action sheet currently slides up from the bottom, violating the Dock design system. All Dock sheets must slide down from the top per `DOCK_SHEET.panel` token.

### Changes — `src/components/dock/mixing/DockBowlActionSheet.tsx`

**1. Sheet positioning**: Change from `bottom-0 border-t rounded-t-2xl` to use `DOCK_SHEET.panel` token (`top-0 border-b rounded-b-2xl`)

**2. Animation direction**: Flip `y: '100%'` → `y: '-100%'` for initial/exit (slides down from top, exits back up)

**3. Drag handle**: Move from top of content to bottom (using `DOCK_SHEET.dragHandleWrapperBottom`) since the sheet hangs from the top

**4. Content order**: Reorder so title comes first, action buttons next, drag handle at the bottom

### One file changed
`src/components/dock/mixing/DockBowlActionSheet.tsx`

