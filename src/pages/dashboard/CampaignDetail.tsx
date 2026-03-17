import { useState } from 'react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Rocket, CheckCircle2, Archive, Loader2,
  MessageSquare, Hash, Copy, Calendar, Clock,
  Circle, PlayCircle, Trash2, Plus, Pencil, RotateCcw, GripVertical,
} from 'lucide-react';
import {
  useActionCampaignWithTasks,
  useUpdateCampaignStatus,
  useUpdateCampaignTaskStatus,
  useDeleteCampaign,
  useUpdateCampaign,
  useAddCampaignTask,
  useDeleteCampaignTask,
  useReorderCampaignTasks,
  ActionCampaignTask,
} from '@/hooks/useActionCampaigns';
import { ShareToDMDialog } from '@/components/dashboard/sales/ShareToDMDialog';
import { ShareToChannelDialog } from '@/components/dashboard/campaigns/ShareToChannelDialog';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const taskStatusIcon: Record<string, typeof Circle> = {
  not_started: Circle,
  in_progress: PlayCircle,
  done: CheckCircle2,
};

const taskStatusColor: Record<string, string> = {
  not_started: 'text-muted-foreground',
  in_progress: 'text-primary',
  done: 'text-chart-2',
};

const priorityColor: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-primary/10 text-primary border-primary/20',
  low: 'bg-muted text-muted-foreground border-border',
};

