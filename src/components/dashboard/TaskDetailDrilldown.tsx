import { useState, useEffect } from 'react';
import { format, parseISO, startOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Calendar, Clock, CheckCircle2, Sparkles, FileText, StickyNote, RefreshCw, AlarmClock, Plus, X, ListChecks, TrendingUp, Shield, Rocket, Unlock, Timer, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { DRILLDOWN_DIALOG_CONTENT_CLASS, DRILLDOWN_OVERLAY_CLASS } from './drilldownDialogStyles';
import type { Task } from '@/hooks/useTasks';
import { useTaskChecklist } from '@/hooks/useTaskChecklist';

interface TaskDetailDrilldownProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  isReadOnly?: boolean;
  isNotesSaving?: boolean;
}

const priorityConfig = {
  low: { label: 'Low', class: 'bg-muted text-muted-foreground' },
  normal: { label: 'Normal', class: 'bg-blue-500/10 text-blue-500' },
  high: { label: 'High', class: 'bg-orange-500/10 text-orange-500' },
};

export function TaskDetailDrilldown({
  task,
  open,
  onOpenChange,
  onToggle,
  onEdit,
  onDelete,
  onUpdateNotes,
  isReadOnly = false,
  isNotesSaving = false,
}: TaskDetailDrilldownProps) {
  const { formatCurrency } = useFormatCurrency();
  const [localNotes, setLocalNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const { items: checklistItems, addItem, toggleItem, deleteItem } = useTaskChecklist(open ? task?.id ?? null : null);

  useEffect(() => {
    if (task) {
      setLocalNotes(task.notes || '');
      setNotesDirty(false);
      setNewChecklistItem('');
    }
  }, [task]);

  if (!task) return null;

  const isOverdue = task.due_date && !task.is_completed && startOfDay(parseISO(task.due_date)) < startOfDay(new Date());
  const priority = priorityConfig[task.priority];
  const isSnoozed = task.snoozed_until && startOfDay(parseISO(task.snoozed_until)) > startOfDay(new Date());
  const completedChecklist = checklistItems.filter(i => i.is_completed).length;

  const handleSaveNotes = () => {
    onUpdateNotes(task.id, localNotes);
    setNotesDirty(false);
  };

  const handleAddChecklistItem = () => {
    const title = newChecklistItem.trim();
    if (!title) return;
    addItem.mutate({ title, sort_order: checklistItems.length });
    setNewChecklistItem('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DRILLDOWN_DIALOG_CONTENT_CLASS} overlayClassName={DRILLDOWN_OVERLAY_CLASS}>
        {/* Header */}
        <div className="p-6 pb-5 border-b border-border/50">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={task.is_completed}
              onCheckedChange={(checked) => !isReadOnly && onToggle(task.id, checked as boolean)}
              className="mt-1"
              disabled={isReadOnly}
            />
            <div className="flex-1 min-w-0">
              <DialogHeader>
                <DialogTitle className={cn(
                  "font-sans text-base text-left",
                  task.is_completed && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 border-0 rounded-full", priority.class)}>
                  {priority.label}
                </Badge>
                {task.is_completed && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-0 rounded-full bg-green-500/10 text-green-500">
                    Completed
                  </Badge>
                )}
                {isOverdue && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-0 rounded-full bg-destructive/10 text-destructive">
                    Overdue
                  </Badge>
                )}
                {task.task_type && (
                  <Badge variant="outline" className={cn(
                    "text-[10px] px-2 py-0.5 border-0 rounded-full gap-1 capitalize",
                    task.task_type === 'growth' ? 'bg-emerald-500/10 text-emerald-600' :
                    task.task_type === 'protection' ? 'bg-blue-500/10 text-blue-600' :
                    task.task_type === 'acceleration' ? 'bg-violet-500/10 text-violet-600' :
                    'bg-amber-500/10 text-amber-600',
                  )}>
                    {task.task_type === 'growth' && <TrendingUp className="w-2.5 h-2.5" />}
                    {task.task_type === 'protection' && <Shield className="w-2.5 h-2.5" />}
                    {task.task_type === 'acceleration' && <Rocket className="w-2.5 h-2.5" />}
                    {task.task_type === 'unlock' && <Unlock className="w-2.5 h-2.5" />}
                    {task.task_type}
                  </Badge>
                )}
                {task.revenue_type && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-0 rounded-full bg-primary/10 text-primary capitalize">
                    {task.revenue_type}
                  </Badge>
                )}
                {task.recurrence_pattern && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-0 rounded-full bg-primary/10 text-primary gap-1">
                    <RefreshCw className="w-2.5 h-2.5" /> {task.recurrence_pattern}
                  </Badge>
                )}
                {isSnoozed && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-0 rounded-full bg-amber-500/10 text-amber-600 gap-1">
                    <AlarmClock className="w-2.5 h-2.5" /> Snoozed until {format(parseISO(task.snoozed_until!), 'MMM d')}
                  </Badge>
                )}
                {task.priority_score != null && (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-0 rounded-full bg-muted text-muted-foreground">
                    Score: {task.priority_score}/100
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          {task.description && (
            <div>
              <p className="font-sans text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Description
              </p>
              <p className="font-sans text-sm leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Checklist */}
          <div className="bg-muted/30 border border-border/40 rounded-lg p-4">
            <p className="font-sans text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <ListChecks className="w-3 h-3" /> Checklist
              {checklistItems.length > 0 && (
                <span className={cn(
                  "text-[10px] ml-1",
                  completedChecklist === checklistItems.length ? "text-green-600" : "text-muted-foreground"
                )}>
                  ({completedChecklist}/{checklistItems.length})
                </span>
              )}
            </p>
            <div className="space-y-1.5">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group/item">
                  <Checkbox
                    checked={item.is_completed}
                    onCheckedChange={(checked) => !isReadOnly && toggleItem.mutate({ id: item.id, is_completed: checked as boolean })}
                    className="h-3.5 w-3.5"
                    disabled={isReadOnly}
                  />
                  <span className={cn(
                    "text-sm font-sans flex-1",
                    item.is_completed && "line-through text-muted-foreground"
                  )}>
                    {item.title}
                  </span>
                  {!isReadOnly && (
                    <button
                      onClick={() => deleteItem.mutate(item.id)}
                      className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!isReadOnly && (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Add item..."
                  className="h-7 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistItem.trim()}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-muted/30 border border-border/40 rounded-lg p-4">
            <p className="font-sans text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <StickyNote className="w-3 h-3" /> Notes
            </p>
            <Textarea
              value={localNotes}
              onChange={(e) => { setLocalNotes(e.target.value); setNotesDirty(true); }}
              placeholder={isReadOnly ? 'No notes' : 'Add notes...'}
              rows={3}
              disabled={isReadOnly}
              className="font-sans text-sm bg-background/50"
            />
            {notesDirty && !isReadOnly && (
              <div className="flex justify-end mt-2">
                <Button size={tokens.button.inline} variant="outline" onClick={handleSaveNotes} disabled={isNotesSaving} className="rounded-full">
                  {isNotesSaving ? 'Saving...' : 'Save Notes'}
                </Button>
              </div>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="bg-muted/20 border border-border/40 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="font-sans text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Created</p>
                <p className="font-sans font-medium">{format(parseISO(task.created_at), 'MMM d, yyyy')}</p>
              </div>
              <div className="space-y-1">
                <p className={cn("font-sans text-xs flex items-center gap-1", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                  <Calendar className="w-3 h-3" /> Due
                </p>
                <p className={cn("font-sans font-medium", isOverdue && "text-destructive")}>
                  {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-sans text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</p>
                <p className="font-sans font-medium">
                  {task.completed_at ? format(parseISO(task.completed_at), 'MMM d, yyyy') : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-sans text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Source</p>
                <p className="font-sans font-medium capitalize">{(task as any).source === 'ai_insights' ? 'AI Insights' : (task as any).source === 'recurring' ? 'Recurring' : 'Manual'}</p>
              </div>
              {task.estimated_revenue_impact_cents != null && task.estimated_revenue_impact_cents > 0 && (
                <div className="space-y-1">
                  <p className="font-sans text-xs text-emerald-600 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Revenue Impact</p>
                  <p className="font-sans font-medium text-emerald-600">
                    <BlurredAmount>{formatCurrency(task.estimated_revenue_impact_cents / 100)}</BlurredAmount>/mo
                  </p>
                </div>
              )}
              {task.execution_time_minutes != null && (
                <div className="space-y-1">
                  <p className="font-sans text-xs text-muted-foreground flex items-center gap-1"><Timer className="w-3 h-3" /> Est. Time</p>
                  <p className="font-sans font-medium">{task.execution_time_minutes} min</p>
                </div>
              )}
              {task.enforcement_level > 1 && (
                <div className="space-y-1">
                  <p className="font-sans text-xs text-amber-600 flex items-center gap-1"><Target className="w-3 h-3" /> Enforcement</p>
                  <p className="font-sans font-medium text-amber-600">Level {task.enforcement_level}</p>
                </div>
              )}
              {task.missed_revenue_cents != null && task.missed_revenue_cents > 0 && (
                <div className="space-y-1">
                  <p className="font-sans text-xs text-destructive flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Missed Revenue</p>
                  <p className="font-sans font-medium text-destructive">
                    <BlurredAmount>{formatCurrency(task.missed_revenue_cents / 100)}</BlurredAmount>/mo
                  </p>
                </div>
              )}
              {task.recurrence_pattern && (
                <div className="space-y-1">
                  <p className="font-sans text-xs text-muted-foreground flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Recurrence</p>
                  <p className="font-sans font-medium capitalize">{task.recurrence_pattern}</p>
                </div>
              )}
              {isSnoozed && (
                <div className="space-y-1">
                  <p className="font-sans text-xs text-amber-600 flex items-center gap-1"><AlarmClock className="w-3 h-3" /> Snoozed Until</p>
                  <p className="font-sans font-medium">{format(parseISO(task.snoozed_until!), 'MMM d, yyyy')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {!isReadOnly && (
          <div className="p-5 pt-4 border-t border-border/50 flex justify-center gap-3">
            <Button
              variant="outline"
              size={tokens.button.inline}
              className="gap-1.5 rounded-full px-4"
              onClick={() => { onOpenChange(false); onEdit(task); }}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size={tokens.button.inline}
              className="gap-1.5 rounded-full px-4 text-destructive hover:text-destructive"
              onClick={() => { onDelete(task.id); onOpenChange(false); }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
