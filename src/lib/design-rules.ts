/**
 * PLATFORM DESIGN SYSTEM RULES
 * 
 * HARD RULES - VIOLATIONS BREAK VISUAL CONSISTENCY
 * 
 * These rules MUST be followed across all components.
 * Violations will cause visual inconsistencies and synthetic font rendering.
 * 
 * For importable class-string constants, use:
 *   import { tokens, getTokenFor } from '@/lib/design-tokens';
 */

// Re-export the token system for convenience
export { tokens, getTokenFor } from './design-tokens';

export const TYPOGRAPHY_RULES = {
  MAX_FONT_WEIGHT: 500,
  
  PROHIBITED_CLASSES: [
    'font-bold',      // Weight 700 - BANNED
    'font-semibold',  // Weight 600 - BANNED
    'font-extrabold', // Weight 800 - BANNED
    'font-black',     // Weight 900 - BANNED
  ],
  
  ALLOWED_CLASSES: [
    'font-light',     // Weight 300
    'font-normal',    // Weight 400
    'font-medium',    // Weight 500 - MAXIMUM
  ],
  
  FONT_RULES: {
    'font-display': {
      font: 'Termina',
      maxWeight: 500,
      transform: 'uppercase',
      letterSpacing: '0.08em',
      usage: 'Headlines, buttons, navigation, stats'
    },
    'font-sans': {
      font: 'Aeonik Pro',
      maxWeight: 500,
      transform: 'normal',
      usage: 'Body text, paragraphs, UI labels, descriptions'
    }
  },
  
  EMPHASIS_ALTERNATIVES: [
    'Use font-display for headlines (automatic uppercase + tracking)',
    'Increase font size (text-lg, text-xl, text-2xl)',
    'Use color contrast (text-foreground vs text-muted-foreground)',
    'Add letter-spacing (tracking-wide, tracking-wider)',
    'Use borders or backgrounds to create visual separation',
    'Import tokens from @/lib/design-tokens for consistent class strings',
    'KPI tile labels MUST use tokens.kpi.label (Termina) — never font-sans for uppercase metric labels',
    'Table column headers MUST use tokens.table.columnHeader (Aeonik Pro, Title Case) — NEVER uppercase',
    'All Sheet/Drawer components inherit glass bento defaults from primitives — DO NOT override with bg-background or bg-card',
    'Drawer/Sheet tokens: tokens.drawer.overlay, tokens.drawer.content, tokens.drawer.header, tokens.drawer.title',
  ],

  DRAWER_SHEET_RULES: {
    aesthetic: 'Luxury Glass Bento — bg-card/80, backdrop-blur-xl, border-border, shadow-2xl',
    overlay: 'backdrop-blur-sm bg-black/40 (NOT bg-black/80)',
    header: 'p-5 pb-3 border-b border-border/50 — text-left by default',
    title: 'font-display text-sm tracking-wide uppercase (Termina)',
    closeButton: 'rounded-full bg-muted/60 hover:bg-muted',
    body: 'p-5 — no p-6, no raw padding overrides',
    footer: 'p-5 pt-3 border-t border-border/50',
    prohibited: ['bg-background on SheetContent', 'bg-black/80 overlay', 'p-6 shadow-lg', 'font-bold on titles'],
    token: 'tokens.drawer.*',
  },

  TABLE_COLUMN_HEADER_RULES: {
    font: 'Aeonik Pro (font-sans)',
    capitalization: 'Title Case — NEVER uppercase',
    token: 'tokens.table.columnHeader',
    prohibited: ['uppercase', 'font-display on column headers'],
  },

  TOAST_RULES: {
    radius: 'rounded-lg (8px) — Level 1 radius, consistent with inner cards',
    aesthetic: 'Glass bento — bg-card/80, backdrop-blur-xl, border-border/40, shadow-[0_16px_40px_-18px_hsl(var(--foreground)/0.25)]',
    token: 'tokens.toast.container / tokens.toast.radius',
    prohibited: ['rounded-full on toasts', 'rounded-xl on toasts', 'rounded-2xl on toasts', 'pill-shaped toasts'],
    note: 'Toasts are rectangular with slightly rounded corners. Never pill-shaped.',
  },

  TAB_RULES: {
    defaultTab: 'Pages with tabs MUST default-land on the first tab in the list',
    controlled: 'useState initial value must match the first TabsTrigger value',
    uncontrolled: 'Tabs defaultValue must match the first TabsTrigger value',
    prohibited: ['Initializing tab state to a non-first tab without URL param override'],
    note: 'URL search params (e.g. ?tab=inventory) may override the default, but the fallback must always be the first tab.',
  },

  DOCK_BADGE_RULES: {
    font: 'Aeonik Pro (font-sans) — NEVER font-display / Termina',
    shape: 'rounded-full pill',
    token: 'DOCK_BADGE from dock-ui-tokens.ts — base + variant',
    prohibited: ['font-display on badges', 'font-bold on badges', 'uppercase on badges', 'inline hardcoded badge classes'],
    note: 'All Dock badges use DOCK_BADGE.base for shared sizing/font and a variant key for color. Ghost style: low-opacity bg + border.',
  },
  PAGE_EXPLAINER_RULES: {
    required: 'Every dashboard page MUST include a <PageExplainer pageId="..." /> component',
    registry: 'Content must be registered in src/config/pageExplainers.ts before use',
    placement: 'Immediately after DashboardPageHeader, before main content',
    component: '<PageExplainer> from @/components/ui/PageExplainer.tsx',
    styling: 'Blue ghost aesthetic — bg-blue-500/[0.04], border-blue-500/20, BookOpen icon',
    prohibited: ['Inline explainer content (use registry)', 'Skipping explainer on new pages'],
  },

  DIALOG_CENTERING_RULES: {
    rule: 'All Dialog and AlertDialog surfaces MUST use left: calc(50% + var(--sidebar-offset, 0px)) via inline style',
    variable: '--sidebar-offset is set by DashboardLayout: 170px expanded, 48px collapsed, 0px hidden/mobile',
    prohibited: ['left-[50%] in className on dialog content', 'Hardcoded left positioning ignoring sidebar'],
    token: 'tokens.dialog.sidebarOffsetVar',
  },
} as const;

export function isProhibitedFontWeight(className: string): boolean {
  return TYPOGRAPHY_RULES.PROHIBITED_CLASSES.some(
    prohibited => className.includes(prohibited)
  );
}
