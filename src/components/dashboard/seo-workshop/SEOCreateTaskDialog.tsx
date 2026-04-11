/**
 * SEO Create Task Dialog — Manual ad-hoc task creation (M6).
 * Allows admins to create targeted one-off SEO tasks from templates.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { SEO_TASK_TEMPLATE_LIST, SEO_TASK_TEMPLATES } from '@/config/seo-engine/seo-task-templates';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SEOCreateTaskDialog({ organizationId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [templateKey, setTemplateKey] = useState('');
  const [title, setTitle] = useState('');
  const [explanation, setExplanation] = useState('');
  const [priority, setPriority] = useState([60]);
  const [isCreating, setIsCreating] = useState(false);

  const selectedTemplate = templateKey ? SEO_TASK_TEMPLATES[templateKey] : null;

  const handleCreate = async () => {
    if (!templateKey || !title.trim()) {
      toast.error('Select a template and enter a title.');
      return;
    }

    setIsCreating(true);
    try {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + (selectedTemplate?.defaultDueDays ?? 7));

      const { data: taskData, error } = await supabase.from('seo_tasks' as any).insert({
        organization_id: organizationId,
        template_key: templateKey,
        status: 'detected',
        priority_score: priority[0],
        priority_factors: { source: 'manual_creation', created_by: user?.id },
        assigned_role: null,
        due_at: dueAt.toISOString(),
        ai_generated_content: {
          title: title.trim(),
          explanation: explanation.trim() || `Manually created ${selectedTemplate?.label ?? templateKey} task.`,
        },
      }).select('id').single();

      if (error) throw error;

      // Create history record
      if ((taskData as any)?.id) {
        await supabase.from('seo_task_history' as any).insert({
          task_id: (taskData as any).id,
          previous_status: null,
          new_status: 'detected',
          performed_by: user?.id ?? 'system',
          action: 'manual_created',
        });
      }

      toast.success('SEO task created');
      queryClient.invalidateQueries({ queryKey: ['seo-tasks'] });
      onOpenChange(false);
      setTemplateKey('');
      setTitle('');
      setExplanation('');
      setPriority([60]);
    } catch {
      toast.error('Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide">Create SEO Task</DialogTitle>
          <DialogDescription className="font-sans text-sm">
            Create a one-off SEO task from a template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-sans text-sm">Template</Label>
            <Select value={templateKey} onValueChange={(v) => {
              setTemplateKey(v);
              const tmpl = SEO_TASK_TEMPLATES[v];
              if (tmpl && !title) setTitle(tmpl.label);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a task template" />
              </SelectTrigger>
              <SelectContent>
                {SEO_TASK_TEMPLATE_LIST.map((t) => (
                  <SelectItem key={t.templateKey} value={t.templateKey}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-sans text-sm">Task Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fix homepage meta description"
              className="font-sans"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-sans text-sm">Explanation (optional)</Label>
            <Input
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Why this task matters..."
              className="font-sans"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-sans text-sm">Priority: {priority[0]}</Label>
            <Slider
              value={priority}
              onValueChange={setPriority}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={isCreating || !templateKey || !title.trim()}
            className="w-full font-sans"
          >
            {isCreating ? 'Creating…' : 'Create Task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
