import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Task } from '@/hooks/useTasks';

interface EditTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: { title: string; description?: string | null; due_date?: string | null; priority: 'low' | 'normal' | 'high'; notes?: string | null; recurrence_pattern?: string | null; estimated_revenue_impact_cents?: number | null }) => void;
  isPending: boolean;
}

export function EditTaskDialog({ task, open, onOpenChange, onSave, isPending }: EditTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [recurrence, setRecurrence] = useState<string>('none');
  const [revenueImpact, setRevenueImpact] = useState<string>('');
  const [taskType, setTaskType] = useState<string>('none');
  const [executionTime, setExecutionTime] = useState<string>('');
  const [revenueType, setRevenueType] = useState<string>('none');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setNotes(task.notes || '');
      setDueDate(task.due_date ? parseISO(task.due_date) : new Date());
      setPriority(task.priority);
      setRecurrence(task.recurrence_pattern || 'none');
      setRevenueImpact(task.estimated_revenue_impact_cents ? String(task.estimated_revenue_impact_cents / 100) : '');
      setTaskType(task.task_type || 'none');
      setExecutionTime(task.execution_time_minutes ? String(task.execution_time_minutes) : '');
      setRevenueType(task.revenue_type || 'none');
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !task) return;

    const impactCents = revenueImpact ? Math.round(parseFloat(revenueImpact) * 100) : null;

    onSave(task.id, {
      title: title.trim(),
      description: description.trim() || null,
      notes: notes.trim() || null,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      priority,
      recurrence_pattern: recurrence === 'none' ? null : recurrence,
      estimated_revenue_impact_cents: impactCents && impactCents > 0 ? impactCents : null,
      task_type: taskType === 'none' ? null : taskType,
      execution_time_minutes: executionTime ? parseInt(executionTime) : null,
      revenue_type: revenueType === 'none' ? null : revenueType,
    } as any);

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (optional)</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(d) => d && setDueDate(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as 'low' | 'normal' | 'high')}>
                <SelectTrigger id="edit-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-recurrence">Repeat</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger id="edit-recurrence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-revenue-impact">Revenue Impact ($/mo)</Label>
              <Input
                id="edit-revenue-impact"
                type="number"
                min="0"
                step="1"
                value={revenueImpact}
                onChange={(e) => setRevenueImpact(e.target.value)}
                placeholder="e.g. 800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-exec-time">Time to Complete (min)</Label>
              <Input
                id="edit-exec-time"
                type="number"
                min="1"
                value={executionTime}
                onChange={(e) => setExecutionTime(e.target.value)}
                placeholder="e.g. 15"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-task-type">Task Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger id="edit-task-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="protection">Protection</SelectItem>
                  <SelectItem value="acceleration">Acceleration</SelectItem>
                  <SelectItem value="unlock">Unlock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-revenue-type">Revenue Type</Label>
              <Select value={revenueType} onValueChange={setRevenueType}>
                <SelectTrigger id="edit-revenue-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="protected">Protected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
