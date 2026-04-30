import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsOrgId } from '@/hooks/useSettingsOrgId';
import { useIsEditorPreview } from '@/hooks/useIsEditorPreview';
import { fetchSiteSetting, writeSiteSettingDraft } from '@/lib/siteSettingsDraft';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Layers } from 'lucide-react';
import type { CustomSectionType, StyleOverrides } from '@/hooks/useWebsiteSections';
import { ImageUploadInput } from './inputs/ImageUploadInput';
import { EditorCard } from './EditorCard';

interface CustomSectionEditorProps {
  sectionId: string;
  sectionType: CustomSectionType;
  sectionLabel: string;
  styleOverrides?: Partial<StyleOverrides>;
  onStyleChange?: (overrides: Partial<StyleOverrides>) => void;
  onLabelChange?: (newLabel: string) => void;
}

interface RichTextConfig {
  heading: string;
  body: string;
  alignment: 'left' | 'center' | 'right';
  background: 'none' | 'muted' | 'primary';
}

interface ImageTextConfig {
  heading: string;
  body: string;
  image_url: string;
  layout: 'image-left' | 'image-right';
  button_text: string;
  button_url: string;
}

interface VideoConfig {
  heading: string;
  video_url: string;
  autoplay: boolean;
}

interface CustomCTAConfig {
  heading: string;
  description: string;
  button_text: string;
  button_url: string;
  variant: 'default' | 'primary' | 'dark';
}

interface SpacerConfig {
  height: number;
  show_divider: boolean;
}

type SectionData = RichTextConfig | ImageTextConfig | VideoConfig | CustomCTAConfig | SpacerConfig;

const DEFAULTS: Record<CustomSectionType, SectionData> = {
  rich_text: { heading: '', body: '', alignment: 'center', background: 'none' },
  image_text: { heading: '', body: '', image_url: '', layout: 'image-left', button_text: '', button_url: '' },
  video: { heading: '', video_url: '', autoplay: false },
  custom_cta: { heading: '', description: '', button_text: 'Learn More', button_url: '', variant: 'default' },
  spacer: { height: 64, show_divider: false },
};

