import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { ChevronDown, ChevronRight, Edit2, Trash2, Archive, RotateCcw, GripVertical } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { getRoleIconComponent } from '@/components/dashboard/RoleIconPicker';
import { getRoleColorClasses } from '@/components/dashboard/RoleColorPicker';
import { RoleIconPicker } from '@/components/dashboard/RoleIconPicker';
import { RoleColorPicker } from '@/components/dashboard/RoleColorPicker';
import { ResponsibilityAssetsEditor } from './ResponsibilityAssetsEditor';
import { cn } from '@/lib/utils';
import type { Responsibility } from '@/hooks/useResponsibilities';

interface ResponsibilityCardProps {
  responsibility: Responsibility;
  canManage: boolean;
  onUpdate: (id: string, data: Partial<Responsibility>) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: any;
}

export function ResponsibilityCard({
  responsibility,
  canManage,
  onUpdate,
  onArchive,
  onRestore,
  onDelete,
  dragHandleProps,
}: ResponsibilityCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState({
    display_name: responsibility.display_name,
    description: responsibility.description || '',
    icon: responsibility.icon,
    color: responsibility.color,
  });

  const IconComponent = getRoleIconComponent(responsibility.icon);
  const colorClasses = getRoleColorClasses(responsibility.color);

  const handleSave = () => {
    onUpdate(responsibility.id, {
      display_name: editData.display_name,
      name: editData.display_name.toLowerCase().replace(/\s+/g, '_'),
      description: editData.description || null,
      icon: editData.icon,
      color: editData.color,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Card className="border-primary/30">
        <CardContent className="p-4 space-y-4">
          <Input
            value={editData.display_name}
            onChange={(e) => setEditData(prev => ({ ...prev, display_name: e.target.value }))}
            placeholder="Display Name"
          />
          <Textarea
            value={editData.description}
            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Description"
            rows={2}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">Icon</label>
            <RoleIconPicker value={editData.icon} onChange={(icon) => setEditData(prev => ({ ...prev, icon }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <RoleColorPicker value={editData.color} onChange={(color) => setEditData(prev => ({ ...prev, color }))} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size={tokens.button.card} onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button size={tokens.button.card} onClick={handleSave} disabled={!editData.display_name.trim()}>Save</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(!responsibility.is_active && 'opacity-60')}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {canManage && responsibility.is_active && (
              <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                <GripVertical className="h-4 w-4" />
              </div>
            )}
            <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg', colorClasses.bg)}>
              <IconComponent className={cn('h-4 w-4', colorClasses.text)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">{responsibility.display_name}</h4>
                {!responsibility.is_active && (
                  <Badge variant="secondary" className="text-xs">Archived</Badge>
                )}
              </div>
              {responsibility.description && (
                <p className="text-xs text-muted-foreground truncate">{responsibility.description}</p>
              )}
            </div>
            {canManage && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                {responsibility.is_active ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onArchive(responsibility.id)}>
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRestore(responsibility.id)}>
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(true)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Expandable assets section */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size={tokens.button.inline} className="mt-2 h-7 text-xs text-muted-foreground gap-1 px-2">
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Helper Assets
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <ResponsibilityAssetsEditor responsibilityId={responsibility.id} canManage={canManage} />
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{responsibility.display_name}"?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this responsibility and all its assets. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onDelete(responsibility.id); setDeleteConfirm(false); }} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
