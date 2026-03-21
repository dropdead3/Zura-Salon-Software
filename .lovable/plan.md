

## Remove Sidebar Card Background

**File:** `src/pages/dashboard/platform/BackroomAdmin.tsx`

Remove the `border`, `bg-*`, and `backdrop-blur-xl` classes from the `<nav>` element so it renders as a flat rail without a bento card appearance. Keep the padding and spacing for layout.

**Change:** Line ~93 nav className — strip `rounded-xl border border-[...] bg-[...] backdrop-blur-xl` to just structural classes.

