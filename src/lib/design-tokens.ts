/**
 * ZURA DESIGN TOKEN SYSTEM
 * 
 * Importable, composable class-string constants that encode the full design system.
 * Every new component should use these tokens instead of raw class strings.
 * 
 * Usage:
 *   import { tokens } from '@/lib/design-tokens';
 *   <h1 className={tokens.heading.page}>Revenue</h1>
 *   <p className={cn(tokens.stat.large, isNegative && 'text-destructive')}>$12,400</p>
 */

export const tokens = {
  // ========================================
  // TYPOGRAPHY TOKENS
  // ========================================
  heading: {
    /** Page-level title: Termina, 2xl, medium, tracked */
    page: 'font-display text-2xl font-medium tracking-wide',
    /** Section header inside a page: Termina, base, uppercase, tracked */
    section: 'font-display text-base font-medium tracking-wide uppercase',
    /** Card title: Termina, base, tracked */
    card: 'font-display text-base font-medium tracking-wide',
    /** Small subsection label: uppercase, tiny, muted */
    subsection: 'font-display text-xs font-medium text-muted-foreground/60 uppercase tracking-[0.15em]',
  },

  body: {
    /** Default body text */
    default: 'font-sans text-sm text-foreground',
    /** Muted/secondary body text */
    muted: 'font-sans text-sm text-muted-foreground',
    /** Emphasized body text (font-medium, not bold) */
    emphasis: 'font-sans text-sm font-medium text-foreground',
  },

  label: {
    /** Standard form/UI label */
    default: 'font-sans text-sm font-medium',
    /** Tiny uppercase label (badges, metadata) */
    tiny: 'font-sans text-[10px] font-medium text-muted-foreground uppercase tracking-wider',
  },

  stat: {
    /** Large stat value (dashboard KPIs) */
    large: 'font-display text-2xl font-medium',
    /** Extra-large stat value (hero metrics) */
    xlarge: 'font-display text-3xl font-medium',
  },

  // ========================================
  // KPI TILE TOKENS
  // ========================================
  kpi: {
    /** KPI tile container (rounded, bordered, padded) */
    tile: 'rounded-lg border border-border/50 bg-muted/30 p-4 flex flex-col gap-1',
    /** KPI tile label: Termina, 11px, uppercase, tracked, muted */
    label: 'font-display text-[11px] font-medium text-muted-foreground uppercase tracking-wider',
    /** KPI tile value: Termina, xl, medium */
    value: 'font-display text-xl font-medium',
    /** KPI trend badge: 10px, medium */
    change: 'text-[10px] font-medium',
    /** Info icon pinned to top-right of KPI tile */
    infoIcon: 'absolute top-4 right-4',
  },

  // ========================================
  // PLATFORM KPI TILE TOKENS (Dark Theme)
  // ========================================
  platformKpi: {
    /** Dark-themed KPI tile container */
    tile: 'rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 flex flex-col gap-1',
    /** Dark-themed KPI tile label: Termina, 11px, uppercase, tracked */
    label: 'font-display text-[11px] font-medium text-slate-400 uppercase tracking-wider',
    /** Dark-themed KPI tile value: Termina, xl, medium */
    value: 'font-display text-xl font-medium text-white',
    /** KPI trend badge: 10px, medium */
    change: 'text-[10px] font-medium',
    /** Info icon pinned to top-right of KPI tile */
    infoIcon: 'absolute top-4 right-4',
  },

  // ========================================
  // CARD TOKENS
  // ========================================
  card: {
    /** Standard dashboard card wrapper */
    wrapper: 'rounded-xl',
    /** Nested card / subcard inside a parent card (level 2) */
    inner: 'bg-card-inner rounded-lg border border-border/50',
    /** Deeply nested card inside an already-nested card (level 3) */
    innerDeep: 'bg-card-inner-deep rounded-lg border border-border/50',
    /** Standard icon container (10×10, muted bg, rounded) */
    iconBox: 'w-10 h-10 bg-muted flex items-center justify-center rounded-lg shrink-0',
    /** Standard icon inside the icon box */
    icon: 'w-5 h-5 text-primary',
    /** Standard card title (Termina, base, tracked) */
    title: 'font-display text-base tracking-wide',
  },

  // ========================================
  // BUTTON SIZE TOKENS
  // ========================================
  button: {
    /** Inline / table-row actions — compact */
    inline: 'sm' as const,
    /** Card-level CTAs, secondary actions */
    card: 'sm' as const,
    /** Page header primary actions (default) */
    page: 'default' as const,
    /** Hero sections, onboarding, empty-state CTAs */
    hero: 'lg' as const,
    /** Card footer "View All" link style */
    cardFooter: 'w-full text-muted-foreground hover:text-foreground text-sm h-9',
    /** Card header action pill (outline variant) */
    cardAction: 'h-9 px-4 rounded-full text-sm font-sans font-medium',
    /** Inline ghost action — muted text, high-contrast on hover */
    inlineGhost: 'h-6 px-2 text-[10px] font-sans text-muted-foreground hover:text-primary-foreground hover:bg-primary/90 rounded-md transition-colors',
  },

  // ========================================
  // LAYOUT TOKENS
  // ========================================
  layout: {
    /** Canonical dashboard page padding — use on the first child inside DashboardLayout.
     *  Provides responsive horizontal padding, vertical breathing room, and section spacing.
     *  Rule: Every dashboard page MUST wrap its content in this token. */
    pageContainer: 'px-6 pb-6 lg:px-8 lg:pb-8 pt-4 lg:pt-6 space-y-6',
    /** Card base styling */
    cardBase: 'rounded-xl',
    /** Standard card padding */
    cardPadding: 'p-6',
    /** Filter strip row — right-aligns filter controls. Use below page headers or section headers. */
    filterRow: 'flex items-center justify-end gap-3 flex-wrap',
  },

  // ========================================
  // STATUS TOKENS (appointment/booking states)
  // ========================================
  status: {
    booked: 'bg-slate-100 text-slate-700',
    confirmed: 'bg-green-100 text-green-800',
    checked_in: 'bg-blue-100 text-blue-800',
    completed: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-red-100 text-red-800',
  },

  // ========================================
  // EMPTY STATE TOKENS
  // ========================================
  empty: {
    /** Centered empty state wrapper */
    container: 'text-center py-14',
    /** Ghosted icon */
    icon: 'w-12 h-12 mx-auto mb-4 opacity-20',
    /** Empty state heading */
    heading: 'font-medium text-lg mb-2',
    /** Empty state description */
    description: 'text-sm text-muted-foreground',
  },

  // ========================================
  // INPUT TOKENS
  // ========================================
  input: {
    /** Search input: subtle filled background with soft border */
    search: 'bg-muted/50 border-border/60',
    /** Filter dropdown: subtle filled background with soft border */
    filter: 'bg-muted/50 border-border/60',
  },

  // ========================================
  // TABLE TOKENS
  // ========================================
  table: {
    /** Column header: Aeonik Pro, small, medium weight, muted, tracked — NEVER uppercase */
    columnHeader: 'font-sans text-sm font-medium text-foreground/60 tracking-wider',
  },

  // ========================================
  // LOADING STATE TOKENS
  // ========================================
  loading: {
    /** Standard spinner */
    spinner: 'h-8 w-8 animate-spin text-muted-foreground',
    /** Skeleton row */
    skeleton: 'h-14 w-full',
  },

  // ========================================
  // SCROLLBAR TOKENS
  // ========================================
  scrollbar: {
    /** Base track: hidden by default, fades in on container hover */
    track: 'flex touch-none select-none bg-transparent opacity-0 transition-opacity duration-700 ease-in-out group-hover/scroll:opacity-100',
    /** Vertical track sizing — transparent border creates floating inset */
    trackV: 'h-full w-2.5 border-l-[3px] border-l-transparent',
    /** Horizontal track sizing — transparent border creates floating inset */
    trackH: 'h-2.5 flex-col border-t-[3px] border-t-transparent',
    /** Thumb: rounded pill, soft floating appearance */
    thumb: 'relative flex-1 rounded-full bg-foreground/15 hover:bg-foreground/30',
  },

  // ========================================
  // DRAWER / SHEET TOKENS (Luxury Glass Bento)
  // ========================================
  drawer: {
    /** Overlay: soft blur with reduced opacity black */
    overlay: 'backdrop-blur-sm bg-black/40',
    /** Content panel: glass bento aesthetic */
    content: 'bg-card/80 backdrop-blur-xl border-border shadow-2xl',
    /** Header: bottom-bordered with consistent padding */
    header: 'p-5 pb-3 border-b border-border/50',
    /** Scrollable body area */
    body: 'p-5 flex-1 min-h-0 overflow-y-auto',
    /** Footer: top-bordered with consistent padding */
    footer: 'p-5 pt-3 border-t border-border/50',
    /** Title: Termina, uppercase, tracked */
    title: 'font-display text-sm tracking-wide uppercase',
    /** Close button styling */
    closeButton: 'rounded-full bg-muted/60 hover:bg-muted transition-colors',
  },

  // ========================================
  // SHINE STROKE TOKENS
  // ========================================
  shine: {
    /** Outer wrapper: applies the rotating silver shine stroke. Requires silver-shine.css import. */
    border: 'silver-shine-border rounded-xl p-[1px]',
    /** Inner content wrapper: masks interior so shine is stroke-only */
    inner: 'silver-shine-inner block bg-background rounded-[calc(theme(borderRadius.xl)-1px)]',
    /** Button-specific border (rounded-md) */
    borderButton: 'silver-shine-border rounded-md p-[1px]',
    /** Button-specific inner (rounded-md) */
    innerButton: 'silver-shine-inner block bg-background rounded-[calc(theme(borderRadius.md)-1px)]',
  },

  // ========================================
  // TOAST TOKENS
  // ========================================
  toast: {
    /** Toast container: glass card with slight rounding — NEVER rounded-full or rounded-xl */
    container: 'bg-card/80 backdrop-blur-xl border-border/40 shadow-[0_16px_40px_-18px_hsl(var(--foreground)/0.25)] rounded-lg',
    /** Toast radius only — for overriding in third-party toast wrappers */
    radius: 'rounded-lg',
  },

  // ========================================
  // DIALOG CENTERING TOKENS
  // ========================================
  dialog: {
    /** CSS variable name used by DashboardLayout to offset dialog centering */
    sidebarOffsetVar: '--sidebar-offset',
    /** Centering rule: all fixed-position dialogs use left: calc(50% + var(--sidebar-offset, 0px)) for sidebar-aware centering */
    centeringNote: 'All fixed-position dialogs (Dialog, AlertDialog) use left: calc(50% + var(--sidebar-offset, 0px)) to center relative to the content area, not the full viewport.',
  },

  // ========================================
  // PAGE EXPLAINER TOKENS
  // ========================================
  explainer: {
    /** Outer container: blue ghost card */
    container: 'rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-5 pr-12',
    /** "Page Explainer" eyebrow label */
    eyebrow: 'font-display text-[10px] tracking-[0.1em] uppercase text-blue-400/70',
    /** Explainer title */
    title: 'font-display text-sm tracking-wide text-foreground',
    /** Explainer description text */
    description: 'text-sm text-muted-foreground leading-relaxed',
    /** Icon container box */
    iconBox: 'h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center',
    /** Icon inside box */
    icon: 'h-4 w-4 text-blue-400',
  },
} as const;

