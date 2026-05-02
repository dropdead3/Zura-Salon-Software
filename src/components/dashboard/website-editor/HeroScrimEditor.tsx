/**
 * HeroScrimEditor — picks the scrim style + strength laid over hero
 * background media. The scrim is the editorial industry standard for keeping
 * text readable when a video background flickers between bright and dark
 * frames (since a static `text-white` rule alone fails on white frames).
 *
 * Used at the section level and inside per-slide rows. Per-slide values are
 * `null` when inheriting from the section.
 */
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Sun, ArrowDown, CircleDot, Aperture, EyeOff, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HeroScrimStyle } from '@/hooks/useSectionConfig';

interface ScrimStyleOption {
  value: HeroScrimStyle;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SCRIM_OPTIONS: ScrimStyleOption[] = [
  {
    value: 'gradient-bottom',
    label: 'Gradient',
    description: 'Darker at the bottom, fades up. Editorial standard.',
    icon: ArrowDown,
  },
  {
    value: 'gradient-radial',
    label: 'Center',
    description: 'Darker in the middle where text sits.',
    icon: CircleDot,
  },
  {
    value: 'vignette',
    label: 'Vignette',
    description: 'Darker at the edges, lighter middle.',
    icon: Aperture,
  },
  {
    value: 'flat',
    label: 'Flat',
    description: 'Uniform dark wash over the entire image.',
    icon: Sun,
  },
  {
    value: 'none',
    label: 'None',
    description: 'No scrim. Text readability is on you.',
    icon: EyeOff,
  },
];

interface HeroScrimEditorProps {
  /** Current scrim style. `null` in slide context = inherit from section. */
  scrimStyle: HeroScrimStyle | null | undefined;
  /** Current scrim strength 0..1. `null` in slide context = inherit. */
  scrimStrength: number | null | undefined;
  /** Section-level fallback used to display the inherited preview when slide value is null. */
  inheritedStyle?: HeroScrimStyle;
  inheritedStrength?: number;
  onChange: (next: { scrim_style?: HeroScrimStyle | null; scrim_strength?: number | null }) => void;
  /** When true, surfaces an "Inherit from section" pill control (slide context only). */
  allowInherit?: boolean;
  /** Optional title above the picker. */
  title?: string;
  description?: string;
  /**
   * Background media type — drives the unscrimmed-video advisory banner.
   * Unscrimmed video is the most common cause of unreadable hero copy
   * (white text on a frame that flashes white). When provided and bgType
   * is 'video' with no active scrim, surface a one-click recommendation.
   */
  bgType?: 'none' | 'image' | 'video';
}

export function HeroScrimEditor({
  scrimStyle,
  scrimStrength,
  inheritedStyle = 'gradient-bottom',
  inheritedStrength = 0.55,
  onChange,
  allowInherit = false,
  title = 'Text-area Scrim',
  description = 'Editorial gradient/vignette layered on top of the Image Wash to keep text readable in the headline region.',
  bgType,
}: HeroScrimEditorProps) {
  const isInheriting = allowInherit && (scrimStyle == null || scrimStrength == null);
  // Effective values used for display/preview when slide is inheriting.
  const effectiveStyle: HeroScrimStyle = (scrimStyle ?? inheritedStyle) as HeroScrimStyle;
  const effectiveStrength = scrimStrength ?? inheritedStrength;

  const setStyle = (next: HeroScrimStyle) => {
    onChange({
      scrim_style: next,
      // Promote inherited strength so the slider has something to drive.
      scrim_strength: scrimStrength ?? inheritedStrength,
    });
  };

  const setStrength = (next: number) => {
    onChange({
      scrim_style: scrimStyle ?? inheritedStyle,
      scrim_strength: next,
    });
  };

  const reset = () => onChange({ scrim_style: null, scrim_strength: null });

  // Unscrimmed-video advisory: video frames flash between bright and dark, so
  // a scrimless video almost always breaks headline legibility on at least
  // one frame. We only nudge — operators can still pick `none` deliberately.
  const showVideoScrimAdvisory =
    bgType === 'video' && !isInheriting && (effectiveStyle === 'none' || effectiveStrength === 0);

  const applyRecommendedScrim = () => {
    onChange({ scrim_style: 'flat', scrim_strength: 0.3 });
  };

  const showHeader = Boolean(title) || Boolean(description) || (allowInherit && !isInheriting);

  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            {title && <h4 className="text-sm font-medium">{title}</h4>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {allowInherit && !isInheriting && (
            <button
              type="button"
              onClick={reset}
              className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Inherit
            </button>
          )}
        </div>
      )}

      {showVideoScrimAdvisory && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px]">
          <Video className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
          <div className="flex-1 space-y-1">
            <p className="text-foreground">
              Videos benefit from a scrim — frames flash between bright and dark, so unscrimmed video almost always breaks headline legibility. Recommended: <span className="font-mono">flat 30%</span>.
            </p>
            <button
              type="button"
              onClick={applyRecommendedScrim}
              className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 hover:underline"
            >
              Apply recommendation
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-1.5">
        {SCRIM_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = !isInheriting && effectiveStyle === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStyle(opt.value)}
              title={opt.description}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-background hover:bg-muted/40 text-muted-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wider">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {effectiveStyle !== 'none' && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] text-muted-foreground">Strength</Label>
            <span className="text-[11px] font-mono text-muted-foreground">
              {Math.round(effectiveStrength * 100)}%
              {isInheriting && <span className="ml-1 text-[9px] uppercase tracking-wider">inherited</span>}
            </span>
          </div>
          <Slider
            value={[effectiveStrength]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(values) => setStrength(values[0] ?? 0)}
          />
        </div>
      )}
    </div>
  );
}
