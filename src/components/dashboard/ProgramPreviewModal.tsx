import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Eye, 
  Flame, 
  Target,
  ChevronDown,
  CheckCircle2,
  Calendar,
  Video,
  FileText,
  ClipboardList,
  Upload,
  ChevronRight
} from 'lucide-react';
import { useDailyTasks, useProgramRules } from '@/hooks/useProgramConfig';
import { tokens } from '@/lib/design-tokens';

interface ProgramPreviewModalProps {
  weeks?: Array<{
    week_number: number;
    title: string;
    objective: string | null;
    description: string | null;
    start_day: number;
    end_day: number;
    video_url: string | null;
    assignments: Array<{
      id: string;
      title: string;
      description: string | null;
      assignment_type: string;
      is_required: boolean;
    }>;
  }>;
}

export function ProgramPreviewModal({ weeks = [] }: ProgramPreviewModalProps) {
  const [open, setOpen] = useState(false);
  const [previewDay, setPreviewDay] = useState(1);
  const [weekExpanded, setWeekExpanded] = useState(true);
  const { tasks } = useDailyTasks();
  const { rules } = useProgramRules();

  // Find current week based on preview day
  const currentWeek = weeks.find(
    w => previewDay >= w.start_day && previewDay <= w.end_day
  ) || weeks[0];

  const progressPercent = (previewDay / 75) * 100;
  const streakCount = previewDay; // Simulated

  const getAssignmentIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'reading':
      case 'worksheet': return FileText;
      default: return ClipboardList;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={tokens.button.card}>
          <Eye className="w-4 h-4 mr-2" />
          Preview as Participant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Participant Preview
          </DialogTitle>
          <DialogDescription>
            See what participants experience at different stages
          </DialogDescription>
        </DialogHeader>

        {/* Day Selector */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg mb-4">
          <span className="text-sm font-medium">Preview Day:</span>
          <input
            type="range"
            min={1}
            max={75}
            value={previewDay}
            onChange={(e) => setPreviewDay(parseInt(e.target.value))}
            className="flex-1"
          />
          <Badge variant="secondary">Day {previewDay}</Badge>
        </div>

        {/* Preview Content */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <h2 className="font-display text-3xl">DAY {previewDay}</h2>
                <span className="text-sm text-muted-foreground">of 75</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>{streakCount} day streak</span>
              </div>
              <span className="px-2 py-1 bg-green-500/10 text-green-600 text-xs font-display tracking-wide">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Program Progress</span>
              <span className="text-sm font-medium">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </Card>

          {/* Current Week Module */}
          {currentWeek && (
            <Collapsible open={weekExpanded} onOpenChange={setWeekExpanded}>
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-foreground text-background rounded-lg flex flex-col items-center justify-center">
                          <span className="text-[10px] font-display tracking-wide opacity-70">WEEK</span>
                          <span className="text-lg font-display -mt-1">{currentWeek.week_number}</span>
                        </div>
                        <div>
                          <h3 className="font-display">{currentWeek.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            Days {currentWeek.start_day} - {currentWeek.end_day}
                          </div>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${weekExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-4 border-t pt-4">
                    {currentWeek.objective && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-primary mt-0.5" />
                          <div>
                            <p className="text-xs font-display tracking-wide text-muted-foreground mb-1">THIS WEEK'S OBJECTIVE</p>
                            <p className="text-sm">{currentWeek.objective}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentWeek.assignments && currentWeek.assignments.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-display tracking-wide text-muted-foreground">WEEKLY ASSIGNMENTS</h4>
                        {currentWeek.assignments.map((assignment, idx) => {
                          const AssignmentIcon = getAssignmentIcon(assignment.assignment_type);
                          const isComplete = idx < 2; // Simulate some completed

                          return (
                            <div
                              key={assignment.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border ${
                                isComplete ? 'bg-green-500/5 border-green-500/30' : 'bg-card border-border'
                              }`}
                            >
                              <div className={`w-5 h-5 border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isComplete ? 'bg-green-600 border-green-600' : 'border-border'
                              }`}>
                                {isComplete && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <AssignmentIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className={`text-sm ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
                                    {assignment.title}
                                  </span>
                                  {assignment.is_required && !isComplete && (
                                    <Badge variant="outline" className="text-[10px] h-4">Required</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Today's Tasks */}
          <Card className="p-4">
            <h3 className="font-display text-sm tracking-wide mb-4">TODAY'S TASKS</h3>
            <div className="space-y-3">
              {tasks.length > 0 ? (
                tasks.map((task, idx) => {
                  const isComplete = idx < 2; // Simulate
                  return (
                    <div key={task.id} className="flex items-center gap-3">
                      <div className={`w-5 h-5 border flex items-center justify-center ${
                        isComplete ? 'bg-foreground border-foreground' : 'border-border'
                      }`}>
                        {isComplete && <CheckCircle2 className="w-3 h-3 text-background" />}
                      </div>
                      <span className={`text-sm ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
                        {task.label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border bg-foreground border-foreground flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-background" />
                    </div>
                    <span className="text-sm line-through text-muted-foreground">Post content (reel, story, or carousel)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border border-border" />
                    <span className="text-sm">Respond to all DMs within 2 hours</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border border-border" />
                    <span className="text-sm">Follow up with 3 potential clients</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border border-border" />
                    <span className="text-sm">Log your daily metrics</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Proof of Work */}
          <Card className="p-4">
            <h3 className="font-display text-sm tracking-wide mb-4">PROOF OF WORK</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a screenshot or video of your content posted today.
            </p>
            <Button variant="outline" className="w-full" disabled>
              <Upload className="w-4 h-4 mr-2" />
              Upload Proof
            </Button>
          </Card>

          {/* Submit Button */}
          <Button className="w-full font-display tracking-wide py-6" disabled>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            SUBMIT DAY {previewDay} FOR COMPLETION
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
