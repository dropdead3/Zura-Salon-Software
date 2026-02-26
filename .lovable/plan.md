

## Scrollbar Standards Enforcement

### Problem
Several scrollable containers in the website editor use raw `overflow-auto` or `overflow-y-auto` instead of the tokenized `ScrollArea` component or the `scrollbar-thin` utility class. This causes visible scrollbar track backgrounds and always-visible scrollbars, violating the design standard of: no track background, thumb visible only on hover.

### Affected Files

| File | Line | Current | Fix |
|------|------|---------|-----|
| `AddSectionDialog.tsx` | 81 | `overflow-auto` on `DialogContent` | Replace with `ScrollArea` wrapper inside dialog, remove `overflow-auto` |
| `TemplatePicker.tsx` | 43 | `overflow-auto` on `DialogContent` | Replace with `ScrollArea` wrapper inside dialog, remove `overflow-auto` |
| `ServicesContent.tsx` | 580 | `overflow-y-auto` on `DialogContent` | Replace with `ScrollArea` wrapper inside dialog, remove `overflow-y-auto` |
| `EditorSkeletons.tsx` | 97 | `overflow-auto` on canvas skeleton | Add `scrollbar-thin` class alongside `overflow-auto` |

### Approach

For dialog content containers, the cleanest fix is to:
1. Remove `overflow-auto` / `overflow-y-auto` from the `DialogContent` className
2. Wrap the dialog body content (below `DialogHeader`) in a `ScrollArea` with `max-h` constraint
3. The `ScrollArea` component already uses tokenized scrollbar styles (transparent track, hover-only thumb via `group-hover/scroll:opacity-100`)

For the skeleton loader, simply add `scrollbar-thin` to ensure the native scrollbar follows the tokenized pattern.

### Design Standard (Reference)
From `design-tokens.ts`:
- Track: `opacity-0`, fades in on container hover via `group-hover/scroll:opacity-100`
- Thumb: `bg-muted-foreground/25`, lifts to `/40` on hover
- No visible track background at any time

### Prompt Feedback
Good catch identifying this as a design system consistency issue. Your phrasing "not adhering to our tokenized design standards" is precise and immediately actionable — it tells me exactly which standard to check against. For maximum specificity, you could add which panel or container had the offending scrollbar (e.g., "the sidebar list" or "the dialog content"), but the general call-out works well here since the fix should be applied globally.

