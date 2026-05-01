import { Settings2, Sparkles, X, Minimize2 } from 'lucide-react';
import { EditorCard } from '../EditorCard';
import { ToggleInput } from '../inputs/ToggleInput';
import { SliderInput } from '../inputs/SliderInput';
import type { HeroConfig } from '@/hooks/useSectionConfig';

interface HeroRotatorEditorProps {
  config: HeroConfig;
  onChange: <K extends keyof HeroConfig>(field: K, value: HeroConfig[K]) => void;
}

/** Per-mode minimum slide interval (seconds). Background-Only floors at 5s
 *  because faster crossfades make the static foreground feel jittery as the
 *  imagery flickers underneath. Multi-Slide can go faster since the whole
 *  composition changes on each tick. */
const MIN_INTERVAL_S = { multi_slide: 3, background_only: 5 } as const;

/** How long (days) to suppress the duplicate-headline hint after dismissal. */
const HINT_SUPPRESSION_DAYS = 30;
/** How long (days) before we suggest collapsing background-only-with-1-slide
 *  to a static hero. Below this, the operator may still be authoring. */
const STATIC_HERO_HINT_AFTER_DAYS = 7;

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 86_400_000;
}

/**
 * Mode-appropriate defaults. When an operator switches modes, we nudge
 * transition_style + slide_interval_ms into a sensible starting point —
 * but only if their current values still match the *other* mode's defaults
 * (i.e. they haven't manually customized). This avoids stomping on intent.
 */
const MODE_DEFAULTS = {
  multi_slide: { transition_style: 'slide-up' as const, slide_interval_ms: 6000 },
  background_only: { transition_style: 'crossfade' as const, slide_interval_ms: 7000 },
};

/**
 * Tiny inline illustration for the mode picker. Multi-slide shows a
 * full-card swap; background-only shows a static foreground over a
 * rotating background.
 */
