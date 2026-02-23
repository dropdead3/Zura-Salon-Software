

# Always-Visible Archived & Banned Tabs in Client Directory

## Problem
The "Archived" and "Banned" tabs in the Client Directory only appear when there are archived or banned clients (`stats.banned > 0` / `stats.archived > 0`). The user wants these tabs always available as entry points, regardless of count.

## Change (single file: `src/pages/dashboard/ClientDirectory.tsx`)

### Remove conditional rendering on Banned and Archived tabs (~lines 647-656)

Currently:
```
{stats.banned > 0 && ( <TabsTrigger value="banned" ... /> )}
{stats.archived > 0 && ( <TabsTrigger value="archived" ... /> )}
```

Change to always render both tabs (no wrapping conditional). Keep the count badge but show `(0)` when empty:

```
<TabsTrigger value="banned" className="text-xs text-red-600">
  <Ban className="w-3 h-3 mr-1" /> Banned ({stats.banned})
</TabsTrigger>
<TabsTrigger value="archived" className="text-xs text-muted-foreground">
  <Archive className="w-3 h-3 mr-1" /> Archived ({stats.archived})
</TabsTrigger>
```

This is a two-line conditional removal. No other files or logic changes needed -- the filtering logic for `activeTab === 'banned'` and `activeTab === 'archived'` already exists and will correctly show an empty state when there are zero matching clients.

