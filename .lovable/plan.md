

## Plan: Full Round Pill for Dock Nav

The dock capsule currently uses `rounded-2xl`. Change it to `rounded-full` for a true pill shape.

### Change

**`src/components/dock/DockBottomNav.tsx`** (line 32)
- Replace `rounded-2xl` with `rounded-full` on the `<nav>` element

Single class swap, no other files affected.

