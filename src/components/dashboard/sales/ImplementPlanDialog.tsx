import { useState, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import {
  Rocket,
  ListChecks,
  MessageSquare,
  Copy,
  Loader2,
  Check,
  Sparkles,
  ChevronDown,
  Hash,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';
import { ShareToDMDialog } from './ShareToDMDialog';
import { ShareToChannelDialog } from '@/components/dashboard/campaigns/ShareToChannelDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useCreateCampaign } from '@/hooks/useActionCampaigns';

interface ImplementPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planTitle: string;
  planContent: string;
  goalPeriod?: string;
  preSelectedSteps?: ActionStep[];
}

interface ActionStep {
  title: string;
  description: string;
  dueDays: number;
}

/** Normalize markdown content for easier parsing */
function normalizeContent(content: string): string {
  let normalized = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  normalized = normalized.replace(/[ \t]+/g, ' ');
  return normalized;
}

/** Deduplicate by title similarity */
function deduplicateSteps(steps: ActionStep[]): ActionStep[] {
  const seen = new Set<string>();
  return steps.filter((step) => {
    const key = step.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
    if (key.length < 3 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Extract structured action items from markdown content */
function extractActions(content: string): ActionStep[] {
  let steps: ActionStep[] = [];

  const actionsBlockMatch = content.match(/---ACTIONS---\s*([\s\S]*?)(?:---END---|$)/);
  if (actionsBlockMatch) {
    const rawBlock = actionsBlockMatch[1].replace(/---END---/g, '').trim();
    const lines = rawBlock.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const lineMatch = line.match(/^(?:\d+[.)]\s*)?(.+?):\s+(.+)$/);
      if (lineMatch) {
        steps.push({ title: lineMatch[1].trim(), description: lineMatch[2].trim(), dueDays: 0 });
      } else if (line.length > 5) {
        steps.push({ title: line.replace(/^[\d.)\-•]+\s*/, '').trim(), description: '', dueDays: 0 });
      }
    }
  }

  if (steps.length === 0) {
    const normalized = normalizeContent(content);
    let match: RegExpExecArray | null;

    const boldPattern = /\*\*([^*]{4,120})\*\*[:\s]*(.*)/g;
    while ((match = boldPattern.exec(normalized)) !== null) {
      const title = match[1].trim().replace(/^[\d.)\-•]+\s*/, '');
      const description = match[2].trim().replace(/\*+/g, '').slice(0, 200);
      const lower = title.toLowerCase();
      if (lower.includes('action step') || lower.includes('recovery plan') || lower === 'plan' || title.length < 5) continue;
      steps.push({ title, description, dueDays: 0 });
    }

    if (steps.length === 0) {
      const listPattern = /^[\s]*(?:\d+[.)]\s+|[-•]\s+)(.{5,150})/gm;
      while ((match = listPattern.exec(normalized)) !== null) {
        const raw = match[1].trim().replace(/\*+/g, '');
        const colonIdx = raw.indexOf(':');
        const title = colonIdx > 3 && colonIdx < 80 ? raw.slice(0, colonIdx).trim() : raw.slice(0, 80).trim();
        const description = colonIdx > 3 ? raw.slice(colonIdx + 1).trim() : '';
        steps.push({ title, description, dueDays: 0 });
      }
    }

    if (steps.length === 0) {
      const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const clean = line.replace(/^#+\s*/, '').replace(/\*+/g, '').trim();
        if (clean.length < 20 || clean.length > 200) continue;
        const lower = clean.toLowerCase();
        if (lower.startsWith('here') || lower.startsWith('plan') || lower.startsWith('summary') || lower.startsWith('note')) continue;
        steps.push({ title: clean.slice(0, 80), description: clean.length > 80 ? clean.slice(80) : '', dueDays: 0 });
      }
    }
  }

  const result = deduplicateSteps(steps).slice(0, 8);
  result.forEach((step, i) => {
    step.dueDays = i < 2 ? 2 : i < 4 ? 5 : 7;
  });

  return result;
}

