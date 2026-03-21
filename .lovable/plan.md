

## Fix Dock Tab Toggle Padding & Radius

**File:** `src/components/dock/appointment/DockAppointmentDetail.tsx` (line 55)

The outer container uses `rounded-xl` (12px) with `p-1` (4px), but inner buttons use `rounded-lg` (8px). The visual gap between the inner button edge and outer container edge is uneven because the inner radius doesn't account for the padding offset.

**Fix:**
- Outer container: `rounded-2xl p-1.5` — larger radius + more padding for breathing room
- Inner buttons: `rounded-xl` — radius = outer radius minus padding, giving visually equal inset around corners
- Increase button height from `h-9` to `h-10` for better proportion

