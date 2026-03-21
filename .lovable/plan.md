

## Remove Custom Cursor

Delete the `CustomCursor` component and all references to it.

### Changes

1. **Delete** `src/components/ui/CustomCursor.tsx`
2. **Update** `src/App.tsx` — remove the `<CustomCursor />` usage and its import
3. **Clean up** any CSS related to the custom cursor (the `cursor: none` styles applied globally when the custom cursor is active, and the `dashboard-cursor` class handling)

