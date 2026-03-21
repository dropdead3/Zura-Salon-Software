import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, MoreHorizontal, Pencil, Copy, Trash2, MessageSquare } from 'lucide-react';
import {
  useSmsTemplates,
  useUpdateSmsTemplate,
  useCreateSmsTemplate,
  useDeleteSmsTemplate,
  type SmsTemplate,
} from '@/hooks/useSmsTemplates';
import { SmsTemplateEditor } from './SmsTemplateEditor';
import { cn } from '@/lib/utils';

function getSegmentCount(text: string): number {
  const hasUnicode = /[^\u0000-\u007F]/.test(text);
  const limit = hasUnicode ? 70 : 160;
  return text.length === 0 ? 0 : Math.ceil(text.length / limit);
}

function getSegmentColor(segments: number): string {
  if (segments <= 1) return 'text-green-600';
  if (segments <= 2) return 'text-yellow-600';
  if (segments <= 3) return 'text-orange-600';
  return 'text-red-600';
}

export function SmsTemplatesManager() {
  const { data: templates, isLoading } = useSmsTemplates();
  const updateTemplate = useUpdateSmsTemplate();
  const createTemplate = useCreateSmsTemplate();
  const deleteTemplate = useDeleteSmsTemplate();

  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleToggleActive = (template: SmsTemplate) => {
    updateTemplate.mutate({
      id: template.id,
      updates: { is_active: !template.is_active },
    });
  };

  const handleSave = (updates: Partial<SmsTemplate>) => {
    if (editingTemplate) {
      updateTemplate.mutate(
        { id: editingTemplate.id, updates },
        { onSuccess: () => setEditingTemplate(null) }
      );
    } else if (isCreating) {
      // Generate a unique template key
      const templateKey = `custom_${Date.now()}`;
      createTemplate.mutate(
        {
          template_key: templateKey,
          name: updates.name!,
          message_body: updates.message_body!,
          description: updates.description || undefined,
          variables: updates.variables,
        },
        { onSuccess: () => setIsCreating(false) }
      );
    }
  };

  const handleDuplicate = (template: SmsTemplate) => {
    const templateKey = `${template.template_key}_copy_${Date.now()}`;
    createTemplate.mutate({
      template_key: templateKey,
      name: `${template.name} (Copy)`,
      message_body: template.message_body,
      description: template.description || undefined,
      variables: template.variables,
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTemplate.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const dialogOpen = !!editingTemplate || isCreating;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          <span>{templates?.length || 0} templates</span>
        </div>
        <Button onClick={() => setIsCreating(true)} size={tokens.button.card}>
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      </div>

      {/* Templates Table */}
      {templates && templates.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead className="hidden md:table-cell">Preview</TableHead>
                <TableHead className="text-center">Segments</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => {
                const segments = getSegmentCount(template.message_body);
                return (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[300px]">
                      <p className="text-sm text-muted-foreground truncate">
                        {template.message_body}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={cn('font-mono', getSegmentColor(segments))}
                      >
                        {segments}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={template.is_active}
                        onCheckedChange={() => handleToggleActive(template)}
                        disabled={updateTemplate.isPending}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteId(template.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-display text-lg mb-2">NO SMS TEMPLATES</h3>
          <p className="text-muted-foreground mb-4">
            Create your first SMS template to get started.
          </p>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create Template
          </Button>
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingTemplate(null);
          setIsCreating(false);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingTemplate ? 'EDIT SMS TEMPLATE' : 'CREATE SMS TEMPLATE'}
            </DialogTitle>
            <DialogDescription>
              Customize your SMS template with dynamic variables.
            </DialogDescription>
          </DialogHeader>
          <SmsTemplateEditor
            template={editingTemplate}
            onSave={handleSave}
            onCancel={() => {
              setEditingTemplate(null);
              setIsCreating(false);
            }}
            isLoading={updateTemplate.isPending || createTemplate.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this SMS template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