export function CustomSectionEditor({ sectionId, sectionType, sectionLabel, styleOverrides, onStyleChange, onLabelChange }: CustomSectionEditorProps) {
  const settingsKey = `section_custom_${sectionId}`;
  const [editingLabel, setEditingLabel] = useState(sectionLabel);
export function CustomSectionEditor({ sectionId, sectionType, sectionLabel, styleOverrides, onStyleChange, onLabelChange }: CustomSectionEditorProps) {
  const settingsKey = `section_custom_${sectionId}`;
  const [editingLabel, setEditingLabel] = useState(sectionLabel);
  const queryClient = useQueryClient();
  const orgId = useSettingsOrgId();
  // Editor surfaces always read the draft layer so the operator sees their
  // unsaved-but-saved-as-draft work, not the last published value.
  const isPreview = useIsEditorPreview();
  const mode: 'live' | 'draft' = 'draft'; // editor surface
  void isPreview;

  const { data: savedConfig } = useQuery({
    queryKey: ['site-settings', orgId, settingsKey, mode],
    enabled: !!orgId,
    queryFn: async () => {
      const value = await fetchSiteSetting<SectionData>(orgId!, settingsKey, mode);
      return value ?? DEFAULTS[sectionType];
    },
  });

  const [config, setConfig] = useState<SectionData>(DEFAULTS[sectionType]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (savedConfig) setConfig(savedConfig);
  }, [savedConfig]);

  const update = useCallback(<K extends keyof SectionData>(key: string, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
    window.dispatchEvent(new CustomEvent('editor-dirty-state', { detail: { dirty: true } }));
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No organization context');
      const { data: { user } } = await supabase.auth.getUser();
      // Draft-only write. Live `value` is untouched until Publish.
      await writeSiteSettingDraft(orgId, settingsKey, config, user?.id ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings', orgId, settingsKey] });
      setIsDirty(false);
      window.dispatchEvent(new CustomEvent('editor-dirty-state', { detail: { dirty: false } }));
      toast.success('Draft saved');
    },
    onError: () => toast.error('Failed to save'),
  });


  useEffect(() => {
    const handler = () => { if (isDirty) saveMutation.mutate(); };
    window.addEventListener('editor-save-request', handler);
    return () => window.removeEventListener('editor-save-request', handler);
  }, [isDirty, saveMutation]);

  const renderFields = () => {
    switch (sectionType) {
      case 'rich_text': {
        const c = config as RichTextConfig;
        return (
          <>
            <div className="space-y-2">
              <Label>Heading</Label>
              <Input value={c.heading} onChange={e => update('heading', e.target.value)} placeholder="Section heading" />
            </div>
            <div className="space-y-2">
              <Label>Body Text</Label>
              <Textarea value={c.body} onChange={e => update('body', e.target.value)} placeholder="Write your content..." rows={6} />
            </div>
            <div className="space-y-2">
              <Label>Text Alignment</Label>
              <Select value={c.alignment} onValueChange={v => update('alignment', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Background Style</Label>
              <Select value={c.background} onValueChange={v => update('background', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="muted">Muted</SelectItem>
                  <SelectItem value="primary">Primary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      }
      case 'image_text': {
        const c = config as ImageTextConfig;
        return (
          <>
            <div className="space-y-2">
              <Label>Heading</Label>
              <Input value={c.heading} onChange={e => update('heading', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Body Text</Label>
              <Textarea value={c.body} onChange={e => update('body', e.target.value)} rows={4} />
            </div>
            <ImageUploadInput
              value={c.image_url}
              onChange={url => update('image_url', url)}
              label="Image"
              pathPrefix={`sections/${sectionId}`}
            />
            <div className="space-y-2">
              <Label>Layout</Label>
              <Select value={c.layout} onValueChange={v => update('layout', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image-left">Image Left</SelectItem>
                  <SelectItem value="image-right">Image Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input value={c.button_text} onChange={e => update('button_text', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Button URL</Label>
              <Input value={c.button_url} onChange={e => update('button_url', e.target.value)} placeholder="https://..." />
            </div>
          </>
        );
      }
      case 'video': {
        const c = config as VideoConfig;
        return (
          <>
            <div className="space-y-2">
              <Label>Heading</Label>
              <Input value={c.heading} onChange={e => update('heading', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Video URL</Label>
              <Input value={c.video_url} onChange={e => update('video_url', e.target.value)} placeholder="YouTube or Vimeo URL" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Autoplay</Label>
              <Switch checked={c.autoplay} onCheckedChange={v => update('autoplay', v)} />
            </div>
          </>
        );
      }
      case 'custom_cta': {
        const c = config as CustomCTAConfig;
        return (
          <>
            <div className="space-y-2">
              <Label>Heading</Label>
              <Input value={c.heading} onChange={e => update('heading', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={c.description} onChange={e => update('description', e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input value={c.button_text} onChange={e => update('button_text', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Button URL</Label>
              <Input value={c.button_url} onChange={e => update('button_url', e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Style Variant</Label>
              <Select value={c.variant} onValueChange={v => update('variant', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );
      }
      case 'spacer': {
        const c = config as SpacerConfig;
        return (
          <>
            <div className="space-y-2">
              <Label>Height ({c.height}px)</Label>
              <Slider value={[c.height]} onValueChange={([v]) => update('height', v)} min={16} max={200} step={8} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Divider Line</Label>
              <Switch checked={c.show_divider} onCheckedChange={v => update('show_divider', v)} />
            </div>
          </>
        );
      }
    }
  };

  const sectionTypeLabels: Record<CustomSectionType, string> = {
    rich_text: 'Rich Text Block',
    image_text: 'Image + Text Block',
    video: 'Video Embed',
    custom_cta: 'Call to Action',
    spacer: 'Spacer / Divider',
  };

  return (
    <EditorCard
      title={sectionTypeLabels[sectionType] || 'Custom Section'}
      icon={Layers}
      description={`Configure this ${sectionType.replace('_', ' ')} section`}
    >
      {onLabelChange && (
        <div className="space-y-2">
          <Label>Section Label</Label>
          <Input
            value={editingLabel}
            onChange={e => setEditingLabel(e.target.value)}
            onBlur={() => {
              if (editingLabel.trim() && editingLabel !== sectionLabel) {
                onLabelChange(editingLabel.trim());
              }
            }}
            className="text-sm h-8"
            placeholder="Section label"
          />
        </div>
      )}
      {renderFields()}
    </EditorCard>
  );
}
