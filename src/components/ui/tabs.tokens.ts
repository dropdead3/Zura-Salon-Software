export const TABS_CLASSES = {
  list: "inline-flex h-11 items-center justify-center p-1.5 text-muted-foreground gap-1 bg-muted border border-border/70 dark:bg-muted/70 dark:border-transparent rounded-[9px]",
  trigger: [
    "inline-flex items-center justify-center whitespace-nowrap rounded-[6px] px-3.5 py-1.5 text-sm font-medium transition-all",
    "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border dark:data-[state=active]:bg-white/[0.08] dark:data-[state=active]:ring-white/[0.12] data-[state=active]:backdrop-blur-sm",
    "data-[state=inactive]:hover:ring-1 data-[state=inactive]:hover:ring-border/60 dark:data-[state=inactive]:hover:ring-white/[0.08] data-[state=inactive]:hover:text-foreground/80",
    "focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  ].join(" "),
  content:
    "mt-6 focus-visible:outline-none",

  subList: "inline-flex h-10 items-center gap-4 bg-transparent p-0 text-muted-foreground",
  subTrigger:
    "inline-flex items-center gap-2 px-2 py-2 text-sm font-medium border-b-2 border-transparent rounded-t-md transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 hover:text-foreground hover:bg-muted/50 data-[state=active]:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent",

  filterList: "inline-flex h-8 items-center justify-center p-1 text-muted-foreground gap-1 bg-muted ring-1 ring-border/70 dark:bg-muted/70 dark:ring-transparent rounded-[7px]",
  filterTrigger: [
    "inline-flex items-center justify-center whitespace-nowrap rounded-[5px] px-2.5 py-1 text-xs font-medium transition-all",
    "data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border dark:data-[state=active]:bg-white/[0.08] dark:data-[state=active]:ring-white/[0.12] data-[state=active]:backdrop-blur-sm",
    "data-[state=inactive]:hover:ring-1 data-[state=inactive]:hover:ring-border/60 dark:data-[state=inactive]:hover:ring-white/[0.08] data-[state=inactive]:hover:text-foreground/80",
    "focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  ].join(" "),
} as const;

export const RESPONSIVE_TABS_LAYOUT = {
  overflowButtonWidth: 36, // w-9
  listToOverflowGapPx: 4, // gap-1
  rightSafeInsetPx: 6,
  epsilonPx: 1,
} as const;

export const RESPONSIVE_TABS_CLASSES = {
  wrapper: "w-full min-w-0 max-w-full",
  list: "w-auto max-w-full min-w-0 justify-start overflow-hidden",
  overflowTrigger: [
    "inline-flex h-9 w-9 items-center justify-center rounded-[6px] transition-colors",
    "text-muted-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-foreground",
    "focus-visible:outline-none",
  ].join(" "),
  overflowMenuItem:
    "w-full px-3 py-2 text-sm text-left rounded-[6px] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors",
} as const;
