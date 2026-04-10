

# Zura Apps Dashboard — Section Link + App Marketplace Page

## What We Are Building

1. **Clickable "Zura Apps" section heading** in the sidebar that navigates to a new Zura Apps dashboard page
2. **Zura Apps Dashboard page** (`/dashboard/apps`) — a marketplace-style view showing subscribed apps and available apps to explore

## Apps to Display

**Currently Available:**
- **Color Bar** — Backbar inventory and color management (uses `backroom` app key)
- **Zura Connect** — Team and client communications (uses `connect_enabled` flag)

**Coming Soon (display as locked/preview cards):**
- **Zura Marketer** — Marketing OS (includes sub-products below)
- **Zura Reputation** — Reviews and social proof engine (smart review timing, Google review flows, reputation scoring, review response AI)
- **Zura Reception** — AI receptionist

## Changes

| File | Change |
|------|--------|
| `src/pages/dashboard/AppsMarketplace.tsx` | **New** — Marketplace page with two sections: "Your Apps" (subscribed) and "Explore Apps" (available/coming soon). Each app rendered as a card with icon, description, status badge, and action button |
| `src/components/dashboard/SidebarNavContent.tsx` | Make the "Zura Apps" section header a `Link` to `dashPath('/apps')` instead of plain text (lines 575-581) |
| `src/config/dashboardNav.ts` | No change needed — apps page is accessed via the section header, not a nav item |
| `src/App.tsx` (or route config) | Add route for `/dashboard/apps` → `AppsMarketplace` component |

## Sidebar Header Change

Current (line 576-580):
```tsx
<p className="text-xs uppercase tracking-wider ...">
  {sectionLabel}
</p>
```

Updated — wrap in Link for the `apps` section only:
```tsx
{sectionId === 'apps' ? (
  <Link to={dashPath('/apps')} className="text-xs uppercase tracking-wider ... hover:text-foreground transition-colors">
    {sectionLabel}
    <ChevronRight className="inline w-3 h-3 ml-1" />
  </Link>
) : (
  <p className="text-xs uppercase tracking-wider ...">
    {sectionLabel}
  </p>
)}
```

## Marketplace Page Design

- Uses `DashboardPageHeader` with title "Zura Apps" and description "Manage your subscriptions and explore new tools"
- **Your Apps** section: Cards for Color Bar and Connect showing active/inactive status pulled from `useOrganizationApps()` and `useConnectEntitlement()`
- **Explore Apps** section: Cards for Marketer, Reputation, and Reception with "Coming Soon" badges and brief descriptions
- Cards follow design tokens: `tokens.card.*`, `font-display` for titles, `font-sans` for descriptions
- Each active app card links to its settings page; coming soon cards are non-interactive with a muted style

