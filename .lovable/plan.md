

# Add Client Directory Links to Clients Analytics Page

## Changes (single file: `src/components/dashboard/analytics/ClientsContent.tsx`)

### 1. Add navigation import
Import `useNavigate` from `react-router-dom` and the `ExternalLink` icon from `lucide-react`.

### 2. Make the "Total Clients" KPI card clickable
Wrap the first KPI card (Total Clients, line 60-70) with an `onClick` handler that navigates to `/dashboard/admin/client-directory`. Add `cursor-pointer` and hover styling so it's visually interactive.

### 3. Add a "View Client Directory" link button
Add a small link button (using `tokens.button.cardAction` pill style) in the page header area or near the top of the content, linking to `/dashboard/admin/client-directory`. This gives users an always-visible path to the full directory.

## Technical Detail
- Uses `useNavigate()` for SPA navigation
- Total Clients card gets `onClick={() => navigate('/dashboard/admin/client-directory')}` plus `cursor-pointer hover:border-primary/30 transition-colors` classes
- A pill-style "View Client Directory" button with an `ExternalLink` icon will be placed above the KPI grid
