

## Add Blur + Gradient Combo to Top and Bottom Edges

**Problem:** The current top/bottom overlays are gradient-only — they fade the background color over the cards but the card content (text, borders, badges) remains sharp and fully visible until it disappears under the opaque zone. A true iOS-style edge treatment needs the *content itself* to blur as it approaches the edges.

### Approach — CSS `mask-image` on the scroll container

Instead of relying solely on overlay divs, apply a CSS mask to the scroll container itself. This makes the actual content (cards, text, everything) fade to transparent at the top and bottom edges. Combined with the existing gradient overlays (which provide the background color fill), this creates a seamless blur-fade effect.

### Changes — `src/components/dock/schedule/DockScheduleTab.tsx`

1. **Add `mask-image` + `backdrop-filter` to the top and bottom overlay divs** — change them from pure gradient overlays to gradient + `backdrop-blur` overlays:

   ```tsx
   {/* Top fade + blur overlay */}
   <div className="absolute top-0 left-0 right-0 h-16 z-10 pointer-events-none"
     style={{
       background: 'linear-gradient(to bottom, hsl(var(--platform-bg)) 20%, transparent)',
       backdropFilter: 'blur(8px)',
       WebkitBackdropFilter: 'blur(8px)',
       maskImage: 'linear-gradient(to bottom, black 30%, transparent)',
       WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent)',
     }}
   />

   {/* Bottom fade + blur overlay */}
   <div className="absolute bottom-0 left-0 right-0 h-20 z-10 pointer-events-none"
     style={{
       background: 'linear-gradient(to top, hsl(var(--platform-bg)) 20%, transparent)',
       backdropFilter: 'blur(8px)',
       WebkitBackdropFilter: 'blur(8px)',
       maskImage: 'linear-gradient(to top, black 30%, transparent)',
       WebkitMaskImage: 'linear-gradient(to top, black 30%, transparent)',
     }}
   />
   ```

   The `backdropFilter: blur(8px)` actually blurs the content *behind* the overlay (the cards scrolling underneath). The `maskImage` ensures the blur itself fades out gradually so there's no hard blur edge. The `background` gradient provides the color fade into the platform background.

2. **Increase overlay heights slightly** — top from `h-12` to `h-16`, bottom from `h-16` to `h-20` — to give the blur a wider transition zone.

Single file, two div style updates. Cards and their text will now physically blur as they approach either edge.

