

## Add "My Profile" Card to Settings Hub

The Settings hub renders category cards from `categoriesMap` + `SECTION_GROUPS`. A "My Profile" card needs special handling since it navigates to `/dashboard/profile` rather than opening an inline settings panel.

### Changes

**1. `src/hooks/useSettingsLayout.ts`**
- Add `'my-profile'` to the first section group (`operations`) as the first item
- Add default icon color for `my-profile` (e.g., `#8B5CF6` violet to match brand)

**2. `src/pages/dashboard/admin/Settings.tsx`**
- Import `User` icon (already imported) and `useNavigate` (already imported)
- Add `'my-profile'` entry to `categoriesMap`:
  ```
  'my-profile': {
    id: 'my-profile',
    label: 'My Profile',
    description: 'Photo, bio & professional details',
    icon: User,
  }
  ```
- Add `'my-profile'` to the `SettingsCategory` type union
- In the card click handler / `SortableCard` `onClick`, detect `my-profile` and call `navigate('/dashboard/profile')` instead of `setActiveCategory`

**3. `src/pages/dashboard/admin/Settings.tsx` — grid rendering**
- In the main grid where `SortableCard` is rendered, intercept `my-profile` clicks to navigate externally rather than setting inline category state

This keeps the card consistent with all other settings cards (draggable, color-customizable) while linking out to the existing profile editor.

