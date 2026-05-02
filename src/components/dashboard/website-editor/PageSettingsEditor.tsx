import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { useDirtyState } from '@/hooks/useDirtyState';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Paintbrush, ArrowUpDown, Maximize2 } from 'lucide-react';
import type { PageConfig, WebsitePagesConfig } from '@/hooks/useWebsitePages';
import type { StyleOverrides } from '@/components/home/SectionStyleWrapper';
import { pushEditorHistoryEntry } from './EditorHistoryProvider';

// Page-level chip preset cycles. Mirrors the section-level chip rail so the
// vocabulary is identical: one tap = next stop, "active" = deviation from
// inherit/default. Persisted into PageConfig.style_overrides.
type PageBgStop = { label: string; type: StyleOverrides['background_type']; value: string };
const PAGE_BG_STOPS: PageBgStop[] = [
  { label: 'Inherit', type: 'none', value: '' },
  { label: 'Muted', type: 'color', value: 'hsl(var(--muted))' },
  { label: 'Secondary', type: 'color', value: 'hsl(var(--secondary))' },
  { label: 'Contrast', type: 'color', value: 'hsl(var(--foreground))' },
];
type PageSpacingStop = { label: string; top: number; bottom: number };
const PAGE_SPACING_STOPS: PageSpacingStop[] = [
  { label: 'Default', top: 0, bottom: 0 },
  { label: 'Cozy', top: 32, bottom: 32 },
  { label: 'Roomy', top: 64, bottom: 64 },
  { label: 'Epic', top: 128, bottom: 128 },
];
type PageWidthStop = { label: string; value: StyleOverrides['max_width'] };
const PAGE_WIDTH_STOPS: PageWidthStop[] = [
  { label: 'Full', value: 'full' },
  { label: 'XL', value: 'xl' },
  { label: 'LG', value: 'lg' },
  { label: 'MD', value: 'md' },
];

function nextIn<T>(arr: T[], idx: number): T {
  return arr[(idx + 1 + arr.length) % arr.length] ?? arr[0];
}

const RESERVED_SLUGS = [
  'services', 'extensions', 'about', 'policies', 'booking',
  'careers', 'gallery', 'stylists', 'shop', 'login', 'contact',
  'dashboard', 'admin', 'day-rate',
];

interface PageSettingsEditorProps {
  page: PageConfig;
  allPages?: WebsitePagesConfig;
  onUpdate: (page: PageConfig) => Promise<void>;
}

