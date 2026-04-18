import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { tokens } from '@/lib/design-tokens';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertCircle, 
  Clock, 
  Key, 
  Zap, 
  Settings,
  ExternalLink,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2
} from "lucide-react";
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useBuildTasks, useCreateBuildTask, useUpdateBuildTask, useDeleteBuildTask, useToggleBuildTaskStatus, type BuildTask, type BuildTaskStatus, type BuildTaskCategory, type BuildTaskPriority } from "@/hooks/useBuildTasks";
import { toast } from "sonner";
import { BentoGrid } from '@/components/ui/bento-grid';

const priorityConfig = {
  'high': { label: 'High', color: 'bg-destructive/20 text-destructive' },
  'medium': { label: 'Medium', color: 'bg-accent text-accent-foreground' },
  'low': { label: 'Low', color: 'bg-muted text-muted-foreground' }
};

const categoryIcons = {
  'api': Key,
  'enhancement': Zap,
  'setup': Settings,
  'integration': ExternalLink
};

const statusOptions: { value: BuildTaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'complete', label: 'Complete' },
];

const categoryOptions: { value: BuildTaskCategory; label: string }[] = [
  { value: 'api', label: 'API' },
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'setup', label: 'Setup' },
  { value: 'integration', label: 'Integration' },
];

