import { useState, useCallback } from 'react';
import { parseISO, startOfDay, differenceInCalendarDays, addDays, addWeeks, format } from 'date-fns';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2, Lock, Pencil, RefreshCw, AlarmClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { useFormatDate } from '@/hooks/useFormatDate';
import type { Task } from '@/hooks/useTasks';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit?: (task: Task) => void;
  onView?: (task: Task) => void;
  onSnooze?: (id: string, until: string) => void;
  isReadOnly?: boolean;
  isArchiveView?: boolean;
  checklistProgress?: { done: number; total: number } | null;
}

const priorityIndicator = {
  low: 'bg-muted-foreground',
  normal: 'bg-blue-500',
  high: 'bg-orange-500',
};

export function TaskItem({ task, onToggle, onDelete, onEdit, onView, onSnooze, isReadOnly = false, isArchiveView = false, checklistProgress }: TaskItemProps) {
  const { formatDate } = useFormatDate();
  const [isHovered, setIsHovered] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  const handleToggle = useCallback((id: string, completed: boolean) => {
    if (completed && !task.is_completed) {
      setIsCompleting(true);
      setTimeout(() => {
        onToggle(id, completed);
      }, 400);
    } else {
      onToggle(id, completed);
    }
  }, [onToggle, task.is_completed]);

  const today = startOfDay(new Date());
  const dueLocal = task.due_date ? startOfDay(parseISO(task.due_date)) : null;
  const isOverdue = !!dueLocal && !task.is_completed && dueLocal < today;
  const daysOverdue = isOverdue ? differenceInCalendarDays(today, dueLocal!) : 0;

  const handleSnooze = (until: Date) => {
    onSnooze?.(task.id, format(until, 'yyyy-MM-dd'));
    setSnoozeOpen(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 1, height: 'auto' }}
      animate={isCompleting ? { opacity: 0, height: 0, marginBottom: 0 } : { opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div
        className={cn(
          "flex items-start gap-3 group",
          isReadOnly && "opacity-75",
          isOverdue && !isArchiveView && "border-l-2 border-destructive pl-2",
          isArchiveView && "opacity-60"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Checkbox
                checked={task.is_completed}
                onCheckedChange={(checked) => !isReadOnly && handleToggle(task.id, checked as boolean)}
                className={cn("mt-0.5", isReadOnly && "cursor-not-allowed")}
                disabled={isReadOnly}
              />
            </div>
          </TooltipTrigger>
          {isReadOnly && (
            <TooltipContent side="top" className="text-xs">
              View-only mode
            </TooltipContent>
          )}
        </Tooltip>
        <div
          className={cn("flex-1 min-w-0", onView && "cursor-pointer")}
          onClick={() => onView?.(task)}
        >
          <div className="flex items-center gap-2">
            <div className={cn('w-1.5 h-1.5 rounded-full', priorityIndicator[task.priority])} />
            <span
              className={cn(
                'text-sm font-sans truncate',
                task.is_completed && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </span>
            {task.recurrence_pattern && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <RefreshCw className="w-3 h-3 text-muted-foreground shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs capitalize">
                  Repeats {task.recurrence_pattern}
                </TooltipContent>
              </Tooltip>
            )}
            {checklistProgress && checklistProgress.total > 0 && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded bg-muted shrink-0",
                checklistProgress.done === checklistProgress.total ? "text-green-600" : "text-muted-foreground"
              )}>
                {checklistProgress.done}/{checklistProgress.total}
              </span>
            )}
            {isReadOnly && (
              <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
          </div>
          {task.due_date && !isArchiveView && (() => {
            return (
              <p className={cn("text-xs mt-0.5 ml-3.5", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                {isOverdue ? `${daysOverdue}d overdue · ` : 'Due '}{formatDate(parseISO(task.due_date), 'MMM d')}
              </p>
            );
          })()}
          {isArchiveView && task.completed_at && (
            <p className="text-xs mt-0.5 ml-3.5 text-muted-foreground">
              Completed {formatDate(parseISO(task.completed_at), 'MMM d')}
            </p>
          )}
        </div>
        {isHovered && !isReadOnly && (
          <div className="flex items-center gap-0.5">
            {onSnooze && !task.is_completed && (isOverdue || (dueLocal && differenceInCalendarDays(dueLocal, today) <= 0)) && (
              <Popover open={snoozeOpen} onOpenChange={setSnoozeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  >
                    <AlarmClock className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="end">
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size={tokens.button.inline} className="justify-start text-xs h-7" onClick={() => handleSnooze(addDays(today, 1))}>
                      Tomorrow
                    </Button>
                    <Button variant="ghost" size={tokens.button.inline} className="justify-start text-xs h-7" onClick={() => handleSnooze(addWeeks(today, 1))}>
                      Next week
                    </Button>
                    <div className="border-t border-border/50 pt-1 mt-1">
                      <Calendar
                        mode="single"
                        selected={undefined}
                        onSelect={(d) => d && handleSnooze(d)}
                        disabled={(d) => d < today}
                        className="p-1 pointer-events-auto"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(task)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
