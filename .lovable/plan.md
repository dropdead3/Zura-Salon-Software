

## Wire Dirty State into SectionDisplayEditor

### Change: `src/components/dashboard/website-editor/SectionDisplayEditor.tsx`

1. Import `useEditorDirtyState` from `@/hooks/useEditorDirtyState`
2. Add `const isDirty = JSON.stringify(localConfig) !== JSON.stringify(data)` after the `localConfig` state initialization
3. Call `useEditorDirtyState(isDirty)`

This single change propagates Save button visibility to all editors that use `SectionDisplayEditor`: Gallery, Locations, Popular Services, Services Preview, Stylists Display, and any future section editors built on this pattern.

