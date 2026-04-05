import { useState, useEffect } from 'react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
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
  Plus, 
  Pencil, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  Save,
  X,
  AlertTriangle,
  Eye,
  ChevronDown as ChevronDownIcon,
  Users,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
  FileDown,
  GraduationCap,
  Globe,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useStylistLevels, 
  useSaveStylistLevels,
} from '@/hooks/useStylistLevels';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { GraduationWizard } from '@/components/dashboard/settings/GraduationWizard';
import { useLevelPromotionCriteria, type LevelPromotionCriteria } from '@/hooks/useLevelPromotionCriteria';
import { useLevelRetentionCriteria, type LevelRetentionCriteria } from '@/hooks/useLevelRetentionCriteria';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { generateLevelRequirementsPDF } from '@/components/dashboard/settings/LevelRequirementsPDF';
import { TeamCommissionRoster } from '@/components/dashboard/settings/TeamCommissionRoster';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function formatCriteriaSummary(c: LevelPromotionCriteria): string {
  const parts: string[] = [];
  if (c.revenue_enabled && c.revenue_threshold > 0) parts.push(c.revenue_threshold >= 1000 ? `$${(c.revenue_threshold / 1000).toFixed(0)}K rev` : `$${c.revenue_threshold} rev`);
  if (c.retail_enabled && c.retail_pct_threshold > 0) parts.push(`${c.retail_pct_threshold}% retail`);
  if (c.rebooking_enabled && c.rebooking_pct_threshold > 0) parts.push(`${c.rebooking_pct_threshold}% rebook`);
  if (c.avg_ticket_enabled && c.avg_ticket_threshold > 0) parts.push(`$${c.avg_ticket_threshold} avg`);
  if (c.tenure_enabled && c.tenure_days > 0) parts.push(`${c.tenure_days}d tenure`);
  if (parts.length === 0) return '';
  return parts.join(' · ') + ` — ${c.evaluation_window_days}d window`;
}

function formatRetentionSummary(r: LevelRetentionCriteria): string {
  const parts: string[] = [];
  if (r.revenue_enabled && r.revenue_minimum > 0) parts.push(r.revenue_minimum >= 1000 ? `$${(r.revenue_minimum / 1000).toFixed(0)}K rev` : `$${r.revenue_minimum} rev`);
  if (r.retail_enabled && r.retail_pct_minimum > 0) parts.push(`${r.retail_pct_minimum}% retail`);
  if (r.rebooking_enabled && r.rebooking_pct_minimum > 0) parts.push(`${r.rebooking_pct_minimum}% rebook`);
  if (r.avg_ticket_enabled && r.avg_ticket_minimum > 0) parts.push(`$${r.avg_ticket_minimum} avg`);
  if (parts.length === 0) return '';
  return `Required to Stay: ${parts.join(' · ')} — ${r.grace_period_days}d grace · ${r.action_type === 'demotion_eligible' ? 'Demotion' : 'Coaching'}`;
}

const formatRate = (rate: number | null | undefined): string => {
  if (rate == null) return '';
  return String(Math.round(rate * 100));
};

type LocalStylistLevel = {
  id: string;
  dbId?: string;
  slug: string;
  label: string;
  clientLabel: string;
  description: string;
  serviceCommissionRate: string;
  retailCommissionRate: string;
};

interface StylistLevelsEditorProps {
  /** When true, omits page header, sticky behavior, and info notice (used inside Settings) */
  embedded?: boolean;
}

