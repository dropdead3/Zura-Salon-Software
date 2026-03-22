/**
 * Dock UI Tokens — Shared design constants for all Dock bottom sheets and overlays.
 * Every Dock sheet/overlay MUST use these tokens for consistency.
 */

export const DOCK_SHEET = {
  backdrop: 'absolute inset-0 bg-black/40 backdrop-blur-sm',
  panel: 'absolute inset-x-0 top-0 flex flex-col bg-[hsl(var(--platform-bg))] border-b border-[hsl(var(--platform-border))] rounded-b-2xl',
  dragHandle: 'mx-auto mt-3 h-1.5 w-12 rounded-full bg-[hsl(var(--platform-foreground-muted)/0.3)] shrink-0 cursor-grab active:cursor-grabbing touch-none',
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

export const DOCK_DIALOG = {
  overlay: 'absolute inset-0 z-50 bg-black/60 backdrop-blur-sm',
  content: 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-3rem)] max-w-sm bg-[hsl(var(--platform-bg-card))] border border-[hsl(var(--platform-border)/0.3)] rounded-2xl shadow-2xl p-6 space-y-4',
  title: 'font-display text-xl tracking-wide uppercase text-[hsl(var(--platform-foreground))]',
  description: 'text-sm leading-relaxed text-[hsl(var(--platform-foreground-muted))]',
  cancelButton: 'w-full h-12 rounded-full border border-[hsl(var(--platform-border)/0.3)] bg-transparent text-[hsl(var(--platform-foreground-muted))] hover:bg-[hsl(var(--platform-foreground-muted)/0.1)] font-medium transition-colors',
  destructiveAction: 'w-full h-12 rounded-full border-0 bg-red-500/20 text-red-400 hover:bg-red-500/30 font-display tracking-wide transition-colors',
  warningAction: 'w-full h-12 rounded-full border-0 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-display tracking-wide transition-colors',
  buttonRow: 'flex gap-3 pt-2',
} as const;
