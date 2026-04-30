/**
 * EDITOR SECTION CARD
 *
 * Floating bento card wrapper for sections in the editor canvas preview.
 * Only renders when ?preview=true is in the URL (editor mode).
 * Does NOT affect public-facing site rendering.
 *
 * Hover affordances (top-right header):
 *   1. Identity chip (section label).
 *   2. **Style chips** (Square-style quick presets) — cycle through BG /
 *      Spacing / Width without opening the full panel. One tap = visible
 *      change. Long-press / "More" still opens the full SectionStyleEditor.
 *   3. Structural icons: drag, duplicate, hide, more.
 *
 * Style chips post `EDITOR_APPLY_STYLE_PRESET` to the parent. The shell maps
 * `{ key, value }` into a `style_overrides` patch and persists via the
 * existing `updatePages` mutation, which means chip changes flow through
 * the same dirty-state, undo, and audit logging path as any other section
 * write.
 */

import { useState, useCallback, useMemo, type ReactNode } from 'react';
import {
  GripVertical,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  Trash2,
  Palette,
  Maximize2,
  ArrowUpDown,
  Paintbrush,
  Type,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StyleOverrides } from '@/components/home/SectionStyleWrapper';

interface EditorSectionCardProps {
  sectionId: string;
  sectionLabel: string;
  enabled: boolean;
  isSelected: boolean;
  fullBleed?: boolean;
  /** Current style overrides — used to render chip active state. */
  styleOverrides?: Partial<StyleOverrides>;
  children: ReactNode;
}

// ─── Chip preset cycles ───
// Each cycle returns the NEXT value given the current one. Chips wrap.
// Keeping the cycles short (3–4 stops) so a couple taps reach any state.

type SpacingStop = { label: string; top: number; bottom: number };
const SPACING_STOPS: SpacingStop[] = [
  { label: 'Default', top: 0, bottom: 0 },
  { label: 'Cozy', top: 48, bottom: 48 },
  { label: 'Roomy', top: 96, bottom: 96 },
  { label: 'Epic', top: 160, bottom: 160 },
];

type WidthStop = { label: string; value: StyleOverrides['max_width'] };
const WIDTH_STOPS: WidthStop[] = [
  { label: 'Full', value: 'full' },
  { label: 'XL', value: 'xl' },
  { label: 'LG', value: 'lg' },
  { label: 'MD', value: 'md' },
];

type BgStop = {
  label: string;
  type: StyleOverrides['background_type'];
  value: string;
};
// Theme-aware tones via HSL CSS variables. `none` resets to inheritance.
const BG_STOPS: BgStop[] = [
  { label: 'Inherit', type: 'none', value: '' },
  { label: 'Muted', type: 'color', value: 'hsl(var(--muted))' },
  { label: 'Secondary', type: 'color', value: 'hsl(var(--secondary))' },
  { label: 'Contrast', type: 'color', value: 'hsl(var(--foreground))' },
];

function nextSpacing(current: { top: number; bottom: number }): SpacingStop {
  const idx = SPACING_STOPS.findIndex(
    (s) => s.top === current.top && s.bottom === current.bottom,
  );
  return SPACING_STOPS[(idx + 1 + SPACING_STOPS.length) % SPACING_STOPS.length] ??
    SPACING_STOPS[1];
}

function nextWidth(current: StyleOverrides['max_width']): WidthStop {
  const idx = WIDTH_STOPS.findIndex((s) => s.value === current);
  return WIDTH_STOPS[(idx + 1 + WIDTH_STOPS.length) % WIDTH_STOPS.length] ?? WIDTH_STOPS[0];
}

function nextBg(current: { type: StyleOverrides['background_type']; value: string }): BgStop {
  const idx = BG_STOPS.findIndex(
    (s) => s.type === current.type && s.value === current.value,
  );
  return BG_STOPS[(idx + 1 + BG_STOPS.length) % BG_STOPS.length] ?? BG_STOPS[0];
}

