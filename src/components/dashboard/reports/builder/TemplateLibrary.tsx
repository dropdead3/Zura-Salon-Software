import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  FileText, 
  Users, 
  Clock, 
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  Share2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCustomReportTemplates, useDeleteReportTemplate } from '@/hooks/useCustomReportTemplates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface TemplateLibraryProps {
  onSelectTemplate: (templateId: string) => void;
  onCreateNew: () => void;
}

export function TemplateLibrary({ onSelectTemplate, onCreateNew }: TemplateLibraryProps) {
  const { data: templates, isLoading } = useCustomReportTemplates();
  const deleteTemplate = useDeleteReportTemplate();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      deleteTemplate.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Report Templates</h2>
          <p className="text-sm text-muted-foreground">
            Create custom reports or use saved templates
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Create New
        </Button>
      </div>

      {/* Templates Grid */}
      {templates?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">No templates yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first custom report template
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates?.map(template => (
            <Card 
              key={template.id} 
              className="group cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => onSelectTemplate(template.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size={tokens.button.inline} className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectTemplate(template.id); }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); setDeleteId(template.id); }}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {template.config.metrics?.length || 0} metrics
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {template.created_at && formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}
                  </div>
                </div>
                <div className="flex gap-1 mt-3">
                  {template.is_shared && (
                    <Badge variant="secondary" className="text-xs">Shared</Badge>
                  )}
                  <Badge variant="outline" className="text-xs capitalize">
                    {template.config.visualization?.replace('_', ' ') || 'table'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this report template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