function ModeIllustration({ mode, active }: { mode: 'multi_slide' | 'background_only'; active: boolean }) {
  const stroke = active ? 'currentColor' : 'currentColor';
  const opacity = active ? 1 : 0.55;
  if (mode === 'multi_slide') {
    return (
      <svg viewBox="0 0 64 28" className="w-full h-7" fill="none" stroke={stroke} strokeWidth={1.2} style={{ opacity }}>
        <rect x="1" y="3" width="28" height="22" rx="3" />
        <rect x="6" y="9" width="14" height="2" rx="1" fill={stroke} />
        <rect x="6" y="14" width="10" height="2" rx="1" fill={stroke} opacity={0.5} />
        <rect x="6" y="19" width="8" height="3" rx="1.5" fill={stroke} />
        <path d="M33 14 L37 14 M35 12 L37 14 L35 16" />
        <rect x="35" y="3" width="28" height="22" rx="3" />
        <rect x="40" y="9" width="10" height="2" rx="1" fill={stroke} />
        <rect x="40" y="14" width="14" height="2" rx="1" fill={stroke} opacity={0.5} />
        <rect x="40" y="19" width="8" height="3" rx="1.5" fill={stroke} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 28" className="w-full h-7" fill="none" stroke={stroke} strokeWidth={1.2} style={{ opacity }}>
      <rect x="1" y="3" width="28" height="22" rx="3" />
      <path d="M4 8 L26 8 M4 12 L20 12" stroke={stroke} opacity={0.4} />
      <rect x="6" y="14" width="14" height="2" rx="1" fill={stroke} />
      <rect x="6" y="19" width="8" height="3" rx="1.5" fill={stroke} />
      <path d="M33 14 L37 14 M35 12 L37 14 L35 16" />
      <rect x="35" y="3" width="28" height="22" rx="3" />
      <path d="M38 8 L60 8 M38 12 L54 12" stroke={stroke} opacity={0.85} />
      <rect x="40" y="14" width="14" height="2" rx="1" fill={stroke} />
      <rect x="40" y="19" width="8" height="3" rx="1.5" fill={stroke} />
    </svg>
  );
}

/**
 * Slides rotator behavior: auto-advance, interval, transition, pause-on-hover.
 * Slide *content* is edited per-slide elsewhere; this controls how the
 * rotator cycles between them.
 */
export function HeroRotatorEditor({ config, onChange }: HeroRotatorEditorProps) {
  const slides = config.slides ?? [];
  const hasMultiple = slides.length > 1;
  const mode = config.rotator_mode ?? 'multi_slide';
  const minIntervalS = MIN_INTERVAL_S[mode];

  // "Convert to Background-Only" detector — gated by:
  //   1. multi_slide mode + 3+ slides
  //   2. 3+ slides share identical headline_text
  //   3. operator hasn't dismissed in the last 30 days
  const duplicateHeadlineHint = (() => {
    if (mode !== 'multi_slide' || slides.length < 3) return null;
    const dismissedDays = daysSince(config.dismissed_convert_hint_at);
    if (dismissedDays !== null && dismissedDays < HINT_SUPPRESSION_DAYS) return null;
    const counts = new Map<string, number>();
    for (const s of slides) {
      const h = (s.headline_text ?? '').trim();
      if (!h) continue;
      counts.set(h, (counts.get(h) ?? 0) + 1);
    }
    let max = 0;
    for (const v of counts.values()) if (v > max) max = v;
    return max >= 3 ? max : null;
  })();

  // Reverse detector: stuck in background-only with only 1 active slide for
  // >7 days. The complexity of "rotator mode" buys nothing — suggest
  // collapsing back to a single-slide static hero.
  const staticHeroHint = (() => {
    if (mode !== 'background_only') return null;
    const activeSlides = slides.filter((s) => s.active !== false);
    if (activeSlides.length !== 1) return null;
    const days = daysSince(config.background_only_since);
    if (days === null || days < STATIC_HERO_HINT_AFTER_DAYS) return null;
    return Math.floor(days);
  })();

  const switchMode = (next: 'multi_slide' | 'background_only') => {
    if (next === mode) return;
    onChange('rotator_mode', next);
    // Stamp the entry timestamp when moving INTO background_only; clear when
    // leaving so the reverse detector resets cleanly.
    onChange('background_only_since', next === 'background_only' ? new Date().toISOString() : null);
    // Mode-aware defaults: only nudge transition + interval if the operator
    // is currently sitting on the *other* mode's defaults (i.e. they haven't
    // customized). This preserves intentional choices.
    const other = MODE_DEFAULTS[mode];
    const target = MODE_DEFAULTS[next];
    const onOtherDefaults =
      (config.transition_style ?? 'fade') === other.transition_style &&
      (config.slide_interval_ms ?? 6000) === other.slide_interval_ms;
    const unset =
      config.transition_style === undefined && config.slide_interval_ms === undefined;
    if (onOtherDefaults || unset) {
      onChange('transition_style', target.transition_style);
      onChange('slide_interval_ms', target.slide_interval_ms);
    } else {
      // Even without nudging defaults, enforce the new mode's minimum
      // interval — a 3s rotator from multi_slide would be jittery in
      // background_only.
      const currentMs = config.slide_interval_ms ?? 6000;
      const floorMs = MIN_INTERVAL_S[next] * 1000;
      if (currentMs < floorMs) onChange('slide_interval_ms', floorMs);
    }
  };

  const dismissDuplicateHint = () => {
    onChange('dismissed_convert_hint_at', new Date().toISOString());
  };

  return (
    <EditorCard title="Slides Rotator" icon={Settings2}>
      <p className="text-xs text-muted-foreground -mt-1">
        Controls how the hero cycles between slides. When you have only one
        slide, the rotator is silent — these settings start mattering at two+.
      </p>

      {/* Rotator Mode picker — defines what each slide owns. */}
      <div className="space-y-2 pt-1">
        <label className="text-xs text-muted-foreground">Rotator Mode</label>
        <div className="flex gap-2">
          {([
            {
              id: 'multi_slide' as const,
              label: 'Multi-Slide',
              desc: 'Each slide has its own background, copy & buttons.',
            },
            {
              id: 'background_only' as const,
              label: 'Background-Only',
              desc: 'Shared copy & buttons, only the background rotates.',
            },
          ]).map(({ id, label, desc }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchMode(id)}
                title={desc}
                className={`flex-1 px-3 py-2 rounded-xl text-left border transition-colors ${
                  active
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
                }`}
              >
                <ModeIllustration mode={id} active={active} />
                <div className="text-[12px] font-sans font-medium mt-1.5">{label}</div>
                <div className={`text-[10px] mt-0.5 ${active ? 'text-background/70' : 'text-muted-foreground'}`}>
                  {desc}
                </div>
              </button>
            );
          })}
        </div>
        {mode === 'background_only' && (
          <p className="text-[10px] text-muted-foreground">
            Slide-specific copy is preserved and will return if you switch back to Multi-Slide.
          </p>
        )}
        {duplicateHeadlineHint && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-muted/40">
            <Sparkles className="h-3.5 w-3.5 text-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-foreground font-sans">
                {duplicateHeadlineHint} slides share the same headline.
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Background-Only mode shares one headline across all slides — easier to maintain than editing the same copy in {duplicateHeadlineHint} places.
              </p>
              <button
                type="button"
                onClick={() => switchMode('background_only')}
                className="mt-1.5 text-[10px] underline text-foreground hover:text-foreground/80"
              >
                Switch to Background-Only
              </button>
            </div>
          </div>
        )}
      </div>

      <ToggleInput
        label="Auto-Rotate"
        value={config.auto_rotate}
        onChange={(v) => onChange('auto_rotate', v)}
        description="Cycle through slides automatically"
      />

      {config.auto_rotate && (
        <SliderInput
          label="Slide Duration"
          value={(config.slide_interval_ms ?? 6000) / 1000}
          onChange={(v) => onChange('slide_interval_ms', Math.round(v * 1000))}
          min={3}
          max={15}
          step={0.5}
          unit="s"
        />
      )}

      <ToggleInput
        label="Pause on Hover"
        value={config.pause_on_hover}
        onChange={(v) => onChange('pause_on_hover', v)}
        description="Stop the rotator while the visitor's cursor is over the hero"
      />

      <div className="space-y-2 pt-2">
        <label className="text-xs text-muted-foreground">Transition Style</label>
        <div className="flex gap-2">
          {(['fade', 'crossfade', 'slide-up'] as const).map((opt) => {
            const active = (config.transition_style ?? 'fade') === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange('transition_style', opt)}
                className={`flex-1 px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                  active
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
                }`}
              >
                {opt === 'slide-up' ? 'Slide Up' : opt[0].toUpperCase() + opt.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {!hasMultiple && (
        <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/30">
          Add a second slide to see the rotator in action.
        </p>
      )}
    </EditorCard>
  );
}
