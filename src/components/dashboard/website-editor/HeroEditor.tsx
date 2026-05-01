import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  RotateCcw,
  ArrowLeft,
  Image as ImageIcon,
  Palette,
  Layers,
  Images,
  Type,
  Settings2,
} from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { useDirtyState } from '@/hooks/useDirtyState';
import { usePreviewBridge, clearPreviewOverride } from '@/hooks/usePreviewBridge';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { useHeroConfig, type HeroConfig, DEFAULT_HERO } from '@/hooks/useSectionConfig';
import { useDebounce } from '@/hooks/use-debounce';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { useSaveTelemetry } from '@/hooks/useSaveTelemetry';

import { HeroBackgroundEditor } from './HeroBackgroundEditor';
import { HeroSlidesManager } from './HeroSlidesManager';
import { HeroTextColorsEditor } from './HeroTextColorsEditor';
import { HeroScrimEditor } from './HeroScrimEditor';
import { EditorCard } from './EditorCard';
import { HeroEditorHubCard } from './hero/HeroEditorHubCard';
import { HeroContentEditor } from './hero/HeroContentEditor';
import { HeroAdvancedEditor } from './hero/HeroAdvancedEditor';

type HeroView = 'hub' | 'background' | 'colors' | 'scrim' | 'slides' | 'content' | 'advanced';

const VIEW_LABELS: Record<Exclude<HeroView, 'hub'>, string> = {
  background: 'Background Media',
  colors: 'Text & Buttons Color',
  scrim: 'Text-area Scrim',
  slides: 'Slides Rotator',
  content: 'Content & Copy',
  advanced: 'Advanced',
};

function viewStorageKey(orgId: string | undefined | null): string {
  return `zura.heroEditor.view.${orgId ?? 'anon'}`;
}

function readPersistedView(orgId: string | undefined | null): HeroView {
  if (typeof window === 'undefined') return 'hub';
  try {
    const raw = window.localStorage.getItem(viewStorageKey(orgId));
    if (raw && (raw === 'hub' || raw in VIEW_LABELS)) return raw as HeroView;
  } catch {
    /* ignore */
  }
  return 'hub';
}

function writePersistedView(orgId: string | undefined | null, view: HeroView): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(viewStorageKey(orgId), view);
  } catch {
    /* ignore */
  }
}

/* ─── Status summary helpers ─── */

function summarizeBackground(c: HeroConfig): string {
  if (c.background_type === 'none') return 'No background set';
  const kind = c.background_type === 'video' ? 'Video' : 'Image';
  const fit = c.background_fit === 'contain' ? 'Contain' : 'Cover';
  const focal = c.background_focal_x !== 50 || c.background_focal_y !== 50;
  return `${kind} · ${fit} · ${focal ? 'Custom focus' : 'Centered'}`;
}

function summarizeColors(c: HeroConfig): string {
  const t = c.text_colors ?? {};
  const overrides = Object.values(t).filter(Boolean).length;
  return overrides === 0 ? 'Auto-contrast' : `${overrides} color${overrides === 1 ? '' : 's'} customized`;
}

function summarizeScrim(c: HeroConfig): string {
  const style = c.scrim_style ?? 'gradient-bottom';
  const strength = Math.round((c.scrim_strength ?? 0.55) * 100);
  return `${style.replace(/-/g, ' ')} · ${strength}%`;
}

function summarizeSlides(c: HeroConfig): string {
  const n = c.slides?.length ?? 0;
  if (n === 0) return 'Off · using fallback content';
  return `${n} slide${n === 1 ? '' : 's'}${c.auto_rotate ? ' · auto-rotating' : ''}`;
}

function summarizeContent(c: HeroConfig): string {
  const align = c.content_alignment ?? 'center';
  const headline = (c.headline_text || '').trim();
  const preview = headline.length > 24 ? `${headline.slice(0, 24)}…` : headline || 'No headline';
  return `${align[0].toUpperCase()}${align.slice(1)} aligned · "${preview}"`;
}

function summarizeAdvanced(c: HeroConfig): string {
  return `${c.word_rotation_interval}s rotation · scroll ${c.show_scroll_indicator ? 'on' : 'off'}`;
}

