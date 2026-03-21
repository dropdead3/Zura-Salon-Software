import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FileCheck, Camera, ClipboardList, FileText } from 'lucide-react';
import { useCreateFormTemplate, useUpdateFormTemplate, type FormTemplate } from '@/hooks/useFormTemplates';
import { useAuth } from '@/contexts/AuthContext';

const FORM_TYPES = {
  service_agreement: { label: 'Service Agreement', icon: FileCheck },
  model_release: { label: 'Model Release', icon: Camera },
  consultation: { label: 'Consultation Form', icon: ClipboardList },
  custom: { label: 'Custom Form', icon: FileText },
} as const;

interface FormTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: FormTemplate | null;
}

export function FormTemplateEditor({ open, onOpenChange, template }: FormTemplateEditorProps) {
  const { user } = useAuth();
  const createTemplate = useCreateFormTemplate();
  const updateTemplate = useUpdateFormTemplate();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formType, setFormType] = useState<FormTemplate['form_type']>('custom');
  const [content, setContent] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setFormType(template.form_type);
      setContent(template.content);
      setVersion(template.version);
      setIsActive(template.is_active);
    } else {
      setName('');
      setDescription('');
      setFormType('custom');
      setContent('');
      setVersion('v1.0');
      setIsActive(true);
    }
  }, [template, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const templateData = {
      name: name.trim(),
      description: description.trim() || null,
      form_type: formType,
      content: content.trim(),
      version: version.trim(),
      is_active: isActive,
      requires_witness: false,
      created_by: user?.id || null,
    };

    try {
      if (template) {
        await updateTemplate.mutateAsync({ id: template.id, updates: templateData });
      } else {
        await createTemplate.mutateAsync(templateData);
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const isSubmitting = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Form Template' : 'Create New Form Template'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Extensions Agreement"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Form Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as FormTemplate['form_type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FORM_TYPES).map(([key, { label, icon: Icon }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description for admin view"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Form Content (Markdown supported)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Service Agreement&#10;&#10;By signing below, I agree to..."
              className="min-h-[300px] font-mono text-sm"
              required
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is-active" className="cursor-pointer">
              Active (clients can sign this version)
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !content.trim()}>
              {isSubmitting ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
