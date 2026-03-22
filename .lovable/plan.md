

## Transform Settings Tab Icon to Lock When Active

**Goal:** When the Settings tab is active, change its icon to Lock and label to "Lock Station" with a ghost-red style. Remove the existing "Lock Station" button from the settings page since the tab itself will serve that purpose.

### Changes

**1. `src/components/dock/DockBottomNav.tsx`**

- Accept a new `onLockStation` callback prop
- Make the Settings tab entry dynamic: when `activeTab === 'settings'`, render the Lock icon and "Lock Station" label instead of Settings icon/label
- When the Settings tab is already active and tapped again, call `onLockStation()` instead of `onTabChange('settings')`
- Apply ghost-red styling (red-400 text, red-tinted pill) when active on settings tab

**2. `src/components/dock/DockLayout.tsx`**

- Pass `onLogout` as `onLockStation` to `DockBottomNav`

**3. `src/components/dock/settings/DockSettingsTab.tsx`**

- Remove the "Lock Station" button (lines 162-169) and its spacer
- The `onLogout` prop can remain for the move-dock flow but the dedicated lock button is gone

### Interaction flow

```text
User taps Settings → Settings page opens, tab icon morphs to Lock + "Lock Station" (red tint)
User taps Lock Station tab again → triggers onLogout (locks the station)
User taps any other tab → Settings tab reverts to gear icon
```

