

## Diagnosis

Looking at the screenshot, the right edge of the settings page shows two distinct dark background tones meeting in a vertical seam:
- The **top header strip** (where the theme toggle, bell, and avatar pill sit) uses one dark tone
- The **main content area below** uses a slightly different, darker tone

This is almost always one of three causes:
1. The dashboard layout wraps content in a card/panel with its own `bg-card` or `bg-background` while the outer shell uses a different surface (e.g. `bg-muted` / `bg-sidebar`)
2. The Settings page itself adds an extra background wrapper that doesn't match the surrounding layout
3. A `marketing-surface` or theme-scoped class is leaking into one zone but not the other

Let me investigate the actual layout chain.