export function HeroEditor() {
  const __saveTelemetry = useSaveTelemetry('hero-editor');
  const { data, isLoading, isSaving, update } = useHeroConfig();
  const { effectiveOrganization } = useOrganizationContext();
  const orgId = effectiveOrganization?.id ?? null;

  const [localConfig, setLocalConfig] = useState<HeroConfig>(DEFAULT_HERO);
  const [view, setView] = useState<HeroView>(() => readPersistedView(orgId));
  const debouncedConfig = useDebounce(localConfig, 300);

  // Canonical dirty-state hook (key-order-stable structural compare).
  useDirtyState(localConfig, data, 'hero');

  // Live-edit bridge: stream in-memory edits into the preview iframe.
  usePreviewBridge('section_hero', localConfig);

  useEffect(() => {
    if (data && !isLoading) {
      setLocalConfig(data);
    }
  }, [data, isLoading]);

  // Re-read persisted view when org context changes (per-tenant view memory).
  useEffect(() => {
    setView(readPersistedView(orgId));
  }, [orgId]);

  useEffect(() => {
    writePersistedView(orgId, view);
  }, [orgId, view]);

  const handleSave = useCallback(async () => {
    try {
      await update(localConfig);
      toast.success('Hero section saved');
      clearPreviewOverride('section_hero', orgId);
      __saveTelemetry.event('save-success');
      triggerPreviewRefresh();
      __saveTelemetry.flush();
    } catch {
      toast.error('Failed to save');
    }
  }, [localConfig, update, orgId]);

  useEditorSaveAction(handleSave);

  const updateField = useCallback(
    <K extends keyof HeroConfig>(field: K, value: HeroConfig[K]) => {
      setLocalConfig((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleReset = () => {
    setLocalConfig(DEFAULT_HERO);
    toast.info('Reset to defaults — save to apply');
  };

  const cards = useMemo(
    () => [
      { id: 'background' as const, title: 'Background Media', icon: ImageIcon, summary: summarizeBackground(localConfig) },
      { id: 'colors' as const, title: 'Text & Buttons Color', icon: Palette, summary: summarizeColors(localConfig) },
      { id: 'scrim' as const, title: 'Text-area Scrim', icon: Layers, summary: summarizeScrim(localConfig) },
      { id: 'slides' as const, title: 'Slides Rotator', icon: Images, summary: summarizeSlides(localConfig) },
      { id: 'content' as const, title: 'Content & Copy', icon: Type, summary: summarizeContent(localConfig) },
      { id: 'advanced' as const, title: 'Advanced', icon: Settings2, summary: summarizeAdvanced(localConfig) },
    ],
    [localConfig],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ─── Hub view ─── */
  if (view === 'hub') {
    return (
      <div className="space-y-6">
        <EditorCard title="Hero Section" icon={ImageIcon}>
          <p className="text-sm text-muted-foreground -mt-1">
            Configure how your homepage hero looks and reads. Pick a category to edit.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cards.map((card) => (
              <HeroEditorHubCard
                key={card.id}
                title={card.title}
                icon={card.icon}
                summary={card.summary}
                onClick={() => setView(card.id)}
              />
            ))}
          </div>
          <div className="pt-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset hero to defaults
            </Button>
          </div>
        </EditorCard>
      </div>
    );
  }

  /* ─── Sub-editor view ─── */
  return (
    <div className="space-y-4">
      {/* Breadcrumb back-bar */}
      <button
        type="button"
        onClick={() => setView('hub')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="font-sans">
          Hero
          <span className="mx-1.5 text-border">/</span>
          <span className="text-foreground">{VIEW_LABELS[view]}</span>
        </span>
      </button>

      {view === 'background' && (
        <HeroBackgroundEditor
          config={localConfig}
          onChange={(patch) => setLocalConfig((prev) => ({ ...prev, ...patch }))}
        />
      )}

      {view === 'colors' && (
        <EditorCard
          title="Text & Buttons Color"
          icon={Palette}
        >
          <p className="text-xs text-muted-foreground -mt-1">
            Pick exact colors for the headline, subheadline, and CTA buttons. Leave any
            field empty to auto-contrast against your background.
          </p>
          <HeroTextColorsEditor
            value={localConfig.text_colors}
            onChange={(next) => updateField('text_colors', next)}
          />
        </EditorCard>
      )}

      {view === 'scrim' && (
        <EditorCard title="Text-area Scrim" icon={Layers}>
          <p className="text-xs text-muted-foreground -mt-1">
            Editorial gradient/vignette layered on top of the Image Wash. Strongest
            where headline text lives — transparent everywhere else.
          </p>
          <HeroScrimEditor
            scrimStyle={localConfig.scrim_style ?? 'gradient-bottom'}
            scrimStrength={localConfig.scrim_strength ?? 0.55}
            bgType={localConfig.background_type}
            onChange={(patch) => {
              if (patch.scrim_style !== undefined) updateField('scrim_style', patch.scrim_style ?? undefined);
              if (patch.scrim_strength !== undefined) updateField('scrim_strength', patch.scrim_strength ?? undefined);
            }}
          />
        </EditorCard>
      )}

      {view === 'slides' && (
        <HeroSlidesManager
          config={localConfig}
          onChange={(patch) => setLocalConfig((prev) => ({ ...prev, ...patch }))}
        />
      )}

      {view === 'content' && (
        <HeroContentEditor config={localConfig} onChange={updateField} />
      )}

      {view === 'advanced' && (
        <HeroAdvancedEditor config={localConfig} onChange={updateField} />
      )}
    </div>
  );
}
