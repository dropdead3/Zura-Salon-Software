import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  GripVertical,
  ClipboardCheck,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface OnboardingTask {
  id: string;
  title: string;
  description: string | null;
  visible_to_roles: AppRole[];
  display_order: number;
  is_active: boolean;
  is_required: boolean;
  link_url: string | null;
}

const ALL_ROLES: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'stylist', label: 'Stylist' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'stylist_assistant', label: 'Stylist Assistant' },
  { value: 'admin_assistant', label: 'Admin Assistant' },
  { value: 'operations_assistant', label: 'Operations Assistant' },
];

export function OnboardingTasksManager() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<OnboardingTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<OnboardingTask | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isRequired, setIsRequired] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('onboarding_tasks')
      .select('*')
      .order('display_order');

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const openCreateDialog = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setLinkUrl('');
    setSelectedRoles([]);
    setIsActive(true);
    setIsRequired(true);
    setDialogOpen(true);
  };

  const openEditDialog = (task: OnboardingTask) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setLinkUrl(task.link_url || '');
    setSelectedRoles(task.visible_to_roles || []);
    setIsActive(task.is_active);
    setIsRequired(task.is_required);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Title is required' });
      return;
    }

    if (selectedRoles.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Select at least one role' });
      return;
    }

    setSaving(true);

    if (editingTask) {
      const { error } = await supabase
        .from('onboarding_tasks')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          link_url: linkUrl.trim() || null,
          visible_to_roles: selectedRoles,
          is_active: isActive,
          is_required: isRequired
        })
        .eq('id', editingTask.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Success', description: 'Task updated' });
        setDialogOpen(false);
        fetchTasks();
      }
    } else {
      const maxOrder = Math.max(0, ...tasks.map(t => t.display_order));
      
      const { error } = await supabase
        .from('onboarding_tasks')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          link_url: linkUrl.trim() || null,
          visible_to_roles: selectedRoles,
          is_active: isActive,
          is_required: isRequired,
          display_order: maxOrder + 1
        });

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Success', description: 'Task created' });
        setDialogOpen(false);
        fetchTasks();
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;

    const { error } = await supabase
      .from('onboarding_tasks')
      .delete()
      .eq('id', taskToDelete.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Task deleted' });
      fetchTasks();
    }
    
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const toggleRole = (role: AppRole) => {
    setSelectedRoles(prev => 
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const selectAllRoles = () => {
    setSelectedRoles(ALL_ROLES.map(r => r.value));
  };

  const clearAllRoles = () => {
    setSelectedRoles([]);
  };

  const moveTask = async (taskId: string, direction: 'up' | 'down') => {
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tasks.length) return;

    const task1 = tasks[index];
    const task2 = tasks[newIndex];

    await Promise.all([
      supabase.from('onboarding_tasks').update({ display_order: task2.display_order }).eq('id', task1.id),
      supabase.from('onboarding_tasks').update({ display_order: task1.display_order }).eq('id', task2.id)
    ]);

    fetchTasks();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          <span className="font-sans text-sm text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} configured
          </span>
        </div>
        <Button onClick={openCreateDialog} size={tokens.button.card} className="font-display text-xs">
          <Plus className="w-4 h-4 mr-1" />
          ADD TASK
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-8 text-center">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground font-sans">No onboarding tasks configured</p>
          <Button onClick={openCreateDialog} variant="outline" size={tokens.button.card} className="mt-4 font-display text-xs">
            <Plus className="w-4 h-4 mr-1" />
            CREATE FIRST TASK
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task, index) => (
            <Card 
              key={task.id} 
              className={`p-4 ${!task.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={index === 0}
                    onClick={() => moveTask(task.id, 'up')}
                  >
                    <GripVertical className="w-3 h-3 rotate-90" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={index === tasks.length - 1}
                    onClick={() => moveTask(task.id, 'down')}
                  >
                    <GripVertical className="w-3 h-3 rotate-90" />
                  </Button>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-sans font-medium text-sm">{task.title}</span>
                    {task.link_url && (
                      <ExternalLink className="w-3 h-3 text-primary" />
                    )}
                    {task.is_required ? (
                      <Badge variant="destructive" className="text-[10px]">Required</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Optional</Badge>
                    )}
                    {!task.is_active && (
                      <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                  )}
                  {task.link_url && (
                    <p className="text-xs text-primary truncate mb-2">{task.link_url}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {task.visible_to_roles.map(role => (
                      <Badge key={role} variant="outline" className="text-xs capitalize">
                        {role.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(task)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => { setTaskToDelete(task); setDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingTask ? 'EDIT TASK' : 'CREATE TASK'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Complete your profile"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details about this task..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link-url">Task Link URL (optional)</Label>
              <Input
                id="link-url"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com/register"
              />
              <p className="text-xs text-muted-foreground">
                Users will see a clickable link button to open this URL
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Visible to Roles *</Label>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={selectAllRoles}
                  >
                    Select All
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={clearAllRoles}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                {ALL_ROLES.map(role => (
                  <label 
                    key={role.value} 
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    <span className="capitalize">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is-required"
                checked={isRequired}
                onCheckedChange={(checked) => setIsRequired(checked === true)}
              />
              <Label htmlFor="is-required" className="cursor-pointer">
                Task is required for onboarding completion
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is-active"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              <Label htmlFor="is-active" className="cursor-pointer">
                Task is active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="font-display">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTask ? 'SAVE CHANGES' : 'CREATE TASK'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{taskToDelete?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}