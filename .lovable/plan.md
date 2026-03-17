

# Sticky Save Footer + Unsaved Changes Warning — BusinessSettingsDialog

## What changes

**1. Dirty state detection**
Compare `formData` against the initial values loaded from `settings` using a `useMemo` to derive an `isDirty` boolean. This drives both the sticky footer visibility and the warning toast.

**2. Sticky footer bar**
Move the Cancel/Save buttons out of the scrollable form area into a sticky footer that:
- Is always pinned to the bottom of the dialog
- Only appears when `isDirty` is true (slides up with a subtle animation)
- Has a frosted-glass background (`bg-background/80 backdrop-blur`) with a top border
- Contains the same Cancel + Save Changes buttons

**3. Unsaved changes warning toast**
When the user tries to close the dialog (via `onOpenChange(false)`) while `isDirty` is true, intercept the close and show a warning toast via `sonner` with "You have unsaved changes" and an action button to "Discard & Close" that actually closes.

## Implementation details

**File: `BusinessSettingsDialog.tsx`**

- Add `initialFormData` ref that captures the settings snapshot on load
- Derive `isDirty` by deep-comparing `formData` vs `initialFormData`
- Restructure the `DialogContent` layout:
  - Scrollable area: `overflow-y-auto flex-1` for the form content
  - Sticky footer: `sticky bottom-0` div with the buttons, shown when dirty
- Wrap `onOpenChange` to intercept close when dirty → show warning toast
- Remove the old inline button row at the bottom of the form

Single file change, no new files needed.

