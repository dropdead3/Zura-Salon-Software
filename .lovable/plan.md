

## Add Service Editor Hyperlink to Service Tracking Section

### Change
In the "Available Services" card description text, turn "Service Editor" into a clickable link that navigates to Organization Settings → Services (`/admin/settings?category=services`).

### File
`src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

### Details
1. Import `useNavigate` from `react-router-dom` and `useOrgDashboardPath` from `@/hooks/useOrgDashboardPath`
2. In the component body, get `navigate` and `dashPath`
3. Replace the plain text `CardDescription` with a version where "Service Editor" is a styled `<button>` (or anchor-style span) that calls `navigate(dashPath('/admin/settings?category=services'))`
4. Style the link with `underline text-foreground/80 hover:text-foreground cursor-pointer` to look like an inline text link without breaking the description flow

