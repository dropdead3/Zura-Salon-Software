

# Terminal Tip Settings

## What This Builds

A new "Tipping" tab in the Zura Pay Configurator that lets organizations control how tip prompts appear on their S710 terminals. Inspired by the reference screenshots, the settings include:

1. **Master toggle** — Enable/disable tip prompts on the card terminal
2. **Tip percentages** — Three customizable percentage values (default: 20%, 25%, 30%)
3. **Fixed tip threshold** — Toggle + threshold amount: below this subtotal, show fixed dollar amounts instead of percentages
4. **Include retail sales in tips** — Whether retail product amounts are included in the tip calculation base
5. **Tip prompt with saved cards** — Whether to show tip options when charging saved/on-file cards

All settings stored in `backroom_settings` under key `tip_config` using the existing `useColorBarSetting` / `useUpsertColorBarSetting` hooks. No migrations needed.

The S710 simulator on the Display tab will also be updated to include a tip selection screen in its flow, reflecting the configured percentages.

## Implementation

### 1. New Component: `ZuraPayTippingTab.tsx`

A settings card containing:
- Enable/Disable toggle (styled like the reference — pill-style segmented control or Switch)
- Three percentage input fields with "%" suffix badges (editable number inputs)
- Fixed Tip Threshold: toggle + dollar amount input (shown when enabled)
- Include Retail Sales in Tips: toggle with description
- Tip Prompt with Saved Cards: toggle with description
- All changes auto-save via `useUpsertColorBarSetting` with key `tip_config`

### 2. Add "Tipping" tab to `TerminalSettingsContent.tsx`

Insert a new `TabsTrigger` for "Tipping" between Display and Receipts. Wire it to the new `ZuraPayTippingTab` component.

### 3. Update S710 Simulator with tip screen

Add a `TipScreen` state to `S710CheckoutSimulator.tsx` that appears between `cart` and `tap` in the auto-play flow. Shows subtotal, three percentage buttons (with calculated dollar amounts), a "Custom" button, and a "No Tip" option — matching the reference screenshot aesthetic.

## Files

| File | Action |
|---|---|
| `src/components/dashboard/settings/terminal/ZuraPayTippingTab.tsx` | **New** — full tip configuration UI |
| `src/components/dashboard/settings/TerminalSettingsContent.tsx` | Add "Tipping" tab trigger + content |
| `src/components/dashboard/settings/terminal/S710CheckoutSimulator.tsx` | Add tip selection screen to simulator flow |

No migrations. No edge function changes. Uses existing `backroom_settings` storage.

