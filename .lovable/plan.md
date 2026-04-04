
What’s happening

Good catch. Your prompt is strong because you’re asking about the recurring failure pattern, not just the latest symptom. A sharper version for future debugging would be:

“Investigate why logo changes keep causing white/blank screens. I want root-cause analysis only. Compare platform assets, platform branding settings, and organization branding, then propose a hardening plan.”

Do I know what the issue is?
Yes.

Why logo changes keep turning into regressions

1. Brand identity is coming from too many places
- Platform defaults are bundled in `src/assets`
- Platform runtime branding comes from `site_settings` via `usePlatformBranding()`
- Organization branding comes from `business_settings` / `organizations`
- Different surfaces resolve logos differently, so changing “the logo” is not one change

2. Platform and organization branding boundaries are not hard enough
- `UnifiedLogin.tsx` uses platform branding
- `PlatformLanding.tsx` uses a bundled asset directly
- `PlatformSidebar.tsx` uses platform branding
- Dashboard/org areas use `useBusinessSettings()`
- This means a logo request can accidentally touch platform identity, tenant identity, or both

3. Core logo usage is fragmented instead of centralized
Right now multiple files decide their own fallback logic:
- `src/pages/UnifiedLogin.tsx`
- `src/pages/PlatformLanding.tsx`
- `src/components/platform/layout/PlatformSidebar.tsx`
- `src/components/dashboard/DashboardLayout.tsx`
- `src/components/dashboard/SidebarNavContent.tsx`
- `src/components/layout/Header.tsx`

So each logo swap becomes a small refactor across startup-critical surfaces instead of a safe config change.

4. Public routes were historically coupled to fragile app boot paths
The earlier white screens were not really “the image broke React.”
They were mostly caused by:
- public/login pages living too close to heavy dashboard imports/providers
- dev-time module transform failures in unrelated dashboard code
- changes landing in boot-path files like `App.tsx`, `UnifiedLogin.tsx`, `PlatformLanding.tsx`

So logo work kept exposing a fragile startup architecture.

5. Logo uploads are live immediately, without a hardened abstraction
In `PlatformAppearanceTab.tsx`, logo updates are saved immediately when changed.
That means:
- wrong asset = immediate production-facing change
- there’s no draft/preview/confirm boundary
- there’s no single resolver component normalizing aspect ratio, fallback, load error, or broken URLs

6. Platform default assets are still treated like editable working assets
You now have both old brand files and a newer `zura-logo-white.svg`.
That is a warning sign: the platform has multiple “canonical” logo candidates.
When the source of truth is unclear, people start swapping imports in different files, which is exactly how regressions happen.

What I would build to stop this permanently

1. Create a strict logo architecture
Define 3 explicit layers:
- Platform default assets: immutable files in `src/assets`
- Platform configured branding: values from `usePlatformBranding()`
- Organization branding: values from `useBusinessSettings()` / org records

Rule:
- Platform surfaces never read org branding
- Org surfaces never read platform branding except intentional fallback rules

2. Introduce one resolver per identity layer
Create centralized helpers/components such as:
- `PlatformLogo`
- `PlatformIcon`
- `OrganizationLogo`

Each wrapper should handle:
- correct source selection
- safe fallback
- image load failure fallback
- consistent sizing / object-fit
- optional dark/light variant handling

3. Stop importing raw logo files all over the app
Instead of each page deciding its own image source, route all platform surfaces through one resolver.
That removes scattered fallback chains and makes future logo swaps low risk.

4. Freeze the platform default brand assets
Pick one canonical bundled default set and treat it as immutable.
For example:
- login default
- landing default
- sidebar full logo default
- sidebar icon default

No more swapping random SVG imports per screen.

5. Keep platform-configured logos as configuration, not code edits
Use platform settings for runtime branding.
Do not replace bundled assets just to update the live brand.
Bundled assets should exist only as safe fallbacks.

6. Add a safer update flow for branding
Change platform appearance updates from “save immediately on every upload” to:
- upload
- preview
- save
- rollback if needed

That will prevent accidental bad logo pushes.

7. Keep public/login surfaces isolated from dashboard code
Preserve the separation already started in `App.tsx`:
- `/`
- `/login`
should stay outside private provider trees and heavy dashboard dependencies

That way a dashboard failure cannot blank the login page during a branding change.

Implementation plan

Step 1: Audit and define canonical platform assets
- Choose the single default Zura wordmark/icon set
- Replace ambiguous imports with a single canonical platform asset map

Step 2: Build centralized logo components
- `PlatformLogo` for full platform marks
- `PlatformIcon` for compact platform marks
- `OrganizationLogo` for org-level logos

Step 3: Migrate startup-critical surfaces first
Refactor these first:
- `src/pages/UnifiedLogin.tsx`
- `src/pages/PlatformLanding.tsx`
- `src/components/platform/layout/PlatformSidebar.tsx`

Step 4: Migrate remaining scattered logo consumers
Refactor dashboard/public components that still import raw brand assets directly.

Step 5: Harden the appearance settings flow
- remove auto-live mutation on every upload
- add explicit save/apply behavior
- keep preview local until confirmed

Step 6: Add image-failure fallback behavior
If a configured URL fails:
- fall back to bundled platform asset
- never blank the surface
- never let a broken image take down a key screen visually

Step 7: QA the high-risk flows
Test:
- homepage `/`
- `/login`
- platform sidebar
- org dashboard sidebar
- organization selection interstitial
- dark/light themes
- bad image URL / removed image / oversized logo

Technical details from the current code

- `UnifiedLogin.tsx` already has a clear fallback chain:
  `login_logo_url -> primary_logo_url -> ZuraLogoWhite`
- `PlatformLanding.tsx` still imports a bundled asset directly
- `PlatformSidebar.tsx` resolves branding separately from login
- `PlatformAppearanceTab.tsx` uploads to storage and saves immediately
- Platform and org logos both live in overlapping patterns, which increases confusion
- The tenant-brand guard is correct, but the current logo plumbing does not fully enforce that boundary everywhere

What this means in plain English

The white screens are not really because “replacing a logo is dangerous.”
They happen because logos currently sit at the intersection of:
- brand identity
- multi-tenant boundaries
- startup-critical pages
- scattered fallback logic
- previously fragile route boot paths

So every logo change is touching a part of the app that has outsized blast radius.

Best path forward

Do not keep “replacing logos” screen by screen.
Instead, convert branding into a protected system with:
- one source of truth per identity layer
- one rendering component per layer
- immutable defaults
- explicit preview/apply flow

That will turn logo updates from risky code edits into safe configuration changes.

Scope / impact

- No database migration is required for the core cleanup
- Main work is frontend architecture and branding abstraction
- Highest-value fixes are centralized resolution + safer settings flow + keeping public routes isolated

Success criteria

- Changing the platform logo does not require editing route/page files
- A bad uploaded logo cannot blank login or homepage
- Platform branding never leaks tenant branding
- Org branding never overrides platform identity
- Login, landing, and sidebars all resolve logos through the same predictable rules
