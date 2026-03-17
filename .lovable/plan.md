
Root cause

- The organization-side supply library is re-breaking because the org UI is directly importing a platform-only component:
  - `src/components/dashboard/backroom-settings/BackroomProductCatalogSection.tsx`
  - `src/components/dashboard/backroom-settings/SupplyLibraryDialog.tsx`
  both import `@/components/platform/backroom/BrowseColumn`.
- `src/components/platform/backroom/BrowseColumn.tsx` now hardcodes platform theme variables and violet accents (`--platform-*`, `bg-violet-*`), so every platform styling fix leaks into the organization experience.
- The screenshot matches `BackroomProductCatalogSection.tsx` specifically (`My Catalog / ...`, `All Pricing`), where column 1 is using the platform-colored shared component while column 2 still uses org semantic classes. That is why the menu looks mixed and “messed up again.”

Plan

1. Stop sharing the platform browse column with organization screens.
   - Create an organization-safe browse column variant or a themeable shared base component.
   - Keep platform colors isolated to platform surfaces only.

2. Update the organization supply-library screens to use the org version.
   - `BackroomProductCatalogSection.tsx`
   - `SupplyLibraryDialog.tsx`

3. Normalize the remaining org-side finder chrome in `BackroomProductCatalogSection.tsx`.
   - Keep Category, Product Line, empty states, headers, and selected-row states all on the org theme.
   - Remove any mixed platform-vs-org visual treatment in that 3-column browser.

4. Leave the platform side on its current platform styling.
   - `src/components/platform/backroom/BrowseColumn.tsx` should remain platform-specific, but only platform pages should import it.

5. Do a small import audit in the backroom settings area.
   - Remove any remaining imports from `src/components/platform/...` inside organization backroom screens so this regression does not keep coming back.

Technical approach

- Best long-term fix: extract a shared `BrowseColumnBase` with theme class slots, then expose:
  - `PlatformBrowseColumn`
  - `OrgBrowseColumn`
- Faster safe fix: duplicate the component for org use and switch the two organization files to that org copy.
- I recommend the first option if we want to prevent repeated regressions cleanly; the second is acceptable if speed matters more than reuse.

Why this keeps happening

- The component lives under the platform folder but was reused on the organization side.
- As soon as the platform version was corrected to premium-dark styling, the org side inherited those same colors.
- So the bug is not random: it is a component-boundary problem, not a one-off color tweak problem.
