

## Make New Client Drawer Taller

The bottom sheet in `src/components/dock/schedule/DockNewClientSheet.tsx` is capped at `maxHeight: '88%'` (line 223). This clips the form content on smaller screens.

### Change

In `DockNewClientSheet.tsx`, line 223, increase the max height:

```
// Before
style={{ maxHeight: '88%' }}

// After
style={{ maxHeight: '95%' }}
```

This gives the drawer nearly full-screen height so all form fields (name, email, phone, gender, notes, submit button) are visible without scrolling off-screen.

