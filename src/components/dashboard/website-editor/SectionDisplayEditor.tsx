import { useState, useEffect, useCallback } from 'react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { useDirtyState } from '@/hooks/useDirtyState';
import { toast } from 'sonner';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { useSaveTelemetry } from '@/hooks/useSaveTelemetry';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SliderInput } from './inputs/SliderInput';
import { ToggleInput } from './inputs/ToggleInput';
import { EditorCard } from './EditorCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SectionStyleEditor } from './SectionStyleEditor';
import type { StyleOverrides } from '@/components/home/SectionStyleWrapper';

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'slider' | 'toggle';
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description?: string;
}

interface SectionDisplayEditorProps<T extends object> {
  title: string;
  description: string;
  icon?: LucideIcon;
  data: T;
  isLoading: boolean;
  isSaving: boolean;
  update: (value: T) => Promise<void>;
  fields: FieldConfig[];
  /** Optional sectionId for the Style tab. Omit to hide the Style tab. */
  styleSectionId?: string;
}

export function SectionDisplayEditor<T extends object>({
  title,
  description,
  icon,
  data,
  isLoading,
  isSaving,
  update,
  fields,
  styleSectionId,
}: SectionDisplayEditorProps<T>) {
  const __saveTelemetry = useSaveTelemetry(`section-display-editor:${title}`);
  const [localConfig, setLocalConfig] = useState<T>(data);
  // Canonical dirty-state hook. See src/hooks/useDirtyState.ts.
  useDirtyState(localConfig, data);

  useEffect(() => {
    if (data && !isLoading) {
      setLocalConfig(data);
    }
  }, [data, isLoading]);

  const handleSave = useCallback(async () => {
    try {
      await update(localConfig);
      toast.success(`${title} saved`);
      __saveTelemetry.event('save-success'); triggerPreviewRefresh(); __saveTelemetry.flush();
    } catch {
      toast.error('Failed to save');
    }
  }, [localConfig, update, title]);

  useEditorSaveAction(handleSave);

  const updateField = (key: string, value: unknown) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return <DashboardLoader className="h-64" size="xl" />;
  }

  const contentBody = (
    <>
      {fields.map((field) => {
        const value = localConfig[field.key as keyof T];

        switch (field.type) {
          case 'text':
            return (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  value={(value as string) || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              </div>
            );
          case 'textarea':
            return (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Textarea
                  value={(value as string) || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                />
              </div>
            );
          case 'select':
            return (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Select value={value as string} onValueChange={(v) => updateField(field.key, v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          case 'slider':
            return (
              <SliderInput
                key={field.key}
                label={field.label}
                value={value as number}
                onChange={(v) => updateField(field.key, v)}
                min={field.min ?? 1}
                max={field.max ?? 20}
                step={field.step ?? 1}
                unit={field.unit}
                description={field.description}
              />
            );
          case 'toggle':
            return (
              <ToggleInput
                key={field.key}
                label={field.label}
                value={value as boolean}
                onChange={(v) => updateField(field.key, v)}
                description={field.description}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );

  return (
    <EditorCard title={title} icon={icon} description={description}>
      {styleSectionId ? (
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="style">Background &amp; Style</TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="space-y-6 mt-0">
            {contentBody}
          </TabsContent>
          <TabsContent value="style" className="space-y-6 mt-0">
            <SectionStyleEditor
              value={(localConfig as { style_overrides?: Partial<StyleOverrides> }).style_overrides ?? {}}
              onChange={(next: Partial<StyleOverrides>) => updateField('style_overrides', next)}
              sectionId={styleSectionId}
            />
          </TabsContent>
        </Tabs>
      ) : (
        contentBody
      )}
    </EditorCard>
  );
}