function CharCounter({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const isOver = len > max;
  const isNear = len > max * 0.85;

  return (
    <span className={cn(
      "text-[10px] font-mono tabular-nums",
      isOver ? "text-destructive" : isNear ? "text-[hsl(var(--platform-warning))]" : "text-muted-foreground"
    )}>
      {len}/{max}
    </span>
  );
}

export function PageSettingsEditor({ page, allPages, onUpdate }: PageSettingsEditorProps) {
  const [local, setLocal] = useState(page);
  const [slugError, setSlugError] = useState('');

  useEffect(() => {
    setLocal(page);
    setSlugError('');
  }, [page]);

  const validateSlug = useCallback((slug: string) => {
    if (!slug) return '';
    if (RESERVED_SLUGS.includes(slug) && slug !== page.slug) {
      return `"${slug}" is reserved. Choose a different slug.`;
    }
    if (allPages) {
      const collision = allPages.pages.find(p => p.slug === slug && p.id !== page.id);
      if (collision) return `"${slug}" is already used by "${collision.title}".`;
    }
    return '';
  }, [allPages, page.id]);

  const update = (key: keyof PageConfig, value: unknown) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    if (key === 'slug') {
      setSlugError(validateSlug(value as string));
    }
    window.dispatchEvent(new CustomEvent('editor-dirty-state', { detail: { dirty: true } }));
  };

  const handleSave = useCallback(async () => {
    if (slugError) {
      toast.error(slugError);
      return;
    }
    try {
      await onUpdate(local);
      toast.success('Page settings saved');
      window.dispatchEvent(new CustomEvent('editor-dirty-state', { detail: { dirty: false } }));
    } catch {
      toast.error('Failed to save page settings');
    }
  }, [local, onUpdate, slugError]);

  useEditorSaveAction(handleSave);
  useDirtyState(local, page, 'page_settings');

  const previewUrl = page.page_type === 'home'
    ? '/org/your-salon'
    : `/org/your-salon/${local.slug || 'untitled'}`;

  // ─── Page-level chip rail handlers ─────────────────────────────────────
  // Each chip cycles to the next preset and IMMEDIATELY persists the patch
  // (Square-style "one tap = visible change") instead of staging it behind
  // the form's Save button. Persistence flows through onUpdate so it shares
  // the editor's dirty/saving plumbing — and we register an undo entry so
  // chip cycles join the same Cmd+Z stack as section chips, reorders, and
  // inline edits.
  const overrides: Partial<StyleOverrides> = local.style_overrides ?? {};
  const applyOverrides = useCallback(
    async (patch: Partial<StyleOverrides>, label: string) => {
      const beforeOverrides = overrides;
      const beforePage = local;
      const afterOverrides = { ...beforeOverrides, ...patch };
      const afterPage = { ...beforePage, style_overrides: afterOverrides };
      // Optimistic local sync so the form shows the new chip state instantly.
      setLocal(afterPage);
      try {
        await onUpdate(afterPage);
        pushEditorHistoryEntry({
          label,
          undo: async () => {
            setLocal(beforePage);
            await onUpdate(beforePage);
          },
          redo: async () => {
            setLocal(afterPage);
            await onUpdate(afterPage);
          },
        });
      } catch {
        // Roll back optimistic UI on failure; toast already surfaced upstream.
        setLocal(beforePage);
        toast.error('Failed to update page style');
      }
    },
    [local, overrides, onUpdate],
  );
  const cycleBg = () => {
    const idx = PAGE_BG_STOPS.findIndex(
      (s) => s.type === (overrides.background_type ?? 'none') && s.value === (overrides.background_value ?? ''),
    );
    const next = nextIn(PAGE_BG_STOPS, idx);
    void applyOverrides(
      { background_type: next.type, background_value: next.value },
      `Page background: ${next.label}`,
    );
  };
  const cycleSpacing = () => {
    const idx = PAGE_SPACING_STOPS.findIndex(
      (s) => s.top === (overrides.padding_top ?? 0) && s.bottom === (overrides.padding_bottom ?? 0),
    );
    const next = nextIn(PAGE_SPACING_STOPS, idx);
    void applyOverrides(
      { padding_top: next.top, padding_bottom: next.bottom },
      `Page spacing: ${next.label}`,
    );
  };
  const cycleWidth = () => {
    const idx = PAGE_WIDTH_STOPS.findIndex((s) => s.value === (overrides.max_width ?? 'full'));
    const next = nextIn(PAGE_WIDTH_STOPS, idx);
    void applyOverrides({ max_width: next.value }, `Page width: ${next.label}`);
  };
  const bgActive = !!overrides.background_type && overrides.background_type !== 'none' && !!overrides.background_value;
  const spacingActive = (overrides.padding_top ?? 0) > 0 || (overrides.padding_bottom ?? 0) > 0;
  const widthActive = !!overrides.max_width && overrides.max_width !== 'full';
  const currentBgLabel = PAGE_BG_STOPS.find(
    (s) => s.type === (overrides.background_type ?? 'none') && s.value === (overrides.background_value ?? ''),
  )?.label ?? 'Custom';
  const currentSpacingLabel = PAGE_SPACING_STOPS.find(
    (s) => s.top === (overrides.padding_top ?? 0) && s.bottom === (overrides.padding_bottom ?? 0),
  )?.label ?? 'Custom';
  const currentWidthLabel = PAGE_WIDTH_STOPS.find((s) => s.value === (overrides.max_width ?? 'full'))?.label ?? 'Custom';

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Page Settings — {page.title}</CardTitle>
            <Badge variant={local.enabled ? 'default' : 'secondary'} className="text-[10px]">
              {local.enabled ? 'Live' : 'Draft'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{previewUrl}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* ── Page-level style chips — same vocabulary as section chips ── */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[11px] font-display tracking-wider uppercase text-muted-foreground">
                Page Style
              </Label>
              <span className="text-[10px] text-muted-foreground/70">
                Wraps all sections · section overrides win
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <PageStyleChip
                icon={<Paintbrush className="h-3 w-3" />}
                label={`BG · ${currentBgLabel}`}
                active={bgActive}
                onClick={cycleBg}
              />
              <PageStyleChip
                icon={<ArrowUpDown className="h-3 w-3" />}
                label={`Pad · ${currentSpacingLabel}`}
                active={spacingActive}
                onClick={cycleSpacing}
              />
              <PageStyleChip
                icon={<Maximize2 className="h-3 w-3" />}
                label={`Width · ${currentWidthLabel}`}
                active={widthActive}
                onClick={cycleWidth}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Page Title</Label>
            <Input value={local.title} onChange={e => update('title', e.target.value)} />
          </div>

          {page.page_type !== 'home' && (
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">/org/your-salon/</span>
                <Input
                  value={local.slug}
                  onChange={e => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="flex-1"
                />
              </div>
              {slugError && (
                <p className="text-[11px] text-destructive">{slugError}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>SEO Title</Label>
              <CharCounter value={local.seo_title} max={60} />
            </div>
            <Input
              value={local.seo_title}
              onChange={e => update('seo_title', e.target.value)}
              placeholder={local.title}
              className={cn(local.seo_title.length > 60 && "border-destructive")}
            />
            <p className="text-[10px] text-muted-foreground">Appears in browser tab and search results.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>SEO Description</Label>
              <CharCounter value={local.seo_description} max={160} />
            </div>
            <Textarea
              value={local.seo_description}
              onChange={e => update('seo_description', e.target.value)}
              placeholder="Describe this page for search engines..."
              rows={2}
              className={cn(local.seo_description.length > 160 && "border-destructive")}
            />
          </div>

          {/* SERP Preview */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-[11px]">Search Preview</Label>
            <div className="rounded-lg border border-border bg-card p-4 space-y-1">
              <p className="text-xs font-sans text-muted-foreground truncate">
                getzura.com
                {page.page_type !== 'home' && (
                  <> › {local.slug || 'untitled'}</>
                )}
              </p>
              <p className="text-sm font-sans text-primary truncate leading-snug">
                {(local.seo_title || local.title || 'Untitled Page').slice(0, 60)}
                {(local.seo_title || local.title || '').length > 60 && '…'}
              </p>
              <p className="text-xs font-sans text-muted-foreground line-clamp-2 leading-relaxed">
                {(local.seo_description || 'No description provided. Add an SEO description to improve your search appearance.').slice(0, 160)}
                {(local.seo_description || '').length > 160 && '…'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Show in Navigation</Label>
              <p className="text-[10px] text-muted-foreground">Display a link in the header nav</p>
            </div>
            <Switch checked={local.show_in_nav} onCheckedChange={v => update('show_in_nav', v)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Page Enabled</Label>
              <p className="text-[10px] text-muted-foreground">When disabled, this page returns a 404</p>
            </div>
            <Switch checked={local.enabled} onCheckedChange={v => update('enabled', v)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Compact page-level chip — mirrors EditorSectionCard's StyleChip but lives
// inline in the Page Settings card so the rail and the rest of the form share
// the same visual rhythm.
function PageStyleChip({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-7 inline-flex items-center gap-1.5 px-2.5 rounded-full text-[11px] font-sans',
        'border transition-colors',
        active
          ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
          : 'bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
