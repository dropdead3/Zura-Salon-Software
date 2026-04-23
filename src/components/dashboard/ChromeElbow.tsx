/**
 * ChromeElbow — concave rounded notch at the inner joint of the L-shaped
 * dashboard chrome (top bar + sidebar). Tracks --sidebar-width so it stays
 * glued to the joint during collapse/expand animation.
 *
 * Layout: positioned absolutely inside .dashboard-chrome at:
 *   top:  var(--chrome-top-bar-height)
 *   left: var(--sidebar-width)
 * Painted as a 12×12 square with a radial-gradient mask that cuts a
 * concave quarter-circle into its top-left corner, producing the
 * "sculpted bracket" silhouette.
 */
export function ChromeElbow() {
  return (
    <div
      className="chrome-elbow"
      data-chrome-leg
      style={{
        top: 'var(--chrome-top-bar-height)',
        left: 'var(--sidebar-width)',
      }}
      aria-hidden="true"
    />
  );
}