export function StylistLevelsEditor({ embedded = false }: StylistLevelsEditorProps) {
  const { dashPath } = useOrgDashboardPath();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: dbLevels, isLoading, error, refetch } = useStylistLevels();
  const saveLevels = useSaveStylistLevels();
  
  const [levels, setLevels] = useState<LocalStylistLevel[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newLevelName, setNewLevelName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewLevel, setPreviewLevel] = useState(0);
  const [wizardLevelId, setWizardLevelId] = useState<string | null>(null);
  const [wizardLevelLabel, setWizardLevelLabel] = useState('');
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<number | null>(null);
  const [reassignToSlug, setReassignToSlug] = useState<string>('');
  const [wizardLevelIndex, setWizardLevelIndex] = useState(0);

  const { data: promotionCriteria } = useLevelPromotionCriteria();
  const { data: retentionCriteria } = useLevelRetentionCriteria();

  useEffect(() => {
    if (dbLevels && !hasChanges) {
      const localLevels: LocalStylistLevel[] = dbLevels.map((l) => ({
        id: l.slug,
        dbId: l.id,
        slug: l.slug,
        label: l.label,
        clientLabel: l.client_label,
        description: l.description || '',
        serviceCommissionRate: formatRate(l.service_commission_rate),
        retailCommissionRate: formatRate(l.retail_commission_rate),
      }));
      setLevels(localLevels);
    }
  }, [dbLevels, hasChanges]);

  useEffect(() => {
    if (hasChanges) {
      toast.warning('You have unsaved changes', {
        id: 'unsaved-changes',
        duration: 4000,
      });
    }
  }, [hasChanges]);

  const { data: stylistsByLevel } = useQuery({
    queryKey: ['stylists-by-level'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('stylist_level')
        .not('stylist_level', 'is', null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(profile => {
        if (profile.stylist_level) {
          counts[profile.stylist_level] = (counts[profile.stylist_level] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const getStylistCount = (levelId: string): number => {
    return stylistsByLevel?.[levelId] || 0;
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newLevels = [...levels];
    [newLevels[index - 1], newLevels[index]] = [newLevels[index], newLevels[index - 1]];
    const updatedLevels = newLevels.map((level, idx) => ({
      ...level,
      clientLabel: `Level ${idx + 1}`,
    }));
    setLevels(updatedLevels);
    setHasChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === levels.length - 1) return;
    const newLevels = [...levels];
    [newLevels[index], newLevels[index + 1]] = [newLevels[index + 1], newLevels[index]];
    const updatedLevels = newLevels.map((level, idx) => ({
      ...level,
      clientLabel: `Level ${idx + 1}`,
    }));
    setLevels(updatedLevels);
    setHasChanges(true);
  };

  const handleRename = (index: number, newLabel: string) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], label: newLabel };
    setLevels(newLevels);
    setHasChanges(true);
  };

  const handleDescriptionChange = (index: number, newDescription: string) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], description: newDescription };
    setLevels(newLevels);
    setHasChanges(true);
  };

  const handleDelete = (index: number) => {
    const newLevels = levels.filter((_, idx) => idx !== index);
    const updatedLevels = newLevels.map((level, idx) => ({
      ...level,
      clientLabel: `Level ${idx + 1}`,
    }));
    setLevels(updatedLevels);
    setHasChanges(true);
  };

  const handleCommissionChange = (index: number, field: 'serviceCommissionRate' | 'retailCommissionRate', value: string) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], [field]: value };
    setLevels(newLevels);
    setHasChanges(true);
  };

  const handleAddNew = () => {
    if (!newLevelName.trim()) return;
    let newSlug = newLevelName.toLowerCase().replace(/\s+/g, '-');
    const existingSlugs = new Set(levels.map(l => l.slug));
    if (existingSlugs.has(newSlug)) {
      let counter = 2;
      while (existingSlugs.has(`${newSlug}-${counter}`)) counter++;
      newSlug = `${newSlug}-${counter}`;
    }
    const newLevel: LocalStylistLevel = {
      id: newSlug,
      slug: newSlug,
      label: newLevelName.trim(),
      clientLabel: `Level ${levels.length + 1}`,
      description: '',
      serviceCommissionRate: '',
      retailCommissionRate: '',
    };
    setLevels([...levels, newLevel]);
    setNewLevelName('');
    setIsAddingNew(false);
    setHasChanges(true);
  };

  const handleDeleteWithReassign = async (index: number) => {
    const level = levels[index];
    const count = getStylistCount(level.id);
    if (count > 0 && reassignToSlug) {
      const { error } = await supabase
        .from('employee_profiles')
        .update({ stylist_level: reassignToSlug })
        .eq('stylist_level', level.id);
      if (error) {
        toast.error('Failed to reassign stylists: ' + error.message);
        return;
      }
    }
    handleDelete(index);
    setDeleteTargetIndex(null);
    setReassignToSlug('');
  };

  const handleSave = async () => {
    const levelsToSave = levels.map((level, idx) => ({
      id: level.dbId,
      slug: level.slug,
      label: level.label,
      client_label: `Level ${idx + 1}`,
      description: level.description || undefined,
      display_order: idx,
      service_commission_rate: level.serviceCommissionRate ? parseFloat(level.serviceCommissionRate) / 100 : null,
      retail_commission_rate: level.retailCommissionRate ? parseFloat(level.retailCommissionRate) / 100 : null,
    }));
    saveLevels.mutate(levelsToSave, {
      onSuccess: () => {
        setHasChanges(false);
        toast.success('Stylist levels saved successfully');
      },
    });
  };

  const handleDiscard = () => {
    setHasChanges(false);
  };

  if (isLoading) {
    return <DashboardLoader className="min-h-[400px]" />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">Failed to load stylist levels</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const actionButtons = (
    <div className="flex items-center gap-2">
      {promotionCriteria && promotionCriteria.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            const levelInfos = levels.map((l, i) => ({
              label: l.label,
              slug: l.slug,
              dbId: l.dbId,
              index: i,
            }));
            const doc = generateLevelRequirementsPDF({
              orgName: effectiveOrganization?.name || 'Organization',
              levels: levelInfos,
              criteria: promotionCriteria,
              retentionCriteria: retentionCriteria || [],
            });
            doc.save('level-progression-roadmap.pdf');
            toast.success('Progression roadmap exported');
          }}
        >
          <FileDown className="w-4 h-4" />
          Export Roadmap
        </Button>
      )}
      {hasChanges && (
        <>
          <Button variant="ghost" onClick={handleDiscard}>
            Discard
          </Button>
          <Button className="gap-2" onClick={handleSave} disabled={saveLevels.isPending}>
            {saveLevels.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className={cn("space-y-8", !embedded && "p-6 max-w-4xl mx-auto")}>
        {/* Header */}
        {!embedded ? (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-6 px-6 py-4 -mt-6 mb-2 border-b border-transparent transition-all duration-200">
            <DashboardPageHeader
              title="Stylist Levels"
              description="Manage experience levels and pricing tiers"
              actions={actionButtons}
            />
            <PageExplainer pageId="stylist-levels" />
          </div>
        ) : (
          /* In embedded mode, just show save/export actions inline */
          <div className="flex justify-end">{actionButtons}</div>
        )}

        {/* Info Notice - standalone only */}
        {!embedded && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Level-based service pricing is displayed on the client-facing website{' '}
              <a href="/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                your website
              </a>
              . To adjust or edit level pricing, you can do so in the{' '}
              <a href={dashPath('/admin/services')} className="text-primary hover:underline">
                Services editor
              </a>
              .
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Levels List */}
          <div className="lg:col-span-3 space-y-0">
            {levels.map((level, index) => {
              const stylistCount = getStylistCount(level.id);
              const hasStylists = stylistCount > 0;
              const isLast = index === levels.length - 1;
              
              return (
                <div key={level.id} className="relative">
                  {/* Connector line between cards */}
                  {!isLast && (
                    <div className="absolute left-[2.35rem] top-full w-px h-2 bg-border z-10" />
                  )}
                  <div
                    className={cn(
                      "group rounded-xl bg-muted/50 border transition-all duration-200 hover:shadow-sm mb-2",
                      editingIndex === index && "ring-2 ring-primary/50 shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-4 px-4 py-3">
                      {/* Reorder buttons */}
                      <div className="flex flex-col opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-0.5 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                          disabled={index === 0}
                          onClick={() => handleMoveUp(index)}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          className="p-0.5 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                          disabled={index === levels.length - 1}
                          onClick={() => handleMoveDown(index)}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Level number — neutral badge */}
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        Level {index + 1}
                      </span>

                      {/* Entry Level badge */}
                      {index === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                          Entry Level
                        </span>
                      )}

                      {/* Level name */}
                      {editingIndex === index ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={level.label}
                            onChange={(e) => handleRename(index, e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setEditingIndex(null);
                              if (e.key === 'Escape') setEditingIndex(null);
                            }}
                          />
                          <Button
                            variant="ghost"
                            size={tokens.button.inline}
                            className="h-8 px-2"
                            onClick={() => setEditingIndex(null)}
                          >
                            Done
                          </Button>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-medium truncate">{level.label}</span>
                            {hasStylists && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                {stylistCount} stylist{stylistCount !== 1 ? 's' : ''}
                              </span>
                            )}
                            {/* Commission rate pills */}
                            {(level.serviceCommissionRate || level.retailCommissionRate) && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {level.serviceCommissionRate && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                                    Svc {level.serviceCommissionRate}%
                                  </span>
                                )}
                                {level.retailCommissionRate && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                                    Retail {level.retailCommissionRate}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-2 rounded-md hover:bg-muted transition-colors"
                              onClick={() => setEditingIndex(index)}
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <AlertDialog onOpenChange={(open) => { if (!open) { setDeleteTargetIndex(null); setReassignToSlug(''); } }}>
                              <AlertDialogTrigger asChild>
                                <button
                                  className="p-2 rounded-md hover:bg-destructive/10 transition-colors disabled:opacity-30"
                                  disabled={levels.length <= 1}
                                  onClick={() => setDeleteTargetIndex(index)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    {hasStylists && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                                    Delete "{level.label}"?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription asChild>
                                    <div className="space-y-3">
                                      {hasStylists ? (
                                        <>
                                          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200">
                                            <p className="font-medium flex items-center gap-2">
                                              <AlertTriangle className="w-4 h-4" />
                                              {stylistCount} stylist{stylistCount !== 1 ? 's are' : ' is'} assigned to this level
                                            </p>
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-sm font-medium">Reassign stylists to:</label>
                                            <Select value={reassignToSlug} onValueChange={setReassignToSlug}>
                                              <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a level..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {levels.filter((_, i) => i !== index).map((l) => (
                                                  <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </>
                                      ) : (
                                        <p>No stylists are currently assigned to this level.</p>
                                      )}
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={hasStylists && !reassignToSlug}
                                    onClick={() => handleDeleteWithReassign(index)}
                                  >
                                    {hasStylists ? 'Reassign & Delete' : 'Delete'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Description + Commission + Criteria */}
                    <div className="px-4 pb-3 pt-0">
                      <div className="flex items-start gap-2 pl-14">
                        <Input
                          value={level.description}
                          onChange={(e) => handleDescriptionChange(index, e.target.value)}
                          placeholder="Brief description for tooltip..."
                          className="h-7 text-xs text-muted-foreground bg-background border focus-visible:ring-1"
                        />
                      </div>
                      {editingIndex === index && (
                        <div className="pl-14 mt-2 grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Service Commission %</label>
                            <Input
                              type="number"
                              placeholder="e.g. 40"
                              value={level.serviceCommissionRate}
                              onChange={(e) => handleCommissionChange(index, 'serviceCommissionRate', e.target.value)}
                              className="h-7 text-xs"
                              min={0}
                              max={100}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Retail Commission %</label>
                            <Input
                              type="number"
                              placeholder="e.g. 10"
                              value={level.retailCommissionRate}
                              onChange={(e) => handleCommissionChange(index, 'retailCommissionRate', e.target.value)}
                              className="h-7 text-xs"
                              min={0}
                              max={100}
                            />
                          </div>
                        </div>
                      )}
                      {index > 0 && level.dbId && (
                        <div className="pl-14 mt-2">
                          <button
                            onClick={() => {
                              setWizardLevelId(level.dbId!);
                              setWizardLevelLabel(level.label);
                              setWizardLevelIndex(index);
                            }}
                            className={cn(
                              "flex items-center gap-1.5 text-xs transition-colors rounded-full px-2.5 py-1",
                              promotionCriteria?.some(c => c.stylist_level_id === level.dbId && c.is_active)
                                ? "text-primary bg-primary/5 hover:bg-primary/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                          >
                            <Sparkles className="w-3 h-3" />
                            {promotionCriteria?.some(c => c.stylist_level_id === level.dbId && c.is_active)
                              ? 'Criteria Configured'
                              : 'Configure Criteria'}
                          </button>
                          {(() => {
                            const c = promotionCriteria?.find(cr => cr.stylist_level_id === level.dbId && cr.is_active);
                            const summary = c ? formatCriteriaSummary(c) : '';
                            return summary ? (
                              <p className="text-[10px] text-muted-foreground/70 mt-1 pl-4">{summary}</p>
                            ) : null;
                          })()}
                          {(() => {
                            const r = retentionCriteria?.find(rc => rc.stylist_level_id === level.dbId && rc.is_active);
                            const retSummary = r ? formatRetentionSummary(r) : '';
                            return retSummary ? (
                              <p className="text-[10px] text-muted-foreground/70 mt-0.5 pl-4">{retSummary}</p>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add new level */}
            {isAddingNew ? (
              <div className="flex items-center gap-4 px-4 py-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
                <div className="w-8" />
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                  {levels.length + 1}
                </span>
                <Input
                  value={newLevelName}
                  onChange={(e) => setNewLevelName(e.target.value)}
                  placeholder="Enter level name..."
                  className="h-8 text-sm flex-1 border bg-background rounded-md px-3 ml-2"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNew();
                    if (e.key === 'Escape') {
                      setIsAddingNew(false);
                      setNewLevelName('');
                    }
                  }}
                />
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size={tokens.button.inline}
                    className="h-8"
                    onClick={handleAddNew}
                    disabled={!newLevelName.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size={tokens.button.inline}
                    className="h-8 px-2"
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewLevelName('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                onClick={() => setIsAddingNew(true)}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Level</span>
              </button>
            )}
          </div>

          {/* Right Column - Preview & Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Team Distribution (most actionable — top) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>Team Distribution</span>
              </div>
              <div className="bg-card border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-sm text-muted-foreground">Total Assigned</span>
                  <span className="text-lg font-medium">
                    {Object.values(stylistsByLevel || {}).reduce((a, b) => a + b, 0)}
                  </span>
                </div>
                <div className="space-y-2">
                  {levels.map((level, idx) => {
                    const count = getStylistCount(level.id);
                    const totalAssigned = Object.values(stylistsByLevel || {}).reduce((a, b) => a + b, 0);
                    const percentage = totalAssigned > 0 ? (count / totalAssigned) * 100 : 0;
                    return (
                      <div key={level.id} className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs truncate">{level.label}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{count}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary/60 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {Object.values(stylistsByLevel || {}).reduce((a, b) => a + b, 0) === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No stylists assigned to levels yet
                  </p>
                )}
              </div>
            </div>

            {/* 2. Progression Roadmap (only when criteria exist) */}
            {promotionCriteria && promotionCriteria.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GraduationCap className="w-4 h-4" />
                  <span>Progression Roadmap</span>
                </div>
                <div className="bg-card border rounded-xl p-4 space-y-3">
                  {levels.map((level, idx) => {
                    const criteria = promotionCriteria?.find(c => c.stylist_level_id === level.dbId && c.is_active);
                    const summary = criteria ? formatCriteriaSummary(criteria) : null;
                    const retention = retentionCriteria?.find(r => r.stylist_level_id === level.dbId && r.is_active);
                    const retSummary = retention ? formatRetentionSummary(retention) : null;
                    return (
                      <div key={level.id} className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{level.label}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {idx === 0 ? 'Entry level' : summary || 'No criteria configured'}
                          </p>
                          {retSummary && (
                            <p className="text-[10px] text-muted-foreground/70">{retSummary}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Website Previews section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground tracking-wide uppercase">
                <Globe className="w-3.5 h-3.5" />
                <span>Website Previews</span>
              </div>

              {/* Card Preview */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>Card Preview</span>
                </div>
                <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-gradient-to-b from-neutral-600 to-neutral-800">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-[10px] tracking-[0.2em] text-white/70">
                        LEVEL {previewLevel + 1} STYLIST
                      </p>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="text-white/50 hover:text-white/90 transition-colors">
                              <Info className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[240px] p-3">
                            <p className="font-medium text-xs mb-1.5">Stylist Level System</p>
                            <ul className="text-[10px] space-y-1 text-muted-foreground">
                              {levels.map((level, idx) => (
                                <li key={level.id}>
                                  <span className="font-medium text-foreground">Level {idx + 1}:</span>{' '}
                                  {level.description}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <h3 className="font-display text-lg">Stylist Name</h3>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {levels.map((level, idx) => (
                    <button
                      key={level.id}
                      onClick={() => setPreviewLevel(idx)}
                      className={cn(
                        "px-2 py-1 rounded text-[10px] transition-colors",
                        previewLevel === idx 
                          ? "bg-foreground text-background" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Services Dropdown */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>Services Dropdown</span>
                </div>
                <div className="bg-foreground rounded-xl p-4 space-y-3">
                  <button
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-background/30 rounded-full text-xs font-sans bg-background/10 text-background"
                  >
                    <span className="text-background/70">Level:</span>
                    <span className="font-medium truncate">
                      {levels[previewLevel]?.label || 'New Talent'}
                    </span>
                    <ChevronDownIcon size={14} className="text-background/70 shrink-0" />
                  </button>
                  <div className="bg-card rounded-lg border shadow-lg overflow-hidden max-h-32 overflow-y-auto">
                    {levels.map((level, idx) => (
                      <button
                        key={level.id}
                        onClick={() => setPreviewLevel(idx)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-xs font-sans transition-colors",
                          previewLevel === idx 
                            ? "bg-foreground text-background" 
                            : "hover:bg-secondary text-foreground"
                        )}
                      >
                        Level {idx + 1} — {level.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tooltip Preview */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <span>Tooltip Preview</span>
                </div>
                <div className="bg-card border rounded-xl p-4 space-y-3">
                  <p className="font-medium text-sm">Stylist Level System</p>
                  <ul className="text-xs space-y-1.5 text-muted-foreground">
                    {levels.map((level, idx) => (
                      <li key={level.id}>
                        <span className="font-medium text-foreground">Level {idx + 1}:</span>{' '}
                        {level.description || 'No description'}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground/70 pt-1 border-t">
                    Higher levels reflect experience, training, and demand.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Commission Roster */}
        {effectiveOrganization?.id && dbLevels && dbLevels.length > 0 && (
          <TeamCommissionRoster orgId={effectiveOrganization.id} levels={dbLevels} />
        )}
      </div>

      {/* Graduation Wizard Dialog */}
      <GraduationWizard
        open={!!wizardLevelId}
        onOpenChange={(open) => { if (!open) setWizardLevelId(null); }}
        levelId={wizardLevelId || ''}
        levelLabel={wizardLevelLabel}
        levelIndex={wizardLevelIndex}
      />
    </>
  );
}
