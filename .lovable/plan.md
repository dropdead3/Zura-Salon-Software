

## Use Custom SVG for Booth Renter Icon

The uploaded `BoothRentIcon.svg` will be copied into the project and wrapped as a Lucide-compatible React component so it can be used anywhere the icon system resolves role icons.

### Changes

#### 1. Copy SVG asset
- Copy `user-uploads://BoothRentIcon.svg` → `src/assets/icons/BoothRentIcon.svg`

#### 2. Create `src/components/icons/BoothRentIcon.tsx`
- Wrap the SVG path in a React component matching the Lucide icon interface (`size`, `className`, `color`, `strokeWidth` props)
- Use `currentColor` for fill so it adapts to badge themes

#### 3. Update `src/components/dashboard/RoleIconPicker.tsx`
- Import `BoothRentIcon` custom component
- Add `"BoothRent"` key to `ICON_MAP` so it can be selected when configuring the booth_renter role

#### 4. Update `src/lib/iconResolver.ts`
- Add `"BoothRent"` → `BoothRentIcon` to the global `ICON_MAP` so all icon resolution (nav bar, badges, etc.) can find it

### Result
When the booth_renter role's icon is set to `"BoothRent"` in the DB, all badges, stats, filters, and nav bar will render the custom booth chair SVG.

