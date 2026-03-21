

## Demo Mode — Remaining Gaps

After auditing the full Dock codebase, here are the remaining unguarded paths that would cause errors or empty states during a demo presentation.

### Gap 1: Live Dispensing Flow Has No Demo Guards

**Problem:** `DockLiveDispensing` queries `mix_bowl_lines` and `supply_library_products` by `bowlId` — demo bowls use IDs like `demo-bowl-1` that don't exist in DB, so the dispensing view shows an empty ingredient list. The mutations in `useDockMixSession.ts` (`useRecordDispensedWeight`, `useSealDockBowl`, `useReweighDockBowl`) all write to the DB without `demo-` guards, causing errors when interacting with demo bowls.

**Fix:**
- **`src/hooks/dock/useDockMixSession.ts`** — Add `demo-` guards to `useRecordDispensedWeight`, `useSealDockBowl`, and `useReweighDockBowl` (short-circuit with mock success).
- **`src/components/dock/mixing/DockLiveDispensing.tsx`** — In `useBowlLines`, detect `demo-` bowl IDs and return mock line data matching the formula that was "created" in the demo bowl sheet.

### Gap 2: Session Stats Empty for Demo Sessions

**Problem:** `useDockSessionStats` queries `mix_bowl_projections` by session ID. Demo sessions have no projection rows, so the "Finish Session" sheet shows all-zero stats (0 bowls, 0g dispensed, $0.00).

**Fix:**
- **`src/hooks/dock/useDockSessionStats.ts`** — Detect `demo-` session IDs and return mock stats (e.g., 2 bowls, 65g dispensed, 8g leftover, $12.50 cost).

### Gap 3: Settings Tab Allows "Move Station" in Demo Mode

**Problem:** The Settings tab's "Move Station" action clears `localStorage` device binding and triggers a real logout. In demo mode this disrupts the presentation flow and requires re-entering the demo PIN.

**Fix:**
- **`src/components/dock/settings/DockSettingsTab.tsx`** — Check `isDemoMode` and either disable the "Move Station" button or show a toast ("Not available in demo mode") instead of clearing device binding.

### Gap 4: Scale Tab Not Demo-Aware

**Problem:** The Scale tab attempts real BLE scanning which fails silently on non-BLE devices (laptops during presentations). The tab shows "Disconnected — No scale connected" with no way to simulate a connection.

**Fix (low priority — cosmetic):**
- **`src/components/dock/scale/DockScaleTab.tsx`** — In demo mode, show a simulated "Connected" state with a mock weight readout that gently fluctuates. This makes the scale tab visually compelling during demos.

### Files Summary

| Priority | File | Change |
|----------|------|--------|
| High | `src/hooks/dock/useDockMixSession.ts` | Guard `demo-` IDs in 3 mutations |
| High | `src/components/dock/mixing/DockLiveDispensing.tsx` | Mock bowl lines for demo bowls |
| High | `src/hooks/dock/useDockSessionStats.ts` | Mock stats for demo sessions |
| Medium | `src/components/dock/settings/DockSettingsTab.tsx` | Block "Move Station" in demo |
| Low | `src/components/dock/scale/DockScaleTab.tsx` | Simulated connected state |