function SortableTaskCard({
  task,
  updateTaskStatus,
  deleteTask,
}: {
  task: ActionCampaignTask;
  updateTaskStatus: ReturnType<typeof useUpdateCampaignTaskStatus>;
  deleteTask: ReturnType<typeof useDeleteCampaignTask>;
}) {
  const { formatDate } = useFormatDate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const Icon = taskStatusIcon[task.status] || Circle;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-4 rounded-xl shadow-sm transition-all',
        task.status === 'done' && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 shrink-0 cursor-grab active:cursor-grabbing touch-none"
          tabIndex={-1}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground/30" />
        </button>
        <button
          onClick={() => {
            const next = task.status === 'not_started' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'not_started';
            updateTaskStatus.mutate({ id: task.id, status: next });
          }}
          className="mt-0.5 shrink-0"
        >
          <Icon className={cn('w-5 h-5', taskStatusColor[task.status])} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-medium',
              task.status === 'done' && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </span>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', priorityColor[task.priority])}>
              {task.priority}
            </Badge>
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
          )}
          {task.due_date && (
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Due {formatDate(new Date(task.due_date), 'MMM d')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Select
            value={task.status}
            onValueChange={(v) => updateTaskStatus.mutate({ id: task.id, status: v })}
          >
            <SelectTrigger className="w-[120px] h-7 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive/40 hover:text-destructive"
            onClick={() => deleteTask.mutate(task.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function CampaignDetail() {
  const { formatDate } = useFormatDate();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: campaign, isLoading } = useActionCampaignWithTasks(id || null);
  const updateStatus = useUpdateCampaignStatus();
  const updateTaskStatus = useUpdateCampaignTaskStatus();
  const deleteCampaign = useDeleteCampaign();
  const updateCampaign = useUpdateCampaign();
  const addTask = useAddCampaignTask();
  const deleteTask = useDeleteCampaignTask();
  const reorderTasks = useReorderCampaignTasks();

  const [dmOpen, setDmOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);

  // Inline edit states
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardLoader className="py-24" />
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-muted-foreground">Campaign not found</div>
      </DashboardLayout>
    );
  }

  const tasks = campaign.tasks || [];
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const formatForShare = () => {
    let text = `📋 **${campaign.name}**\n\n`;
    tasks.forEach((t, i) => {
      const icon = t.status === 'done' ? '✅' : t.status === 'in_progress' ? '🔄' : '⬜';
      text += `${icon} ${i + 1}. ${t.title}`;
      if (t.due_date) text += ` (due ${formatDate(new Date(t.due_date), 'MMM d')})`;
      text += '\n';
    });
    if (campaign.leadership_note) {
      text += `\n---\n_Note:_ ${campaign.leadership_note}`;
    }
    return text;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formatForShare().replace(/\*\*/g, ''));
    toast.success('Copied to clipboard');
  };

  const handleDelete = () => {
    deleteCampaign.mutate(campaign.id, {
      onSuccess: () => navigate('/dashboard/campaigns'),
    });
  };

  const handleSaveName = () => {
    if (nameValue.trim() && nameValue.trim() !== campaign.name) {
      updateCampaign.mutate({ id: campaign.id, name: nameValue.trim() });
    }
    setEditingName(false);
  };

  const handleSaveNote = () => {
    updateCampaign.mutate({ id: campaign.id, leadership_note: noteValue.trim() || undefined });
    setEditingNote(false);
  };

  const handleSaveDescription = () => {
    updateCampaign.mutate({ id: campaign.id, description: descriptionValue.trim() || undefined });
    setEditingDescription(false);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    addTask.mutate({
      campaign_id: campaign.id,
      title: newTaskTitle.trim(),
      sort_order: tasks.length,
    });
    setNewTaskTitle('');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(tasks, oldIndex, newIndex);
    reorderTasks.mutate(
      reordered.map((t, i) => ({ id: t.id, sort_order: i }))
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/campaigns')}
            className="mt-1 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Rocket className="w-4 h-4 text-primary shrink-0" />
              {editingName ? (
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  className="text-xl font-display tracking-wide h-auto py-0 px-1"
                  autoFocus
                />
              ) : (
                <h1
                  className="text-xl md:text-2xl font-display tracking-wide truncate cursor-pointer hover:text-primary/80 transition-colors"
                  onClick={() => {
                    setNameValue(campaign.name);
                    setEditingName(true);
                  }}
                  title="Click to edit"
                >
                  {campaign.name}
                </h1>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[11px] capitalize">
                {campaign.status}
              </Badge>
              {campaign.goal_period && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {campaign.goal_period}
                </span>
              )}
              <Badge variant="outline" className="text-[10px] gap-1">
                <Calendar className="w-2.5 h-2.5" />
                {formatDate(new Date(campaign.created_at), 'MMM d')}
              </Badge>
            </div>

            {/* Editable description */}
            {editingDescription ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                  placeholder="Add a campaign description..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size={tokens.button.inline} variant="ghost" onClick={() => setEditingDescription(false)}>Cancel</Button>
                  <Button size={tokens.button.inline} onClick={handleSaveDescription}>Save</Button>
                </div>
              </div>
            ) : (
              <p
                className="text-xs text-muted-foreground mt-2 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => {
                  setDescriptionValue(campaign.description || '');
                  setEditingDescription(true);
                }}
                title="Click to edit"
              >
                {campaign.description || <span className="italic text-muted-foreground/60">Add description...</span>}
              </p>
            )}
          </div>
        </div>

        {/* Progress + Actions */}
        <Card className="p-5 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{doneCount}/{tasks.length} complete</span>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy} title="Copy">
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDmOpen(true)} title="Share via DM">
                <MessageSquare className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setChannelOpen(true)} title="Post to channel">
                <Hash className="w-3.5 h-3.5" />
              </Button>
              {campaign.status === 'active' && progress === 100 && (
                <Button
                  variant="ghost"
                  size={tokens.button.inline}
                  className="text-chart-2 text-xs"
                  onClick={() => updateStatus.mutate({ id: campaign.id, status: 'completed' })}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Mark Complete
                </Button>
              )}
              {campaign.status === 'active' && (
                <Button
                  variant="ghost"
                  size={tokens.button.inline}
                  className="text-muted-foreground text-xs"
                  onClick={() => updateStatus.mutate({ id: campaign.id, status: 'archived' })}
                >
                  <Archive className="w-3.5 h-3.5 mr-1" />
                  Archive
                </Button>
              )}
              {(campaign.status === 'completed' || campaign.status === 'archived') && (
                <Button
                  variant="ghost"
                  size={tokens.button.inline}
                  className="text-primary text-xs"
                  onClick={() => updateStatus.mutate({ id: campaign.id, status: 'active' })}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reactivate
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive" title="Delete campaign">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{campaign.name}" and all its tasks. This action cannot be undone.
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
          </div>
          <Progress value={progress} className="h-2" />
        </Card>

        {/* Leadership note */}
        <Card className="p-4 rounded-xl border-primary/10 bg-primary/5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-muted-foreground">Leadership Note</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setNoteValue(campaign.leadership_note || '');
                setEditingNote(!editingNote);
              }}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          </div>
          {editingNote ? (
            <div className="space-y-2">
              <Textarea
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                rows={2}
                className="text-sm resize-none"
                placeholder="Add context for your team..."
                autoFocus
              />
              <div className="flex gap-2">
                <Button size={tokens.button.inline} variant="ghost" onClick={() => setEditingNote(false)}>Cancel</Button>
                <Button size={tokens.button.inline} onClick={handleSaveNote}>Save</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm">{campaign.leadership_note || <span className="text-muted-foreground/60 italic">No note added</span>}</p>
          )}
        </Card>

        {/* Tasks */}
        <div className="space-y-2">
          <h2 className="font-display text-xs tracking-[0.15em] mb-3">ACTION STEPS</h2>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {tasks.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  updateTaskStatus={updateTaskStatus}
                  deleteTask={deleteTask}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add task row */}
          <div className="flex items-center gap-2 pt-1">
            <Plus className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="Add a task..."
              className="text-sm h-9 border-dashed"
            />
            <Button
              variant="ghost"
              size={tokens.button.inline}
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim()}
              className="shrink-0 text-xs"
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Share Dialogs */}
      <ShareToDMDialog
        open={dmOpen}
        onOpenChange={setDmOpen}
        planTitle={campaign.name}
        planContent={formatForShare()}
      />
      <ShareToChannelDialog
        open={channelOpen}
        onOpenChange={setChannelOpen}
        campaignName={campaign.name}
        content={formatForShare()}
      />
    </DashboardLayout>
  );
}