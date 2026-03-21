import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  Paintbrush, 
  Type, 
  Layout,
  Sparkles,
  ChevronDown,
  ExternalLink,
  Target,
  TrendingUp,
  Users,
  Award,
  Loader2
} from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { ClientEngineWelcome } from './ClientEngineWelcome';
import { ProgramLogoEditor } from './ProgramLogoEditor';
import { ProgramConfig } from '@/hooks/useProgramConfig';
import { useProgramOutcomes, useUpdateProgramOutcome } from '@/hooks/useProgramOutcomes';
import { Link } from 'react-router-dom';

interface LayoutConfig {
  showHighlights: boolean;
  showRulesPreview: boolean;
  showTasksPreview: boolean;
  showWarningBanner: boolean;
}

interface WelcomePagePreviewProps {
  previewConfig?: ProgramConfig | null;
  onLogoChange?: (url: string | null) => void;
  onLogoSizeChange?: (size: number) => void;
  onLogoColorChange?: (color: string | null) => void;
  onEyebrowChange?: (eyebrow: string) => void;
  onHeadlineChange?: (headline: string) => void;
  onSubheadlineChange?: (subheadline: string) => void;
  onCtaTextChange?: (ctaText: string) => void;
}

export function WelcomePagePreview({ 
  previewConfig, 
  onLogoChange, 
  onLogoSizeChange, 
  onLogoColorChange,
  onEyebrowChange,
  onHeadlineChange,
  onSubheadlineChange,
  onCtaTextChange
}: WelcomePagePreviewProps) {
  const { data: outcomes = [], isLoading: outcomesLoading } = useProgramOutcomes();
  const updateOutcome = useUpdateProgramOutcome();
  const [editingOutcome, setEditingOutcome] = useState<string | null>(null);
  const [outcomeEdits, setOutcomeEdits] = useState<{ title: string; description: string }>({ title: '', description: '' });
  
  // Use values from previewConfig (database) or fallback to defaults
  const eyebrow = previewConfig?.welcome_eyebrow || '75-DAY TRANSFORMATION';
  const headline = previewConfig?.welcome_headline || 'BUILD YOUR CLIENT ENGINE';
  const subheadline = previewConfig?.welcome_subheadline || '75 days of focused execution. No shortcuts. No excuses. Transform your book and build a business that runs on autopilot.';
  const ctaText = previewConfig?.welcome_cta_text || "I'M READY — START DAY 1";

  // Local state for layout toggles (not persisted to DB)
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({
    showHighlights: true,
    showRulesPreview: true,
    showTasksPreview: true,
    showWarningBanner: true,
  });

  const handleEditOutcome = (outcome: { id: string; title: string; description: string }) => {
    setEditingOutcome(outcome.id);
    setOutcomeEdits({ title: outcome.title, description: outcome.description });
  };

  const handleSaveOutcome = () => {
    if (editingOutcome) {
      updateOutcome.mutate({ id: editingOutcome, updates: outcomeEdits });
      setEditingOutcome(null);
    }
  };

  const getOutcomeIcon = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'sparkles': <Sparkles className="w-4 h-4 text-primary" />,
      'trending-up': <TrendingUp className="w-4 h-4 text-primary" />,
      'users': <Users className="w-4 h-4 text-primary" />,
      'award': <Award className="w-4 h-4 text-primary" />,
    };
    return iconMap[iconName] || <Target className="w-4 h-4 text-primary" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Layout className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg tracking-wide">Welcome Page Editor</h2>
          <p className="text-sm text-muted-foreground">Customize the onboarding experience for new participants</p>
        </div>
      </div>

      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="edit" className="gap-2">
            <Paintbrush className="w-4 h-4" />
            Customize
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-6">
          <Card className="overflow-hidden border-2 border-dashed border-border/50">
            <div className="bg-muted/30 px-4 py-2 border-b flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                <Eye className="w-3 h-3 mr-1.5" />
                Live Preview
              </Badge>
              <span className="text-xs text-muted-foreground">
                This is what new participants will see
              </span>
            </div>
            <div className="bg-background">
              <ClientEngineWelcome 
                onStartProgram={() => {}} 
                isPreview 
                previewConfig={previewConfig} 
                contentOverrides={{
                  eyebrow: eyebrow,
                  headline: headline,
                  subheadline: subheadline,
                  ctaText: ctaText
                }}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="mt-6 space-y-6">
          {/* Program Logo Editor */}
          {onLogoChange && onLogoSizeChange && onLogoColorChange && (
            <ProgramLogoEditor
              currentLogoUrl={previewConfig?.logo_url || null}
              logoSize={previewConfig?.logo_size || 64}
              logoColor={previewConfig?.logo_color || null}
              onLogoChange={onLogoChange}
              onSizeChange={onLogoSizeChange}
              onColorChange={onLogoColorChange}
            />
          )}

          {/* Content Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Type className="w-4 h-4 text-primary" />
              <h3 className="font-display text-sm tracking-wide">CONTENT</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="eyebrow">Eyebrow Text</Label>
                <Input
                  id="eyebrow"
                  value={eyebrow}
                  onChange={(e) => onEyebrowChange?.(e.target.value)}
                  placeholder="75-DAY TRANSFORMATION"
                  className="font-display tracking-wider uppercase text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Short text that appears above the headline in a badge
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headline">Main Headline</Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={(e) => onHeadlineChange?.(e.target.value)}
                  placeholder="BUILD YOUR CLIENT ENGINE"
                  className="font-display tracking-wide"
                />
                <p className="text-xs text-muted-foreground">
                  Keep it punchy and action-oriented
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subheadline">Subheadline</Label>
                <Textarea
                  id="subheadline"
                  value={subheadline}
                  onChange={(e) => onSubheadlineChange?.(e.target.value)}
                  placeholder="75 days of focused execution..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta">Call to Action Button</Label>
                <Input
                  id="cta"
                  value={ctaText}
                  onChange={(e) => onCtaTextChange?.(e.target.value)}
                  placeholder="I'M READY — START DAY 1"
                  className="font-display tracking-wide"
                />
              </div>
            </div>
          </Card>

          {/* Layout Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Layout className="w-4 h-4 text-primary" />
              <h3 className="font-display text-sm tracking-wide">LAYOUT</h3>
            </div>

            <div className="space-y-2">
              {/* Highlights Grid */}
              <Collapsible>
                <div className="flex items-center justify-between py-3">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 text-left hover:text-primary transition-colors group">
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
                      <div>
                        <Label className="cursor-pointer">Show Highlights Grid</Label>
                        <p className="text-xs text-muted-foreground">Display the 4 program highlights</p>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <Switch
                    checked={layoutConfig.showHighlights}
                    onCheckedChange={(checked) => setLayoutConfig({ ...layoutConfig, showHighlights: checked })}
                  />
                </div>
                <CollapsibleContent className="pl-6 pb-3">
                  <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
                    <p className="mb-2">The highlights grid shows 4 key program features:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>75 Consecutive Days</li>
                      <li>Streak-Based System</li>
                      <li>Life Happens Passes</li>
                      <li>Weekly Wins</li>
                    </ul>
                    <p className="mt-3 text-xs italic">Highlight content is based on program settings.</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Tasks Preview */}
              <Collapsible>
                <div className="flex items-center justify-between py-3">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 text-left hover:text-primary transition-colors group">
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
                      <div>
                        <Label className="cursor-pointer">Show Tasks Preview</Label>
                        <p className="text-xs text-muted-foreground">Preview daily tasks in the commitment section</p>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <Switch
                    checked={layoutConfig.showTasksPreview}
                    onCheckedChange={(checked) => setLayoutConfig({ ...layoutConfig, showTasksPreview: checked })}
                  />
                </div>
                <CollapsibleContent className="pl-6 pb-3">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-3">Tasks shown are pulled from your program configuration.</p>
                    <Button variant="outline" size={tokens.button.card} asChild className="gap-2">
                      <Link to="/dashboard/admin/program-editor?tab=tasks">
                        <ExternalLink className="w-3 h-3" />
                        Edit Daily Tasks
                      </Link>
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Rules Preview */}
              <Collapsible>
                <div className="flex items-center justify-between py-3">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 text-left hover:text-primary transition-colors group">
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
                      <div>
                        <Label className="cursor-pointer">Show Rules Preview</Label>
                        <p className="text-xs text-muted-foreground">Preview program rules in the commitment section</p>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <Switch
                    checked={layoutConfig.showRulesPreview}
                    onCheckedChange={(checked) => setLayoutConfig({ ...layoutConfig, showRulesPreview: checked })}
                  />
                </div>
                <CollapsibleContent className="pl-6 pb-3">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-3">Rules shown are pulled from your program configuration.</p>
                    <Button variant="outline" size={tokens.button.card} asChild className="gap-2">
                      <Link to="/dashboard/admin/program-editor?tab=rules">
                        <ExternalLink className="w-3 h-3" />
                        Edit Program Rules
                      </Link>
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Warning Banner */}
              <Collapsible>
                <div className="flex items-center justify-between py-3">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 text-left hover:text-primary transition-colors group">
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
                      <div>
                        <Label className="cursor-pointer">Show Warning Banner</Label>
                        <p className="text-xs text-muted-foreground">Display the "Only begin when ready" warning</p>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <Switch
                    checked={layoutConfig.showWarningBanner}
                    onCheckedChange={(checked) => setLayoutConfig({ ...layoutConfig, showWarningBanner: checked })}
                  />
                </div>
                <CollapsibleContent className="pl-6 pb-3">
                  <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
                    <p className="mb-2">The warning banner displays:</p>
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs">
                      <p className="font-medium text-foreground mb-1">Only begin when you're ready</p>
                      <p>This program requires consecutive days of execution. Miss a day and you restart from Day 1.</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </Card>

          {/* Outcomes Editor */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="font-display text-sm tracking-wide">OUTCOMES</h3>
              <Badge variant="secondary" className="text-xs ml-auto">
                {outcomes.length} cards
              </Badge>
            </div>

            {outcomesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {outcomes.map((outcome) => (
                  <div
                    key={outcome.id}
                    className="bg-muted/30 rounded-lg p-4"
                  >
                    {editingOutcome === outcome.id ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            {getOutcomeIcon(outcome.icon)}
                          </div>
                          <Input
                            value={outcomeEdits.title}
                            onChange={(e) => setOutcomeEdits({ ...outcomeEdits, title: e.target.value })}
                            placeholder="Title"
                            className="font-medium"
                          />
                        </div>
                        <Textarea
                          value={outcomeEdits.description}
                          onChange={(e) => setOutcomeEdits({ ...outcomeEdits, description: e.target.value })}
                          placeholder="Description"
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size={tokens.button.card} onClick={handleSaveOutcome} disabled={updateOutcome.isPending}>
                            {updateOutcome.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                            Save
                          </Button>
                          <Button size={tokens.button.card} variant="outline" onClick={() => setEditingOutcome(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 -m-2 p-2 rounded-lg transition-colors"
                        onClick={() => handleEditOutcome(outcome)}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {getOutcomeIcon(outcome.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm mb-1">{outcome.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{outcome.description}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          Click to edit
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">Content is pulled dynamically</p>
                <p className="text-xs text-muted-foreground">
                  The tasks and rules shown in the preview are pulled from your program configuration. 
                  Edit them in the "Daily Tasks" and "Rules" tabs to update the welcome page.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