/**
 * CSS-level scrollbar constants (documentation-only — CSS cannot import JS).
 * Keep these in sync with the native scrollbar rules in index.css.
 */
export const SCROLLBAR_CSS = {
  COLOR_IDLE:    'transparent',
  COLOR_HOVER:   'hsl(var(--muted-foreground) / 0.25)',
  COLOR_ACTIVE:  'hsl(var(--muted-foreground) / 0.4)',
  WIDTH:         '8px',
  WIDTH_THIN:    '6px',
  WIDTH_MINIMAL: '4px',
} as const;

// ============================================================
// APPOINTMENT STATUS COLOR MAPS
// ============================================================
// Canonical status color definitions — import these instead of
// defining local STATUS_COLORS / STATUS_CONFIG in view components.

type AppointmentStatusKey = 'pending' | 'booked' | 'unconfirmed' | 'confirmed' | 'walk_in' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

/** Shared leading ear accent for schedule cards — a single purple signal across card variants. */
export const SCHEDULE_LEADING_ACCENT = 'bg-[hsl(var(--platform-primary))]';

/** Day / Week view appointment card colors (saturated for calendar cells, with dark mode variants) */
export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatusKey, { bg: string; border: string; text: string }> = {
  pending:      { bg: 'bg-amber-100 dark:bg-amber-800/60',         border: 'border-amber-400 dark:border-amber-700',               text: 'text-amber-900 dark:text-amber-200' },
  booked:       { bg: 'bg-amber-100 dark:bg-amber-800/60',         border: 'border-amber-400 dark:border-amber-700',               text: 'text-amber-900 dark:text-amber-200' },
  unconfirmed:  { bg: 'bg-amber-100 dark:bg-amber-800/60',         border: 'border-amber-400 dark:border-amber-700',               text: 'text-amber-900 dark:text-amber-200' },
  confirmed:    { bg: 'bg-green-500 dark:bg-green-700',            border: 'border-green-600 dark:border-green-900',               text: 'text-white dark:text-green-100' },
  walk_in:      { bg: 'bg-teal-500 dark:bg-teal-700',              border: 'border-teal-600 dark:border-teal-900',                 text: 'text-white dark:text-teal-100' },
  checked_in:   { bg: 'bg-blue-500 dark:bg-blue-700',              border: 'border-blue-600 dark:border-blue-900',                 text: 'text-white dark:text-blue-100' },
  completed:    { bg: 'bg-purple-500 dark:bg-purple-700',          border: 'border-purple-600 dark:border-purple-900',             text: 'text-white dark:text-purple-100' },
  cancelled:    { bg: 'bg-muted/50 dark:bg-muted/30',              border: 'border-muted dark:border-muted/50',                    text: 'text-muted-foreground' },
  no_show:      { bg: 'bg-destructive dark:bg-destructive/80',     border: 'border-destructive',                                    text: 'text-destructive-foreground' },
};

