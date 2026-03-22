

## Fix Scroll Indicator Position — Above Bottom Nav

**Problem:** The scroll indicator is `absolute bottom-0` on the full tab container, which places it behind/under the bottom navigation bar rendered by the parent layout. It needs to sit at the bottom of the scrollable appointment list area, above the nav.

**File:** `src/components/dock/schedule/DockScheduleTab.tsx`

**Fix:** Wrap the scrollable area and indicator in a `relative` container so the indicator anchors to the bottom of the scroll region rather than the full page. Move the indicator div inside a wrapper around the scroll area.

Lines 105-136 — restructure:
- Wrap the scroll `div` and indicator `div` together in a new `div className="relative flex-1 min-h-0"`
- Move `flex-1 min-h-0` from the scroll div to this wrapper
- The scroll div becomes `h-full overflow-y-auto`
- The indicator stays `absolute bottom-0` but now it's relative to the scroll wrapper, not the full page

This ensures the chevron arrow and gradient appear just above the bottom nav bar.

