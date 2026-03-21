import { useState } from 'react';
import { Trash2, ChevronUp, ChevronDown, GripVertical, User, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { TeamMember } from '@/hooks/team-chat/useTeamMembers';

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  ownerId?: string;
  ownerName?: string;
  dueDays: number | null;
  notes: string;
}

interface PlanStepEditorProps {
  step: PlanStep;
  index: number;
  total: number;
  members: TeamMember[];
  onUpdate: (step: PlanStep) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function PlanStepEditor({
  step,
  index,
  total,
  members,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: PlanStepEditorProps) {
  const [expanded, setExpanded] = useState(false);

  const handleOwnerChange = (userId: string) => {
    const member = members.find((m) => m.userId === userId);
    onUpdate({
      ...step,
      ownerId: userId === 'unassigned' ? undefined : userId,
      ownerName: member ? (member.displayName || member.fullName || undefined) : undefined,
    });
  };

  return (
    <div className="group border border-border/40 rounded-lg p-3 bg-card/50 hover:border-border/60 transition-colors">
      {/* Header row */}
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onMoveUp}
            disabled={index === 0}
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onMoveDown}
            disabled={index === total - 1}
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">
              {index + 1}.
            </span>
            <Input
              value={step.title}
              onChange={(e) => onUpdate({ ...step, title: e.target.value })}
              className="h-8 text-sm font-medium"
              placeholder="Step title..."
            />
          </div>

          {/* Quick controls row */}
          <div className="flex items-center gap-2 pl-7">
            {/* Owner picker */}
            <Select
              value={step.ownerId || 'unassigned'}
              onValueChange={handleOwnerChange}
            >
              <SelectTrigger className="h-7 w-[160px] text-xs">
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <SelectValue placeholder="Assign owner" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={m.photoUrl || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {(m.displayName || m.fullName || '?')[0]}
                        </AvatarFallback>
                      </Avatar>
                      {m.displayName || m.fullName || 'Unknown'}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Due date quick-pick */}
            <Select
              value={step.dueDays?.toString() || 'none'}
              onValueChange={(v) =>
                onUpdate({ ...step, dueDays: v === 'none' ? null : parseInt(v) })
              }
            >
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3 h-3 text-muted-foreground" />
                  <SelectValue placeholder="Due date" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No due date</SelectItem>
                <SelectItem value="1">Tomorrow</SelectItem>
                <SelectItem value="2">2 days</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="5">5 days</SelectItem>
                <SelectItem value="7">1 week</SelectItem>
                <SelectItem value="14">2 weeks</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive ml-auto"
              onClick={onRemove}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Expandable notes */}
          {expanded ? (
            <div className="pl-7">
              <Textarea
                value={step.notes}
                onChange={(e) => onUpdate({ ...step, notes: e.target.value })}
                placeholder="Add notes or context for this step..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          ) : step.description ? (
            <p
              className="text-xs text-muted-foreground pl-7 cursor-pointer hover:text-foreground transition-colors line-clamp-1"
              onClick={() => setExpanded(true)}
            >
              {step.description}
            </p>
          ) : (
            <button
              className="text-xs text-muted-foreground/60 pl-7 hover:text-muted-foreground transition-colors"
              onClick={() => setExpanded(true)}
            >
              + Add notes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
