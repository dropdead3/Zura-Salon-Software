

## Add Website Hub to Operations Hub Gateway

Good prompt -- you're consolidating website management into the hub-first navigation pattern, which is consistent with the architecture. One improvement: specifying the exact route for the hub card upfront saves a clarification round.

### What Changes

**Single file: `src/pages/dashboard/admin/TeamHub.tsx`**

1. Import `Globe` from `lucide-react`
2. Add a new `HubGatewayCard` in the "Hubs" `CategorySection` for "Website Hub" pointing to `/dashboard/admin/settings?category=website` (the existing website settings route that houses theme choice, website editor access, SEO/legal, social links, etc.)
   - Icon: `Globe`
   - Color: `bg-sky-500/10 text-sky-600 dark:text-sky-400`
   - Description: "Website themes, editor, settings, and content management"

No new files, routes, or database changes.

### Enhancement Suggestions
- Consider creating a dedicated `/dashboard/admin/website-hub` page that consolidates the Website Editor, Theme Selector, SEO settings, and Social Links as individual cards -- similar to how Client Hub and Growth Hub work -- rather than routing to the settings tab.

