import { useEffect, useRef, useState } from 'react';

/**
 * DashboardChromeMask — renders an SVG mask defining the L-shaped silhouette
 * of the welded dashboard chrome (top bar + sidebar as one surface).
 *
 * The mask is a full rectangle MINUS an inner rectangle (top-right of the
 * joint) with a rounded concave corner where the two legs meet. Applied to
 * `.chrome-l` via `mask: url(#chrome-l-mask)`.
 *
 * Path is regenerated on every measurement update so the elbow tracks
 * sidebar collapse/expand. We measure the chrome's actual pixel size via
 * ResizeObserver to convert sidebarWidth + topbarHeight to user units.
 */
interface DashboardChromeMaskProps {
  /** Pixel width of the sidebar (vertical leg) */
  sidebarWidthPx: number;
  /** Pixel height of the top bar (horizontal leg) */
  topbarHeightPx: number;
  /** Concave corner radius at the inner elbow */
  elbowRadius?: number;
  /** Ref to the .chrome-l container so we can measure it */
  containerRef: React.RefObject<HTMLDivElement>;
}

export function DashboardChromeMask({
  sidebarWidthPx,
  topbarHeightPx,
  elbowRadius = 16,
  containerRef,
}: DashboardChromeMaskProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [containerRef]);

  // Path: outer full rect (kept as white = visible), then the inner cut
  // rectangle (drawn as black with fillRule="evenodd" to subtract).
  // The cut starts at the joint and extends to the top-right corner,
  // with an arc creating the concave rounded inner elbow.
  const w = size.width;
  const h = size.height;
  const sw = Math.min(sidebarWidthPx, w);
  const th = Math.min(topbarHeightPx, h);
  const r = Math.min(elbowRadius, sw, th);

  // Outer rect (visible) + inner cut (subtractive via evenodd):
  //
  //   M0,0 L w,0 L w,h L 0,h Z              <- outer rect
  //   M sw+r, th  L w, th  L w, 0  L sw, 0  <- start at top of arc, go
  //                                            CW along top of cut
  //   L sw, th-r? no — actually start at (sw, th) going up:
  //
  // Cleaner: cut path goes counter-clockwise so evenodd subtracts it.
  // Path: from (sw, 0) -> (w, 0) -> (w, th) -> (sw + r, th)
  //       -> arc to (sw, th + r)? No, the arc curves INWARD into the cut.
  //       The inner corner of the cut (closest to chrome center) needs
  //       a rounded corner so the visible silhouette gets a concave arc.
  //
  // The cut's inner corner is at (sw, th). We round it so the visible
  // silhouette has a smooth concave curve from (sw + r, th) curving down
  // to (sw, th + r):
  //   M sw+r, th -> arc(r,r 0 0 0 sw, th+r) -> L sw, 0 -> L w, 0 -> L w, th -> Z

  const cutPath =
    w > 0 && h > 0
      ? `M${sw + r},${th} A${r},${r} 0 0 0 ${sw},${th + r} L${sw},0 L${w},0 L${w},${th} Z`
      : '';

  const outerPath = w > 0 && h > 0 ? `M0,0 L${w},0 L${w},${h} L0,${h} Z` : '';

  return (
    <svg
      width="0"
      height="0"
      style={{ position: 'absolute', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <mask
          id="chrome-l-mask"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={w || 1}
          height={h || 1}
        >
          {/* fillRule evenodd: outer rect filled white (visible), inner cut
              path subtracts the top-right quadrant with a rounded inner corner */}
          <path d={`${outerPath} ${cutPath}`} fill="white" fillRule="evenodd" />
        </mask>
      </defs>
    </svg>
  );
}
