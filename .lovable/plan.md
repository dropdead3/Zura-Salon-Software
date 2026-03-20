

## Plan: Enable Device Preview for All Dock Users (Not Just Demo Mode)

### Problem
The device switcher (iPad/Phone/Full toggle) and the constrained viewport rendering are currently gated behind `isDemoMode`, which only activates when `staff.userId === 'dev-bypass-000'`. Real PIN logins get the raw full-screen layout with no device frame — which is what the screenshot shows.

### Solution
Since Dock is accessed via desktop browsers but designed for iPad, the device preview should always be available — not just in demo mode. We need to decouple the device preview from demo mode.

### Changes

**1. `src/contexts/DockDemoContext.tsx`**
- Stop forcing `device: 'full'` when not in demo mode. Return the actual stored device value for all users so everyone gets the persisted device preference.

**2. `src/components/dock/DockLayout.tsx`**
- Change `isConstrained` from `isDemoMode && device !== 'full'` → just `device !== 'full'`
- Show `DockDeviceSwitcher` always (remove the `isDemoMode &&` guard on both render paths)
- Default device to `'tablet'` instead of `'full'` so first-time users see the iPad frame immediately

**3. `src/hooks/dock/useDockDevicePreview.ts`**
- Change the default device from `'full'` to `'tablet'` so the iPad viewport is the default experience

### What stays the same
- Demo mode badge still only shows for `dev-bypass-000`
- Mock data hooks still only activate in demo mode
- The device switcher UI component itself is unchanged

