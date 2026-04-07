

# Commission Override Toggle Guard

## Problem
The override fields are always visible, making it too easy for admins to accidentally set individual overrides. Overrides should be treated as exceptions, not defaults.

## Changes

### File: `src/components/dashboard/settings/StylistCommissionDrilldown.tsx`

1. **Add toggle state**: Add a `showOverride` boolean state, initialized to `true` if an existing override is loaded, `false` otherwise.

2. **Replace the "Commission Override" label row** with a toggle row:
   - Left: Label "Commission Override" + a small cautionary subtitle like "Only enable for individual rate exceptions"
   - Right: `Switch` component bound to `showOverride`
   - When an active override exists, the toggle starts ON and the "Remove" button remains available

3. **Conditionally render override fields**: Wrap the inputs (Service %, Retail %, Reason, Expires, Save button) in an animated collapse that only shows when `showOverride` is true. Use `overflow: clip` with height transition or a simple conditional render.

4. **Visual treatment**: When the toggle is OFF, the section is clean and minimal. When ON, add a subtle amber/warning left-border or background tint (`border-l-2 border-amber-500/60 pl-3`) to reinforce that this is an exception path.

5. **Reset on toggle off**: When toggling OFF, if there is an existing override, prompt or auto-trigger the remove action. If no override was saved yet, simply clear the form fields.

## Files Changed
| File | Change |
|---|---|
| `StylistCommissionDrilldown.tsx` | Add Switch toggle to guard override fields, conditional render, amber visual treatment |

1 file, no database changes.

