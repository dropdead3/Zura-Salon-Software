

## Show Selected Client & Continue Button When Returning to Client Step

### Problem
When a client is already selected and the user taps the "Client" progress bubble, they see the default search/empty state with no indication of their selection. They must re-search and re-select the client to proceed.

### Solution
Modify the `ClientStepDock` component to accept the currently selected client. When a client is already selected, show a "selected client" banner at the top (above the search bar) with the client's avatar, name, and contact info, plus a "Continue" button at the bottom. The user can still search/select a different client if they want.

### Changes — single file: `src/components/dock/schedule/DockNewBookingSheet.tsx`

**1. Pass `selectedClient` and `onContinue` to `ClientStepDock`** (~line 346)
- Add props: `selectedClient={selectedClient}` and `onContinue={() => setStep('service')}`

**2. Update `ClientStepDock` props interface** (~line 415-428)
- Add `selectedClient: PhorestClient | null` and `onContinue: () => void`

**3. Add selected client banner + continue button inside `ClientStepDock`** (~line 433)
- When `selectedClient` is set, render a highlighted card at the top (before the search bar) showing the selected client with a checkmark, styled with a violet ring
- Render a sticky "Continue" button at the bottom of the client step (after the search results area)

### Layout when client is selected
```text
┌──────────────────────────────────┐
│ ✓ Eric Day                       │  ← selected client banner (violet ring)
│   14805430240                    │
│                    [Change]      │
├──────────────────────────────────┤
│ 🔍 Search...              [+]   │
│ (search results if typing)       │
│                                  │
├──────────────────────────────────┤
│       [ Continue ]  (violet)     │  ← sticky footer button
└──────────────────────────────────┘
```

Selecting a different client from search replaces the selection and auto-advances (existing behavior). The "Continue" button lets them proceed without re-selecting.

