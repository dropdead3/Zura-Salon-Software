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

/**
 * SPATIAL RULES — Container-Aware Responsiveness Doctrine
 * Full doctrine: mem://style/container-aware-responsiveness.md
 * Primitives: src/components/spatial/, hooks: src/lib/responsive/
 */
export const SPATIAL_RULES = {
  PRINCIPLE: 'Components measure their own container (ResizeObserver), not the viewport. Build state machines, not breakpoint dumps.',

  AUTHORED_STATES: ['default', 'compressed', 'compact', 'stacked'] as const,

  COMPRESSION_PHASES: [
    '1. Spacing (≥88% pressure): gap −12.5%, padding −8%',
    '2. Typography (≥92%): secondary/labels −1 step, never shrink primary numerics',
    '3. Truncation (≥95%): P3 → P2 → P1; never truncate money/time/percent',
    '4. Condensation (≥98%): labeled actions → icons, secondaries → overflow',
    '5. Structural shift: horizontal → hybrid → stacked. Never random wrap.',
  ],

  FLOORS: {
    cardPadding: '12px (p-3) — never below',
    controlGap: '8px (gap-2) — never below',
    tapTarget: '44px',
    textSupporting: '12px',
    textPrimaryCard: '14px',
    textMetadata: '11px',
  },

  CONTAINER_BREAKPOINTS: {
    threeColumn: '560px container width (NOT viewport)',
    twoColumn: '360px container width',
    stacked: '<360px container width',
  },

  PROHIBITED: [
    'sm:flex-row / md:grid-cols-2 on P0/P1 content without container measurement',
    'gap-1 (4px) between adjacent controls — floor is gap-2 (8px)',
    'Padding below p-3 (12px) on cards',
    'hidden md:block on P0/P1 elements (uses viewport, not container)',
    'Truncating money/time/percent values (use TruncatedText with kind="numeric")',
    'Random flex-wrap on action rows — use <OverflowActions> instead',
  ],

  PRIMITIVES: [
    '<AdaptiveCard density="large|standard|compact"> — measured wrapper with proportional padding/radius',
    '<AdaptiveCardHeader icon title actions /> — canonical header with collision logic',
    '<SpatialRow> — gap/wrap state machine',
    '<SpatialColumns minColumnWidth={160}> — 3 → 2 → stacked by measured width',
    '<OverflowActions actions={[{priority:"P0|P1|P2|P3"}]} /> — kebab collapse',
    '<TruncatedText kind="name|identifier|numeric|description|label" /> — strategy by content type',
    '<Priority level="P0|P1|P2|P3"> — visibility by container state',
  ],

  HOOKS: [
    'useContainerSize() — rAF-throttled ResizeObserver',
    'useSpatialState(density) — returns {ref, state, pressure, width}',
  ],

  AUDIT_WIDTHS: [1200, 960, 720, 560, 420, 320],
  AUDIT_ROUTE: '/dashboard/_internal/spatial-audit',
} as const;

export function isProhibitedFontWeight(className: string): boolean {
  return TYPOGRAPHY_RULES.PROHIBITED_CLASSES.some(
    prohibited => className.includes(prohibited)
  );
}
