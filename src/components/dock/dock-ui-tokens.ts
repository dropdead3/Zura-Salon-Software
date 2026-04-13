/**
 * Dock UI Tokens — Shared design constants for all Dock bottom sheets and overlays.
 * Every Dock sheet/overlay MUST use these tokens for consistency.
 */

export const DOCK_SHEET = {
  backdrop: 'absolute inset-0 bg-black/40 backdrop-blur-sm',
  panel: 'absolute inset-x-0 top-0 flex flex-col bg-[hsl(var(--platform-bg))] border-b border-[hsl(var(--platform-border))] rounded-b-2xl',
  dragHandle: 'mx-auto h-1.5 w-12 rounded-full bg-[hsl(var(--platform-foreground-muted)/0.3)] shrink-0',
  dragHandleWrapperBottom: 'flex justify-center pt-4 pb-6 w-full cursor-grab active:cursor-grabbing touch-none',
  maxHeight: '92%',
  spring: { type: 'spring' as const, damping: 26, stiffness: 300, mass: 0.8 },
  dismissThreshold: { offset: 120, velocity: 500 },
} as const;

export const DOCK_TEXT = {
  title: 'font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))]',
  subtitle: 'text-sm text-[hsl(var(--platform-foreground-muted))]',
  category: 'text-xs font-display uppercase tracking-wider text-[hsl(var(--platform-foreground-muted))]',
  body: 'text-sm text-[hsl(var(--platform-foreground))]',
  muted: 'text-xs text-[hsl(var(--platform-foreground-muted))]',
} as const;

export const DOCK_INPUT = {
  search: 'w-full h-10 pl-10 pr-3 text-sm rounded-xl bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] text-[hsl(var(--platform-foreground))] placeholder:text-[hsl(var(--platform-foreground-muted)/0.5)] focus:outline-none focus:ring-1 focus:ring-violet-500/50',
} as const;

export const DOCK_BUTTON = {
  primary: 'bg-violet-500 hover:bg-violet-600 text-white rounded-full',
  close: 'p-1.5 rounded-full hover:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors',
  iconColor: 'text-[hsl(var(--platform-foreground-muted))]',
} as const;

export const DOCK_BADGE = {
  /** Base classes for all Dock pill badges — font-sans (Aeonik Pro), NEVER font-display */
  base: 'text-[11px] font-sans whitespace-nowrap px-2.5 py-0.5 rounded-full border',

  /** Payment variants */
  paid:               'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  unpaid:             'bg-red-500/15 text-red-400 border-red-500/25',
  refunded:           'bg-slate-500/15 text-slate-400 border-slate-500/25',
  partiallyRefunded:  'bg-amber-500/15 text-amber-400 border-amber-500/25',
  failed:             'bg-red-500/15 text-red-400 border-red-500/25',
  comp:               'bg-[hsl(var(--platform-foreground-muted)/0.15)] text-[hsl(var(--platform-foreground-muted))] border-[hsl(var(--platform-foreground-muted)/0.3)]',

  /** Retry action pill — inline with Failed badge */
  retryAction:        'bg-violet-500/15 text-violet-400 border-violet-500/25 hover:bg-violet-500/25 active:scale-[0.96] cursor-pointer transition-all',

  /** Status variants */
  noShow:    'bg-amber-500/15 text-amber-400 border-amber-500/25',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/25',

  /** Bowl count variants */
  bowlsMixed:   'bg-sky-500/15 text-sky-300 border-sky-400/25',
  noBowlsMixed: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
  noChemical:   'bg-slate-500/15 text-slate-400 border-slate-400/25',

  /** Client profile variants */
  visits:       'bg-violet-500/10 text-violet-400 border-violet-500/20',
  clvPlatinum:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
  clvGold:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
  clvSilver:    'bg-slate-400/10 text-slate-400 border-slate-400/20',
  clvBronze:    'bg-orange-500/10 text-orange-400 border-orange-500/20',
  firstVisit:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  noShowRisk:   'bg-rose-500/10 text-rose-400 border-rose-500/20',
  neutral:      'bg-[hsl(var(--platform-bg-elevated))] text-[hsl(var(--platform-foreground-muted))] border-[hsl(var(--platform-border)/0.2)]',
  preferred:    'bg-violet-500/10 text-violet-400 border-violet-500/20',

  /** System indicator */
  demo:         'bg-amber-500/20 text-amber-300 border-amber-500/30',
} as const;

export const DOCK_TABS = {
  bar: 'flex gap-1 bg-[hsl(var(--platform-bg-card))] rounded-full p-2 border border-[hsl(var(--platform-border)/0.2)]',
  trigger: 'flex items-center justify-center gap-1.5 flex-1 h-12 rounded-full text-sm font-medium transition-all duration-150',
  triggerActive: 'bg-violet-600/30 text-violet-300',
  triggerInactive: 'text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]',
  icon: 'w-4 h-4',
} as const;