/** Agenda / badge / pastel variant colors */
export const APPOINTMENT_STATUS_BADGE: Record<AppointmentStatusKey, { bg: string; text: string; border: string; label: string; shortLabel: string }> = {
  pending:      { bg: 'bg-amber-100 dark:bg-amber-900/30',   text: 'text-amber-800 dark:text-amber-300',   border: 'border-amber-800/30 dark:border-amber-300/30',   label: 'Pending',     shortLabel: 'Pend' },
  booked:       { bg: 'bg-amber-100 dark:bg-amber-900/30',   text: 'text-amber-800 dark:text-amber-300',   border: 'border-amber-800/30 dark:border-amber-300/30',   label: 'Unconfirmed', shortLabel: 'Unconf' },
  unconfirmed:  { bg: 'bg-amber-100 dark:bg-amber-900/30',   text: 'text-amber-800 dark:text-amber-300',   border: 'border-amber-800/30 dark:border-amber-300/30',   label: 'Unconfirmed', shortLabel: 'Unconf' },
  confirmed:    { bg: 'bg-green-100 dark:bg-green-900/30',   text: 'text-green-800 dark:text-green-300',   border: 'border-green-800/30 dark:border-green-300/30',   label: 'Confirmed',   shortLabel: 'Conf' },
  walk_in:      { bg: 'bg-teal-100 dark:bg-teal-900/30',     text: 'text-teal-800 dark:text-teal-300',     border: 'border-teal-800/30 dark:border-teal-300/30',     label: 'Walk-In',     shortLabel: 'Walk' },
  checked_in:   { bg: 'bg-blue-100 dark:bg-blue-900/30',     text: 'text-blue-800 dark:text-blue-300',     border: 'border-blue-800/30 dark:border-blue-300/30',     label: 'Checked In',  shortLabel: 'In' },
  completed:    { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300', border: 'border-purple-800/30 dark:border-purple-300/30', label: 'Completed',   shortLabel: 'Done' },
  cancelled:    { bg: 'bg-red-100 dark:bg-red-900/30',       text: 'text-red-800 dark:text-red-300',       border: 'border-red-800/30 dark:border-red-300/30',       label: 'Cancelled',   shortLabel: 'Can' },
  no_show:      { bg: 'bg-red-100 dark:bg-red-900/30',       text: 'text-red-800 dark:text-red-300',       border: 'border-red-800/30 dark:border-red-300/30',       label: 'No Show',     shortLabel: 'NS' },
};

/** Full status config used by usePhorestCalendar (includes border + label) */
export const APPOINTMENT_STATUS_CONFIG: Record<AppointmentStatusKey, {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  pending:      { color: 'text-amber-900',  bgColor: 'bg-amber-200',  borderColor: 'border-amber-500',  label: 'Pending' },
  booked:       { color: 'text-amber-900',  bgColor: 'bg-amber-200',  borderColor: 'border-amber-500',  label: 'Unconfirmed' },
  unconfirmed:  { color: 'text-amber-900',  bgColor: 'bg-amber-200',  borderColor: 'border-amber-500',  label: 'Unconfirmed' },
  confirmed:    { color: 'text-green-900',  bgColor: 'bg-green-200',  borderColor: 'border-green-500',  label: 'Confirmed' },
  walk_in:      { color: 'text-teal-900',   bgColor: 'bg-teal-200',   borderColor: 'border-teal-500',   label: 'Walk-In' },
  checked_in:   { color: 'text-blue-900',   bgColor: 'bg-blue-200',   borderColor: 'border-blue-500',   label: 'Checked In' },
  completed:    { color: 'text-purple-900', bgColor: 'bg-purple-200', borderColor: 'border-purple-500', label: 'Completed' },
  cancelled:    { color: 'text-red-900',    bgColor: 'bg-red-200',    borderColor: 'border-red-500',    label: 'Cancelled' },
  no_show:      { color: 'text-red-900',    bgColor: 'bg-red-200',    borderColor: 'border-red-500',     label: 'No Show' },
};

/**
 * Helper to get the right token for a common UI context.
 * 
 * @example
 *   getTokenFor('page-title')  // => tokens.heading.page
 *   getTokenFor('stat')        // => tokens.stat.large
 */
export function getTokenFor(context: 
  | 'page-title' 
  | 'section-title' 
  | 'card-title'
  | 'subsection-title'
  | 'body' 
  | 'body-muted'
  | 'body-emphasis'
  | 'label'
  | 'label-tiny'
  | 'stat'
  | 'stat-xl'
  | 'kpi-label'
  | 'kpi-value'
  | 'table-column-header'
  | 'empty-heading'
  | 'empty-description'
  | 'scrollbar-track'
  | 'scrollbar-thumb'
  | 'shine-border'
  | 'shine-inner'
  | 'drawer-overlay'
  | 'drawer-content'
  | 'drawer-header'
  | 'drawer-body'
  | 'drawer-footer'
  | 'drawer-title'
  | 'toast-container'
): string {
  const map: Record<string, string> = {
    'page-title': tokens.heading.page,
    'section-title': tokens.heading.section,
    'card-title': tokens.heading.card,
    'subsection-title': tokens.heading.subsection,
    'body': tokens.body.default,
    'body-muted': tokens.body.muted,
    'body-emphasis': tokens.body.emphasis,
    'label': tokens.label.default,
    'label-tiny': tokens.label.tiny,
    'stat': tokens.stat.large,
    'stat-xl': tokens.stat.xlarge,
    'kpi-label': tokens.kpi.label,
    'kpi-value': tokens.kpi.value,
    'table-column-header': tokens.table.columnHeader,
    'empty-heading': tokens.empty.heading,
    'empty-description': tokens.empty.description,
    'scrollbar-track': tokens.scrollbar.track,
    'scrollbar-thumb': tokens.scrollbar.thumb,
    'shine-border': tokens.shine.border,
    'shine-inner': tokens.shine.inner,
    'drawer-overlay': tokens.drawer.overlay,
    'drawer-content': tokens.drawer.content,
    'drawer-header': tokens.drawer.header,
    'drawer-body': tokens.drawer.body,
    'drawer-footer': tokens.drawer.footer,
    'drawer-title': tokens.drawer.title,
    'toast-container': tokens.toast.container,
  };
  return map[context] ?? tokens.body.default;
}