export function ImplementPlanDialog({
  open,
  onOpenChange,
  planTitle,
  planContent,
  goalPeriod,
  preSelectedSteps,
}: ImplementPlanDialogProps) {
  const { user } = useAuth();
  const { formatDate } = useFormatDate();
  const createCampaign = useCreateCampaign();

  const [steps, setSteps] = useState<ActionStep[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [leadershipNote, setLeadershipNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);

  // Distribution options (post-creation)
  const [alsoCreateTasks, setAlsoCreateTasks] = useState(false);
  const [shareDM, setShareDM] = useState(false);
  const [shareChannel, setShareChannel] = useState(false);
  const [copyClipboard, setCopyClipboard] = useState(false);

  // DM sharing sub-dialog
  const [dmDialogOpen, setDmDialogOpen] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);

  // Execution state
  const [executing, setExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  // Step selection
  const [selectedSteps, setSelectedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (idx: number) => {
    setSelectedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const allSelected = steps.length > 0 && selectedSteps.size === steps.length;

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      const extracted = preSelectedSteps && preSelectedSteps.length > 0
        ? preSelectedSteps
        : extractActions(planContent);
      setSteps(extracted);
      setSelectedSteps(new Set(extracted.map((_, i) => i)));
      setCampaignName(planTitle || 'Recovery Campaign');
      setLeadershipNote('');
      setNoteOpen(false);
      setAlsoCreateTasks(false);
      setShareDM(false);
      setShareChannel(false);
      setCopyClipboard(false);
      setExecuted(false);
      setResults([]);
    }
    onOpenChange(isOpen);
  };

  useEffect(() => {
    if (executed) {
      const timer = setTimeout(() => handleOpenChange(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [executed]);

  const activeSteps = steps.filter((_, i) => selectedSteps.has(i));

  const formatPlanForClipboard = () => {
    let text = `📋 ${campaignName}\n`;
    if (goalPeriod) text += `Period: ${goalPeriod}\n`;
    text += '\n--- Action Steps ---\n\n';

    activeSteps.forEach((step, i) => {
      text += `${i + 1}. ${step.title}`;
      text += ` (due ${formatDate(addDays(new Date(), step.dueDays), 'MMM d')})`;
      text += '\n';
      if (step.description) text += `   ${step.description}\n`;
    });

    if (leadershipNote) {
      text += `\n--- Leadership Notes ---\n${leadershipNote}\n`;
    }

    return text;
  };

  const formatPlanForDM = () => {
    let md = `**📋 ${campaignName}**\n\n`;
    activeSteps.forEach((step, i) => {
      md += `**${i + 1}. ${step.title}**`;
      md += ` (due ${formatDate(addDays(new Date(), step.dueDays), 'MMM d')})`;
      md += '\n';
      if (step.description) md += `${step.description}\n`;
    });
    if (leadershipNote) {
      md += `\n---\n_Leadership Notes:_ ${leadershipNote}`;
    }
    return md;
  };

  const handleActivate = async () => {
    if (!user?.id || !campaignName.trim()) return;
    setExecuting(true);
    const actionResults: string[] = [];

    try {
      // 1. Create the campaign
      await createCampaign.mutateAsync({
        name: campaignName.trim(),
        description: planContent.replace(/---ACTIONS---[\s\S]*?(---END---|$)/g, '').trim().slice(0, 500),
        goal_period: goalPeriod,
        source_plan_type: 'recovery',
        leadership_note: leadershipNote || undefined,
        tasks: activeSteps.map((step, i) => ({
          title: step.title,
          description: step.description || undefined,
          priority: i === 0 ? 'high' : 'medium',
          due_date: addDays(new Date(), step.dueDays).toISOString(),
          sort_order: i,
        })),
      });
      actionResults.push('Campaign created');

      // 2. Also add to personal tasks if checked
      if (alsoCreateTasks) {
        const tasks = activeSteps
          .filter((s) => s.title.trim())
          .map((step) => ({
            user_id: user.id,
            title: step.title,
            description: `From campaign: ${campaignName}${step.description ? }`\n${step.description}` : ''}`,
            due_date: addDays(new Date(), step.dueDays).toISOString(),
            priority: 'high',
            source: 'ai_recovery_plan',
          }));

        if (tasks.length > 0) {
          const { error } = await supabase.from('tasks').insert(tasks);
          if (error) throw error;
          actionResults.push(`${tasks.length} personal tasks added`);
        }
      }

      // 3. Copy to clipboard
      if (copyClipboard) {
        await navigator.clipboard.writeText(formatPlanForClipboard());
        actionResults.push('Copied to clipboard');
      }

      // 4. Open DM dialog
      if (shareDM) {
        setDmDialogOpen(true);
        actionResults.push('DM sharing opened');
      }

      // 5. Open channel dialog
      if (shareChannel) {
        setChannelDialogOpen(true);
        actionResults.push('Channel sharing opened');
      }

      setResults(actionResults);
      setExecuted(true);

      if (actionResults.length > 0) {
        toast.success(`Campaign launched: ${actionResults.join(', }`);
      }
    } catch (err) {
      console.error('Execute plan error:', err);
      toast.error('Failed to create campaign');
    } finally {
      setExecuting(false);
    }
  };

  const hasValidSteps = activeSteps.some((s) => s.title.trim());

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-lg max-h-[85vh] flex flex-col"
          overlayClassName="backdrop-blur-sm bg-black/60"
        >
          {/* Header */}
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ZuraAvatar size="sm" />
              Create Campaign
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {executed
                ? 'Campaign launched!'
                : 'Name your campaign, review the actions, and launch it')}
            </p>
          </DialogHeader>

          {/* Content */}
          <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
            {executed ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-chart-2/10 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 text-chart-2" />
                </div>
                <div>
                  <p className="font-medium">Campaign Launched</p>
                  <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                    {results.map((r, i) => (
                      <p key={i}>✓ {r}</p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {/* Campaign name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Campaign Name</label>
                  <Input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Weekly Recovery Sprint"
                    className="text-sm"
                  />
                </div>

                {/* Selectable action steps */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      Action Steps
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSteps(
                          allSelected
                            ? new Set()
                            : new Set(steps.map((_, i) => i))
                        )
                      }
                      className="text-[11px] text-primary hover:underline"
                    >
                      {allSelected ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {steps.map((step, i) => {
                      const selected = selectedSteps.has(i);
                      return (
                        <label
                          key={i}
                          className={cn(
                            'flex gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors',
                            selected
                              ? 'border-border/40 bg-card/50'
                              : 'border-border/30 bg-muted/20 opacity-60'
                          )}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleStep(i)}
                            className="mt-0.5"
                          />
                          <span className="text-xs font-mono text-muted-foreground pt-0.5 w-5 shrink-0 text-right">
                            {i + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug">
                              {step.title}
                            </p>
                            {step.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {step.description}
                              </p>
                            )}
                            <p className="text-[11px] text-muted-foreground/60 mt-1">
                              Due {formatDate(addDays(new Date(), step.dueDays), 'MMM d')}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Leadership note - collapsible */}
                <Collapsible open={noteOpen} onOpenChange={setNoteOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronDown
                        className={cn(
                          'w-3 h-3 transition-transform',
                          noteOpen && 'rotate-180'
                        )}
                      />
                      {noteOpen ? 'Leadership note' : '+ Add leadership note'}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <Textarea
                      value={leadershipNote}
                      onChange={(e) => setLeadershipNote(e.target.value)}
                      placeholder="Add context for your team..."
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Distribution options */}
                <div className="space-y-2 pt-2 border-t border-border/30">
                  <p className="text-xs font-medium text-muted-foreground">
                    Also...
                  </p>

                  <label className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 hover:border-border/50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={alsoCreateTasks}
                      onCheckedChange={(v) => setAlsoCreateTasks(!!v)}
                    />
                    <ListChecks className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm">Add to my personal tasks</span>
                  </label>

                  <label className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 hover:border-border/50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={shareDM}
                      onCheckedChange={(v) => setShareDM(!!v)}
                    />
                    <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm">Share with team via DM</span>
                  </label>

                  <label className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 hover:border-border/50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={shareChannel}
                      onCheckedChange={(v) => setShareChannel(!!v)}
                    />
                    <Hash className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm">Post to a channel</span>
                  </label>

                  <label className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 hover:border-border/50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={copyClipboard}
                      onCheckedChange={(v) => setCopyClipboard(!!v)}
                    />
                    <Copy className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm">Copy formatted plan</span>
                  </label>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <DialogFooter className="shrink-0 gap-2 sm:gap-2">
            {executed ? null : (
              <>
                <Button
                  variant="ghost"
                  size={tokens.button.card}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  size={tokens.button.card}
                  onClick={handleActivate}
                  disabled={!hasValidSteps || !campaignName.trim() || executing}
                  className="gap-1.5"
                >
                  {executing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  Launch Campaign
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareToDMDialog
        open={dmDialogOpen}
        onOpenChange={setDmDialogOpen}
        planTitle={campaignName}
        planContent={formatPlanForDM()}
      />
      <ShareToChannelDialog
        open={channelDialogOpen}
        onOpenChange={setChannelDialogOpen}
        campaignName={campaignName}
        content={formatPlanForDM()}
      />
    </>
  );
}
