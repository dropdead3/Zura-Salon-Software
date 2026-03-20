

## Add "+ Add Another Service" Button on Confirm Step

### What changes

In the `ConfirmStepDock` component, add a secondary button below the services list that navigates back to the service selection step. This lets stylists add more services without losing their current selections.

### Changes in `src/components/dock/schedule/DockNewBookingSheet.tsx`

**1. Add `onAddService` prop to `ConfirmStepDock`**
New callback prop that calls `setStep('service')` from the parent.

**2. Add button after the services list (after line ~841)**
Below the services `div`, render a secondary outline-style button: `+ Add Another Service` with a `Plus` icon. Styled as a ghost/outline button matching the platform theme (transparent bg, violet-400 text, dashed or subtle border). Calls `onAddService`.

**3. Wire the prop at the call site**
Pass `onAddService={() => setStep('service')}` when rendering `ConfirmStepDock`.