const priorityOptions: { value: BuildTaskPriority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

interface TaskFormData {
  task_key: string;
  title: string;
  description: string;
  status: BuildTaskStatus;
  category: BuildTaskCategory;
  priority: BuildTaskPriority;
  blocked_by: string;
  notes: string;
}

const defaultFormData: TaskFormData = {
  task_key: '',
  title: '',
  description: '',
  status: 'pending',
  category: 'enhancement',
  priority: 'medium',
  blocked_by: '',
  notes: '',
};

export default function DashboardBuild() {
  const { data: buildTasks = [], isLoading } = useBuildTasks();
  const createTask = useCreateBuildTask();
  const updateTask = useUpdateBuildTask();
  const deleteTask = useDeleteBuildTask();
  const toggleStatus = useToggleBuildTaskStatus();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<BuildTask | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const blockedTasks = buildTasks.filter(t => t.status === 'blocked');
  const pendingTasks = buildTasks.filter(t => t.status === 'pending');
  const inProgressTasks = buildTasks.filter(t => t.status === 'in-progress');
  const completeTasks = buildTasks.filter(t => t.status === 'complete');

  const completionRate = buildTasks.length > 0 
    ? Math.round((completeTasks.length / buildTasks.length) * 100) 
    : 0;

  const handleOpenDialog = (task?: BuildTask) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        task_key: task.task_key,
        title: task.title,
        description: task.description || '',
        status: task.status,
        category: task.category,
        priority: task.priority,
        blocked_by: task.blocked_by || '',
        notes: task.notes?.join('\n') || '',
      });
    } else {
      setEditingTask(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.task_key || !formData.title) {
      toast.error('Task key and title are required');
      return;
    }

    const taskData = {
      task_key: formData.task_key,
      title: formData.title,
      description: formData.description || null,
      status: formData.status,
      category: formData.category,
      priority: formData.priority,
      blocked_by: formData.blocked_by || null,
      notes: formData.notes ? formData.notes.split('\n').filter(n => n.trim()) : [],
      sort_order: editingTask?.sort_order || buildTasks.length,
    };

    try {
      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, ...taskData });
        toast.success('Task updated');
      } else {
        await createTask.mutateAsync(taskData);
        toast.success('Task created');
      }
      setIsDialogOpen(false);
      setEditingTask(null);
      setFormData(defaultFormData);
    } catch (error) {
      toast.error('Failed to save task');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask.mutateAsync(id);
      toast.success('Task deleted');
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleStatusChange = async (task: BuildTask, newStatus: BuildTaskStatus) => {
    try {
      await toggleStatus.mutateAsync({ id: task.id, status: newStatus });
      toast.success(`Task marked as ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardLoader size="lg" fullPage />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 md:px-8 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium">Dashboard Build Status</h1>
            <p className="text-muted-foreground">Track pending tasks, API integrations, and enhancement roadmap</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                <DialogDescription>
                  {editingTask ? 'Update the task details below.' : 'Create a new build task.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Task Key</label>
                  <Input
                    placeholder="e.g., vapid-keys"
                    value={formData.task_key}
                    onChange={(e) => setFormData({ ...formData, task_key: e.target.value })}
                    disabled={!!editingTask}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Task title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Task description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: BuildTaskStatus) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: BuildTaskCategory) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: BuildTaskPriority) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.status === 'blocked' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Blocked By</label>
                    <Input
                      placeholder="What's blocking this task?"
                      value={formData.blocked_by}
                      onChange={(e) => setFormData({ ...formData, blocked_by: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (one per line)</label>
                  <Textarea
                    placeholder="Add notes, one per line"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createTask.isPending || updateTask.isPending}>
                  {(createTask.isPending || updateTask.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingTask ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Overview Stats */}
        <BentoGrid maxPerRow={5} gap="gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{completionRate}%</p>
                  <p className="text-sm text-muted-foreground">Complete</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/20">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{blockedTasks.length}</p>
                  <p className="text-sm text-muted-foreground">Blocked</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent">
                  <Zap className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{inProgressTasks.length}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{pendingTasks.length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-medium">{completeTasks.length}</p>
                  <p className="text-sm text-muted-foreground">Done</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </BentoGrid>

        {/* Blocked Tasks - Priority */}
        {blockedTasks.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle>Blocked - Action Required</CardTitle>
              </div>
              <CardDescription>These items need external input to proceed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {blockedTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  variant="blocked"
                  onEdit={() => handleOpenDialog(task)}
                  onDelete={() => setDeleteConfirmId(task.id)}
                  onStatusChange={handleStatusChange}
                  deleteConfirmId={deleteConfirmId}
                  onDeleteConfirm={handleDelete}
                  onDeleteCancel={() => setDeleteConfirmId(null)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* In Progress Tasks */}
        {inProgressTasks.length > 0 && (
          <Card className="border-accent">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent-foreground" />
                <CardTitle>In Progress</CardTitle>
              </div>
              <CardDescription>Tasks currently being worked on</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {inProgressTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  variant="in-progress"
                  onEdit={() => handleOpenDialog(task)}
                  onDelete={() => setDeleteConfirmId(task.id)}
                  onStatusChange={handleStatusChange}
                  deleteConfirmId={deleteConfirmId}
                  onDeleteConfirm={handleDelete}
                  onDeleteCancel={() => setDeleteConfirmId(null)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pending Enhancements */}
        {pendingTasks.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Pending Enhancements</CardTitle>
              </div>
              <CardDescription>Future features and improvements in the roadmap</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  variant="pending"
                  onEdit={() => handleOpenDialog(task)}
                  onDelete={() => setDeleteConfirmId(task.id)}
                  onStatusChange={handleStatusChange}
                  deleteConfirmId={deleteConfirmId}
                  onDeleteConfirm={handleDelete}
                  onDeleteCancel={() => setDeleteConfirmId(null)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Completed Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              <CardTitle>Completed</CardTitle>
            </div>
            <CardDescription>{completeTasks.length} features shipped and ready</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {completeTasks.map(task => {
                const CategoryIcon = categoryIcons[task.category];
                return (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Checkbox checked disabled className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                    <CategoryIcon className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{task.title}</span>
                      {task.notes && task.notes.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">{task.notes[0]}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(task)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

interface TaskCardProps {
  task: BuildTask;
  variant: 'blocked' | 'in-progress' | 'pending';
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (task: BuildTask, status: BuildTaskStatus) => void;
  deleteConfirmId: string | null;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}

function TaskCard({ task, variant, onEdit, onDelete, onStatusChange, deleteConfirmId, onDeleteConfirm, onDeleteCancel }: TaskCardProps) {
  const CategoryIcon = categoryIcons[task.category];
  
  const variantStyles = {
    blocked: 'p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-3',
    'in-progress': 'p-4 rounded-lg border border-accent bg-accent/10 space-y-2',
    pending: 'p-4 rounded-lg border bg-card space-y-2',
  };

  return (
    <div className={variantStyles[variant]}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <CategoryIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="font-medium">{task.title}</h4>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={priorityConfig[task.priority].color}>
            {priorityConfig[task.priority].label}
          </Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          {deleteConfirmId === task.id ? (
            <div className="flex items-center gap-1">
              <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => onDeleteConfirm(task.id)}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDeleteCancel}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      {variant === 'blocked' && task.blocked_by && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{task.blocked_by}</span>
        </div>
      )}
      {task.notes && task.notes.length > 0 && (
        <ul className="text-sm text-muted-foreground space-y-1 ml-8">
          {task.notes.map((note, i) => (
            <li key={i} className="list-disc">{note}</li>
          ))}
        </ul>
      )}
      {variant !== 'blocked' && (
        <div className="flex items-center gap-2 ml-8">
          <span className="text-xs text-muted-foreground">Move to:</span>
          {variant !== 'pending' && (
            <Button variant="outline" size={tokens.button.inline} className="h-6 text-xs" onClick={() => onStatusChange(task, 'pending')}>
              Pending
            </Button>
          )}
          {variant !== 'in-progress' && (
            <Button variant="outline" size={tokens.button.inline} className="h-6 text-xs" onClick={() => onStatusChange(task, 'in-progress')}>
              In Progress
            </Button>
          )}
          <Button variant="outline" size={tokens.button.inline} className="h-6 text-xs" onClick={() => onStatusChange(task, 'complete')}>
            Complete
          </Button>
        </div>
      )}
    </div>
  );
}
