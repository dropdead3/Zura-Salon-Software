/**
 * SEO Task Auto-Action: "Do It For Me" AI content generation panel.
 * Shows on eligible task templates. Generate → Preview → Apply flow.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSEOGenerateContent } from '@/hooks/useSEOGenerateContent';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Sparkles, RefreshCw, Check, Copy } from 'lucide-react';
import { AI_ELIGIBLE_TEMPLATES } from '@/config/seo-engine/seo-task-templates';

interface Props {
  task: any;
  organizationId: string;
}

export function SEOTaskAutoAction({ task, organizationId }: Props) {
  const templateKey = task?.template_key;
  const eligibility = AI_ELIGIBLE_TEMPLATES[templateKey];

  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [preview, setPreview] = useState('');
  const [applying, setApplying] = useState(false);
  const generateMut = useSEOGenerateContent();
  const qc = useQueryClient();

  if (!eligibility) return null;

  const handleGenerate = async () => {
    const result = await generateMut.mutateAsync({
      templateKey,
      objectKey: task.seo_objects?.object_key,
      objectLabel: task.seo_objects?.label,
      locationName: task.location_id, // Simplified; could resolve location name
      taskId: task.id,
    });
    setGeneratedContent(result.content);
    setPreview(result.preview);
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const { error } = await supabase
        .from('seo_tasks' as any)
        .update({
          ai_generated_content: {
            ...(task.ai_generated_content || {}),
            generated_output: generatedContent,
            generated_at: new Date().toISOString(),
          },
        })
        .eq('id', task.id);

      if (error) throw error;

      qc.invalidateQueries({ queryKey: ['seo-tasks'] });
      toast({ title: 'Content applied', description: 'AI-generated content saved to this task.' });
      setGeneratedContent(null);
      setPreview('');
    } catch (err) {
      toast({ title: 'Failed to apply', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setApplying(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(preview);
    toast({ title: 'Copied to clipboard' });
  };

  // Already has generated output stored
  const existingOutput = task.ai_generated_content?.generated_output;

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-sans font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {eligibility.label}
          </p>
          <Badge variant="outline" className="text-[10px] font-display tracking-wide">AI ASSIST</Badge>
        </div>

        {!generatedContent && !existingOutput && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={generateMut.isPending}
            className="gap-1.5 font-sans w-full"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {generateMut.isPending ? 'Generating…' : eligibility.buttonLabel}
          </Button>
        )}

        {/* Show existing applied content */}
        {existingOutput && !generatedContent && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-sans">Previously generated content is saved on this task.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={generateMut.isPending}
              className="gap-1.5 font-sans"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </Button>
          </div>
        )}

        {/* Preview generated content */}
        {preview && (
          <div className="space-y-2">
            <Separator />
            <div className="bg-muted/50 rounded-lg p-3 max-h-64 overflow-y-auto">
              <pre className="text-xs font-sans whitespace-pre-wrap text-foreground">{preview}</pre>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleApply}
                disabled={applying}
                className="gap-1.5 font-sans flex-1"
              >
                <Check className="w-3.5 h-3.5" />
                {applying ? 'Applying…' : 'Apply to Task'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="gap-1.5 font-sans"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerate}
                disabled={generateMut.isPending}
                className="gap-1.5 font-sans"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