export const DOCK_CONTENT = {
  /** Section headers (e.g. "Booking Note", "Team Notes") */
  sectionHeader: 'text-sm font-display uppercase tracking-wider text-[hsl(var(--platform-foreground-muted))]',
  /** Body text in cards */
  body: 'text-sm text-[hsl(var(--platform-foreground))]',
  bodyMuted: 'text-sm text-[hsl(var(--platform-foreground-muted))]',
  /** Small supporting text (dates, counts, staff names) */
  caption: 'text-xs text-[hsl(var(--platform-foreground-muted))]',
  captionDim: 'text-xs text-[hsl(var(--platform-foreground-muted)/0.5)]',
  /** Section icons */
  sectionIcon: 'w-5 h-5',
  /** Card padding */
  cardPadding: 'px-4 py-3.5',
  /** Input fields */
  input: 'h-12 px-4 text-sm rounded-xl',
  /** Avatars in thread */
  avatar: 'w-8 h-8',
  avatarFallback: 'text-[10px]',
  /** Card icon containers */
  iconBox: 'w-5 h-5',
} as const;

export const DOCK_CARD = {
  /** Outer card wrapper */
  wrapper: 'w-full text-left rounded-xl p-5 border transition-all duration-150 min-h-[180px] flex flex-col bg-[hsl(var(--platform-bg-card))] border-[hsl(var(--platform-border)/0.3)] hover:border-[hsl(var(--platform-border)/0.5)] active:scale-[0.98]',
  /** Icon box in card header */
  iconBox: 'w-12 h-12 rounded-lg border flex items-center justify-center flex-shrink-0',
  /** Icon inside iconBox */
  icon: 'w-5 h-5',
  /** Card title — e.g. "BOWL 1", "BOTTLE 2" */
  title: 'font-display text-base tracking-wide uppercase text-[hsl(var(--platform-foreground))]',
  /** Status label below title — e.g. "Draft", "Active" */
  statusLabel: 'text-sm mt-0.5',
  /** Supporting info — e.g. "Mixed by Demo Stylist" */
  meta: 'text-sm text-[hsl(var(--platform-foreground-muted)/0.6)]',
  /** Flagged/warning text */
  flag: 'text-xs text-amber-400/70',
  /** Notes / description preview */
  notes: 'text-sm text-[hsl(var(--platform-foreground-muted)/0.5)] truncate',
  /** Ingredient line text in demo cards */
  ingredientLine: 'text-sm text-[hsl(var(--platform-foreground-muted)/0.6)] truncate leading-snug',
  ingredientName: 'text-[hsl(var(--platform-foreground-muted)/0.8)]',
  /** Overflow "+N more" text */
  overflow: 'text-xs text-[hsl(var(--platform-foreground-muted)/0.4)]',
  /** Footer stats row */
  footer: 'mt-2 pt-2 border-t border-[hsl(var(--platform-border)/0.15)] flex items-center justify-between',
  footerText: 'text-xs text-[hsl(var(--platform-foreground-muted)/0.5)]',
  /** Menu button */
  menuButton: 'p-1 -mr-1 rounded-full hover:bg-[hsl(var(--platform-foreground)/0.1)] transition-colors',
  menuIcon: 'w-6 h-6 text-[hsl(var(--platform-foreground-muted)/0.4)] flex-shrink-0',
  /** Add card specific */
  addWrapper: 'w-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed min-h-[180px] border-violet-500/30 text-violet-400 hover:bg-violet-600/10 hover:border-violet-500/50 active:scale-[0.98] transition-all duration-150 disabled:opacity-40',
  addIconBox: 'w-14 h-14 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center',
  addIcon: 'w-7 h-7',
  addLabel: 'text-sm font-medium',
} as const;

export const DOCK_DIALOG = {
  overlay: 'absolute inset-0 z-50 bg-black/60 backdrop-blur-sm',
  content: 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-3rem)] max-w-sm bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] rounded-2xl shadow-2xl p-6 space-y-4',
  title: 'font-display text-xl tracking-wide uppercase text-[hsl(var(--platform-foreground))]',
  description: 'text-sm leading-relaxed text-[hsl(var(--platform-foreground-muted))]',
  cancelButton: 'w-full h-12 rounded-full border border-[hsl(var(--platform-border)/0.3)] bg-transparent text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-foreground-muted)/0.1)] font-medium transition-colors',
  destructiveAction: 'w-full h-12 rounded-full border-0 bg-red-500/20 text-red-400 hover:bg-red-500/30 font-display tracking-wide transition-colors',
  warningAction: 'w-full h-12 rounded-full border-0 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-display tracking-wide transition-colors',
  retryAction: 'w-full h-12 rounded-full border-0 bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 font-display tracking-wide transition-colors',
  buttonRow: 'flex gap-3 pt-2',
} as const;