// Active-state detection — the chip lights up whenever the section deviates
// from the inherit/default stop, so operators can tell at a glance which
// dimensions they've customized.
function isSpacingActive(o: Partial<StyleOverrides>): boolean {
  return (o.padding_top ?? 0) > 0 || (o.padding_bottom ?? 0) > 0;
}
function isWidthActive(o: Partial<StyleOverrides>): boolean {
  return !!o.max_width && o.max_width !== 'full';
}
function isBgActive(o: Partial<StyleOverrides>): boolean {
  return !!o.background_type && o.background_type !== 'none' && !!o.background_value;
}

export function EditorSectionCard({
  sectionId,
  sectionLabel,
  enabled,
  isSelected,
  fullBleed = false,
  styleOverrides,
  children,
}: EditorSectionCardProps) {
  const [showOverflow, setShowOverflow] = useState(false);
  const overrides = styleOverrides ?? {};

  const sendMessage = useCallback((type: string, payload?: Record<string, unknown>) => {
    window.parent.postMessage({ type, sectionId, ...payload }, window.location.origin);
  }, [sectionId]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't select if clicking controls
    if ((e.target as HTMLElement).closest('[data-editor-control]')) return;
    sendMessage('EDITOR_SELECT_SECTION');
  }, [sendMessage]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    sendMessage('EDITOR_TOGGLE_SECTION', { enabled: !enabled });
  }, [sendMessage, enabled]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    sendMessage('EDITOR_DUPLICATE_SECTION');
  }, [sendMessage]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOverflow(false);
    sendMessage('EDITOR_DELETE_SECTION');
  }, [sendMessage]);

  const handleOpenStyle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOverflow(false);
    sendMessage('EDITOR_OPEN_STYLE');
  }, [sendMessage]);

  // ─── Chip handlers — each cycles to the next preset and posts a patch ───
  const handleCycleBg = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const next = nextBg({
      type: overrides.background_type ?? 'none',
      value: overrides.background_value ?? '',
    });
    sendMessage('EDITOR_APPLY_STYLE_PRESET', {
      patch: { background_type: next.type, background_value: next.value },
      label: `Background: ${next.label}`,
    });
  }, [sendMessage, overrides.background_type, overrides.background_value]);

  const handleCycleSpacing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const next = nextSpacing({
      top: overrides.padding_top ?? 0,
      bottom: overrides.padding_bottom ?? 0,
    });
    sendMessage('EDITOR_APPLY_STYLE_PRESET', {
      patch: { padding_top: next.top, padding_bottom: next.bottom },
      label: `Spacing: ${next.label}`,
    });
  }, [sendMessage, overrides.padding_top, overrides.padding_bottom]);

  const handleCycleWidth = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const next = nextWidth(overrides.max_width ?? 'full');
    sendMessage('EDITOR_APPLY_STYLE_PRESET', {
      patch: { max_width: next.value },
      label: `Width: ${next.label}`,
    });
  }, [sendMessage, overrides.max_width]);

  // Tooltips show the NEXT value so operators know what a tap will do.
  const bgTooltip = useMemo(() => {
    const cur = BG_STOPS.find(
      (s) => s.type === (overrides.background_type ?? 'none') &&
        s.value === (overrides.background_value ?? ''),
    );
    const nxt = nextBg({
      type: overrides.background_type ?? 'none',
      value: overrides.background_value ?? '',
    });
    return `Background: ${cur?.label ?? 'Custom'} → ${nxt.label}`;
  }, [overrides.background_type, overrides.background_value]);

  const spacingTooltip = useMemo(() => {
    const cur = SPACING_STOPS.find(
      (s) => s.top === (overrides.padding_top ?? 0) && s.bottom === (overrides.padding_bottom ?? 0),
    );
    const nxt = nextSpacing({
      top: overrides.padding_top ?? 0,
      bottom: overrides.padding_bottom ?? 0,
    });
    return `Spacing: ${cur?.label ?? 'Custom'} → ${nxt.label}`;
  }, [overrides.padding_top, overrides.padding_bottom]);

  const widthTooltip = useMemo(() => {
    const cur = WIDTH_STOPS.find((s) => s.value === (overrides.max_width ?? 'full'));
    const nxt = nextWidth(overrides.max_width ?? 'full');
    return `Width: ${cur?.label ?? 'Custom'} → ${nxt.label}`;
  }, [overrides.max_width]);

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative transition-all duration-200',
        'cursor-pointer',
        isSelected && 'ring-2 ring-primary/20 ring-offset-2 ring-offset-background',
        !enabled && 'opacity-50'
      )}
    >
      {/* Hover header row */}
      <div
        data-editor-control
        className={cn(
          'absolute top-3 left-4 right-4 flex items-center justify-between gap-3',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          'pointer-events-none group-hover:pointer-events-auto',
          'z-10'
        )}
      >
        {/* Section name + style chips */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-sans text-muted-foreground/70 truncate max-w-[140px]">
            {sectionLabel}
          </span>
          {/* ── Style chips ── */}
          <div className="flex items-center gap-1">
            <StyleChip
              icon={<Paintbrush className="h-3 w-3" />}
              label="BG"
              active={isBgActive(overrides)}
              tooltip={bgTooltip}
              onClick={handleCycleBg}
            />
            <StyleChip
              icon={<ArrowUpDown className="h-3 w-3" />}
              label="Pad"
              active={isSpacingActive(overrides)}
              tooltip={spacingTooltip}
              onClick={handleCycleSpacing}
            />
            <StyleChip
              icon={<Maximize2 className="h-3 w-3" />}
              label="Width"
              active={isWidthActive(overrides)}
              tooltip={widthTooltip}
              onClick={handleCycleWidth}
            />
          </div>
        </div>

        {/* Structural controls */}
        <div className="flex items-center gap-0.5">
          <button
            data-editor-control
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors cursor-grab"
            title="Drag to reorder"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            data-editor-control
            onClick={handleDuplicate}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            data-editor-control
            onClick={handleToggle}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
            title={enabled ? 'Hide section' : 'Show section'}
          >
            {enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <div className="relative">
            <button
              data-editor-control
              onClick={(e) => { e.stopPropagation(); setShowOverflow(prev => !prev); }}
              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
              title="More options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {showOverflow && (
              <div
                data-editor-control
                className="absolute right-0 top-7 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px] z-20"
              >
                <button
                  onClick={handleOpenStyle}
                  className="w-full px-3 py-1.5 text-xs font-sans text-foreground hover:bg-muted/60 text-left flex items-center gap-2 transition-colors"
                >
                  <Palette className="h-3 w-3" />
                  Advanced style…
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-1.5 text-xs font-sans text-destructive hover:bg-destructive/10 text-left flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section content */}
      <div className={cn(!enabled && 'pointer-events-none')}>
        {children}
      </div>
    </div>
  );
}

// ─── Style chip primitive ───
// Compact pill-style chip with active-state highlight. Lives only inside
// EditorSectionCard so it can stay tightly scoped to the canvas hover UX.
interface StyleChipProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  tooltip: string;
  onClick: (e: React.MouseEvent) => void;
}

function StyleChip({ icon, label, active, tooltip, onClick }: StyleChipProps) {
  return (
    <button
      data-editor-control
      onClick={onClick}
      title={tooltip}
      className={cn(
        'h-6 inline-flex items-center gap-1 px-2 rounded-full text-[10px] font-sans',
        'border transition-colors',
        active
          ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
          : 'bg-background/80 backdrop-blur-sm border-border/60 text-muted-foreground/80 hover:text-foreground hover:bg-muted/60',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
