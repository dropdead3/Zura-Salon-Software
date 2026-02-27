

## Fix Specialty Options Layout for Narrow Inspector Panel

**Problem**: The `SortableSpecialtyItem` component uses a single-row horizontal flex layout (`flex items-center gap-3`) that crams 5 elements into the narrow Inspector panel (~280px wide). The Badge text has no minimum width and wraps character-by-character.

**Root cause**: The component was designed for the full-width admin page (`HomepageStylists.tsx`) and reused without adaptation in the Website Editor Inspector.

### Implementation

**File: `src/components/dashboard/SpecialtyOptionsManager.tsx`**

Restructure `SortableSpecialtyItem` from a single-row layout to a two-row stacked layout:

- **Row 1**: Grip handle + specialty name (truncated, not in a Badge) filling available width
- **Row 2**: Edit button + Switch + Delete button, right-aligned

Key changes:
1. Replace the `Badge` wrapper with a plain `span` using `truncate` and `min-w-0` so the name ellipses instead of wrapping vertically
2. Move the action controls (edit, switch, delete) to a second row beneath the name
3. Use `flex-col` on the outer container with the controls row using `flex justify-end gap-2`
4. Keep the drag handle on the top-left via the first row
5. Maintain the edit-inline mode but constrain the Input with `min-w-0`

The `SpecialtyOptionsManager` card wrapper (`<Card>`) also needs adjustment -- when rendered inside the Inspector it shouldn't add its own card chrome since `EditorCard` already provides it. Check `StylistsContent.tsx` to see if it's already wrapped; if so, consider rendering without the outer `<Card>` in the editor context, or just fix the item layout which is the primary issue.

### Scope
- Single file change: `src/components/dashboard/SpecialtyOptionsManager.tsx`
- No data or schema changes
- No new components needed

