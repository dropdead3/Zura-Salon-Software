
Shrink the avatar status dot in `src/components/dashboard/schedule/DayView.tsx` from `w-3 h-3` (12px) to `w-2.5 h-2.5` (10px), and tighten the offset from `-top-1 -right-1` to `-top-0.5 -right-0.5` so the smaller pip still sits cleanly on the avatar's corner radius without floating too far off.

Also reduce the halo shadow spread from `0_0_0_2px` to `0_0_0_1.5px` so the surrounding ring stays proportional to the smaller dot — otherwise a 2px halo on a 10px dot reads as chunky.

Everything else (color semantics, glass shadow, white inner ring, pointer-events-none, unified tooltip on the avatar) stays identical.
