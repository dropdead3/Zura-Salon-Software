/**
 * EDITOR-SPECIFIC DESIGN TOKENS
 * 
 * Extends the platform token system for the three-panel Website Editor.
 * No new colors — uses existing semantic tokens only.
 * All glass/blur/shadow values conform to the Zura luxury bento system.
 */

export const editorTokens = {
  // ========================================
  // PANEL TOKENS (glass bento — width set via layout manager)
  // ========================================
  panel: {
    /** Structure panel (left — width from useEditorLayout) */
    structure: 'flex-shrink-0 bg-card/80 backdrop-blur-xl border border-border/40 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]',
    /** Canvas panel (center, flexible) */
    canvas: 'flex-1 min-w-0 bg-background backdrop-blur-sm rounded-xl overflow-hidden border border-border/40 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]',
    /** Inspector panel (right — width from useEditorLayout) */
    inspector: 'flex-shrink-0 bg-card/80 backdrop-blur-xl border border-border/40 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]',
    /** Collapsed icon rail */
    collapsedRail: 'w-10 flex-shrink-0 bg-card/80 backdrop-blur-xl border border-border/40 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] flex flex-col items-center py-3 gap-2',
    /** Shared panel header */
    header: 'h-12 px-4 border-b border-border/40 bg-card/90 backdrop-blur-md flex items-center',
  },

  // ========================================
  // SEGMENTED CONTROL
  // ========================================
  segmented: {
    /** Outer container */
    container: 'bg-muted/60 rounded-lg p-1 flex gap-0.5',
    /** Individual segment button */
    button: 'flex-1 px-3 py-1.5 rounded-md text-xs font-sans font-medium text-muted-foreground transition-all duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
    /** Active segment */
    active: 'bg-background text-foreground shadow-sm',
  },

  // ========================================
  // STRUCTURE PANEL ITEMS
  // ========================================
  structureItem: {
    /** Default item row */
    row: 'flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer transition-all duration-120',
    /** Active/selected state */
    active: 'bg-primary/10 border border-primary/20',
    /** Hover state */
    hover: 'hover:bg-muted/60 border border-transparent',
    /** Disabled/hidden section */
    disabled: 'opacity-50',
  },

  // ========================================
  // INSPECTOR TOKENS
  // ========================================
  inspector: {
    /** Empty state container */
    empty: 'flex flex-col items-center justify-center h-full text-center px-8',
    /** Empty state icon */
    emptyIcon: 'w-10 h-10 text-muted-foreground/20 mb-3',
    /** Empty state text */
    emptyText: 'text-sm text-muted-foreground/60',
    /** Inspector content area — symmetric insets, single envelope */
    content: 'px-5 pt-4 pb-8 space-y-4 max-w-full box-border overflow-hidden',
    /** Collapsible group header */
    groupHeader: 'flex items-center justify-between w-full py-3 px-1 text-xs font-medium text-muted-foreground uppercase tracking-[0.15em] hover:text-foreground transition-colors duration-120 border-t border-border/30 first:border-t-0',
    /** Collapsible group content */
    groupContent: 'pb-5 space-y-4',
    /** Group divider */
    groupDivider: 'border-b border-border/40',
  },

  // ========================================
  // CANVAS TOKENS
  // ========================================
  canvas: {
    /** Canvas inner frame (the white editing surface) */
    surface: 'bg-background h-full',
    /** Canvas header control strip */
    controlStrip: 'h-12 px-4 border-b border-border/40 bg-card/90 backdrop-blur-md flex items-center justify-between gap-4',
    /** Auto-save indicator */
    savedIndicator: 'text-[11px] text-muted-foreground font-sans',
    /** Luxury bento preview frame — wraps the iframe */
    previewFrame: 'rounded-[24px] overflow-hidden border border-border/30 shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] bg-background',
  },
} as const;

// ========================================
// MOTION CONSTANTS
// ========================================
export const editorMotion = {
  /** Micro interactions (hover, toggle) */
  microMs: 0.15,
  /** Panel transitions (tab switch, inspector context change) */
  panelMs: 0.22,
  /** Modal transitions */
  modalMs: 0.24,
  /** Controlled cubic-bezier — no spring, no overshoot */
  easing: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number],
  /** Panel slide distance in px */
  slideDistance: 12,
} as const;
