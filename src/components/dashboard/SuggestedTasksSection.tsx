import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Plus, Check, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';
import type { SuggestedTask } from '@/hooks/useAIInsights';

const priorityBadge: Record<string, string> = {
  high: 'bg-red-500/10 text-red-600 dark:text-red-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

interface SuggestedTasksSectionProps {
  tasks: SuggestedTask[];
  onAddTask: (task: { title: string; priority: 'low' | 'normal' | 'high'; due_date?: string; source: string }) => void;
}

export function SuggestedTasksSection({ tasks, onAddTask }: SuggestedTasksSectionProps) {
  const [addedTasks, setAddedTasks] = useState<Set<string>>(new Set());

  if (!tasks || tasks.length === 0) return null;

  const handleAdd = (task: SuggestedTask) => {
    const priorityMap: Record<string, 'low' | 'normal' | 'high'> = {
      low: 'low',
      medium: 'normal',
      high: 'high',
    };
    
    const dueDate = task.dueInDays
      ? format(addDays(new Date(), task.dueInDays), 'yyyy-MM-dd')
      : undefined;

    onAddTask({
      title: task.title,
      priority: priorityMap[task.priority] || 'normal',
      due_date: dueDate,
      source: 'ai_insights',
    });

    setAddedTasks(prev => new Set(prev).add(task.title));
    toast.success('Task added to your list');
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <ListChecks className="w-3.5 h-3.5 text-violet-500" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">AI SUGGESTED TASKS</span>
      </div>
      <div className="space-y-1.5">
        {tasks.map((task, i) => {
          const isAdded = addedTasks.has(task.title);
          return (
            <div
              key={i}
              className={cn(
                'flex items-start gap-2.5 py-1.5 transition-opacity',
                isAdded && 'opacity-50'
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isAdded ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <div className="w-4 h-4 rounded border border-border" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm leading-snug', isAdded && 'line-through text-muted-foreground')}>
                  {task.title}
                </p>
                {task.dueInDays && !isAdded && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    Due in {task.dueInDays} day{task.dueInDays !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <span className={cn(
                'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-display flex-shrink-0',
                priorityBadge[task.priority],
              )}>
                {task.priority}
              </span>
              {!isAdded && (
                <Button
                  variant="outline"
                  size={tokens.button.inline}
                  className="h-7 px-3 text-[11px] font-medium flex-shrink-0 gap-1"
                  onClick={() => handleAdd(task)}
                >
                  <Plus className="w-3 h-3" />
                  Add to My Tasks
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
