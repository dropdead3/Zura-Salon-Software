import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { getLevelColor } from '@/lib/level-colors';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Palette,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useStylistLevels, 
  useSaveStylistLevels,
  StylistLevel 
} from '@/hooks/useStylistLevels';

type LocalStylistLevel = {
  id: string;
  dbId?: string;
  slug: string;
  label: string;
  clientLabel: string;
  description: string;
};


export default function StylistLevels() {
  const { data: dbLevels, isLoading, error, refetch } = useStylistLevels();
  const saveLevels = useSaveStylistLevels();
  
  const [levels, setLevels] = useState<LocalStylistLevel[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newLevelName, setNewLevelName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewLevel, setPreviewLevel] = useState(0);

  // Sync local state with database when data changes
  useEffect(() => {
    if (dbLevels && !hasChanges) {
      const localLevels: LocalStylistLevel[] = dbLevels.map((l) => ({
        id: l.slug,
        dbId: l.id,
        slug: l.slug,
        label: l.label,
        clientLabel: l.client_label,
        description: l.description || '',
      }));
      setLevels(localLevels);
    }
  }, [dbLevels, hasChanges]);

  // Show toast when changes are made
  useEffect(() => {
    if (hasChanges) {
      toast.warning('You have unsaved changes', {
        id: 'unsaved-changes',
        duration: 4000,
      });
    }
  }, [hasChanges]);

  // Note: Realtime subscription is handled by useStylistLevels hook

  // Fetch stylists with their levels to show counts
  const { data: stylistsByLevel } = useQuery({
    queryKey: ['stylists-by-level'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('stylist_level')
        .not('stylist_level', 'is', null);
      
      if (error) throw error;
      
      // Count stylists per level
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
    newLevels[index] = {
      ...newLevels[index],
      label: newLabel,
    };
    setLevels(newLevels);
    setHasChanges(true);
  };

  const handleDescriptionChange = (index: number, newDescription: string) => {
    const newLevels = [...levels];
    newLevels[index] = {
      ...newLevels[index],
      description: newDescription,
    };
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

  const handleAddNew = () => {
    if (!newLevelName.trim()) return;
    
    const newSlug = newLevelName.toLowerCase().replace(/\s+/g, '-');
    const newLevel: LocalStylistLevel = {
      id: newSlug,
      slug: newSlug,
      label: newLevelName.trim(),
      clientLabel: `Level ${levels.length + 1}`,
      description: '',
    };
    
    setLevels([...levels, newLevel]);
    setNewLevelName('');
    setIsAddingNew(false);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const levelsToSave = levels.map((level, idx) => ({
      id: level.dbId,
      slug: level.slug,
      label: level.label,
      client_label: `Level ${idx + 1}`,
      description: level.description || undefined,
      display_order: idx,
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
    // This will trigger the useEffect to reset from DB
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <DashboardLoader className="min-h-[400px]" />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-destructive">Failed to load stylist levels</p>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-6 px-6 py-4 -mt-6 mb-2 border-b border-transparent transition-all duration-200" style={{ borderColor: 'transparent' }}>
          <DashboardPageHeader
            title="Stylist Levels"
            description="Manage experience levels and pricing tiers"
            actions={
              hasChanges && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost"
                    onClick={handleDiscard}
                  >
                    Discard
                  </Button>
                  <Button 
                    className="gap-2" 
                    onClick={handleSave}
                    disabled={saveLevels.isPending}
                  >
                    {saveLevels.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              )
            }
          />
        </div>

        {/* Info Notice */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Level-based service pricing is displayed on the client-facing website{' '}
            <a 
              href="/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              your website
            </a>
            . To adjust or edit level pricing, you can do so in the{' '}
            <a 
              href="/dashboard/admin/services" 
              className="text-primary hover:underline"
            >
              Services editor
            </a>
            .
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Levels List */}
          <div className="lg:col-span-3 space-y-2">
            {levels.map((level, index) => {
              const stylistCount = getStylistCount(level.id);
              const hasStylists = stylistCount > 0;
              
              return (
              <div
                  key={level.id}
                  className={cn(
                    "group rounded-xl bg-muted/50 border transition-all duration-200 hover:shadow-sm",
                    editingIndex === index && "ring-2 ring-primary/50 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    {/* Reorder buttons - subtle */}
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

                    {/* Level number - with dynamic progressive color */}
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      getLevelColor(index, levels.length).bg,
                      getLevelColor(index, levels.length).text
                    )}>
                      Level {index + 1}
                    </span>

                    {/* Level name - editable or display */}
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
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-2 rounded-md hover:bg-muted transition-colors"
                            onClick={() => setEditingIndex(index)}
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="p-2 rounded-md hover:bg-destructive/10 transition-colors disabled:opacity-30"
                                disabled={levels.length <= 1}
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
                                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200">
                                        <p className="font-medium flex items-center gap-2">
                                          <AlertTriangle className="w-4 h-4" />
                                          Warning: {stylistCount} stylist{stylistCount !== 1 ? 's are' : ' is'} assigned to this level
                                        </p>
                                        <p className="text-sm mt-1 text-amber-700 dark:text-amber-300">
                                          You'll need to reassign these stylists to a different level.
                                        </p>
                                      </div>
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
                                  onClick={() => handleDelete(index)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Description field */}
                  <div className="px-4 pb-3 pt-0">
                    <div className="flex items-start gap-2 pl-14">
                      <Input
                        value={level.description}
                        onChange={(e) => handleDescriptionChange(index, e.target.value)}
                        placeholder="Brief description for tooltip..."
                        className="h-7 text-xs text-muted-foreground bg-background border focus-visible:ring-1"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add new level */}
            {isAddingNew ? (
              <div className="flex items-center gap-4 px-4 py-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
                <div className="w-8" /> {/* Spacer for alignment */}
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
            {/* Color Progression Preview */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Palette className="w-4 h-4" />
                <span>Color Progression</span>
              </div>
              
              <div className="bg-card border rounded-xl p-4 space-y-4">
                {/* Current levels */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Current ({levels.length} levels)</p>
                  <div className="flex flex-wrap gap-2">
                    {levels.map((level, idx) => (
                      <span 
                        key={level.id}
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium transition-all",
                          getLevelColor(idx, levels.length).bg,
                          getLevelColor(idx, levels.length).text
                        )}
                      >
                        {idx + 1}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Preview with +1 level */}
                <div className="space-y-2 pt-3 border-t border-dashed">
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    After adding a level ({levels.length + 1} levels)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[...levels, { id: 'preview', label: 'New' }].map((_, idx) => (
                      <span 
                        key={idx}
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium transition-all",
                          getLevelColor(idx, levels.length + 1).bg,
                          getLevelColor(idx, levels.length + 1).text,
                          idx === levels.length && "ring-2 ring-primary/30 ring-offset-1"
                        )}
                      >
                        {idx + 1}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 italic">
                    Colors adjust to maintain progression
                  </p>
                </div>
              </div>
            </div>

            {/* Stylists Overview */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>Stylists Overview</span>
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

            {/* Stylist Card Preview */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="w-4 h-4" />
                <span>Card Preview</span>
              </div>
              
              {/* Mini stylist card mockup */}
              <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-gradient-to-b from-neutral-600 to-neutral-800">
                {/* Fake image placeholder */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Card content overlay */}
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
              
              {/* Level selector for preview */}
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

            {/* Services Page Preview */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="w-4 h-4" />
                <span>Services Dropdown</span>
              </div>
              
              {/* Preview of the dropdown selector */}
              <div className="bg-foreground rounded-xl p-4 space-y-3">
                {/* Fake dropdown button */}
                <button
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-background/30 rounded-full text-xs font-sans bg-background/10 text-background"
                >
                  <span className="text-background/70">Level:</span>
                  <span className="font-medium truncate">
                    {levels[previewLevel]?.label || 'New Talent'}
                  </span>
                  <ChevronDownIcon size={14} className="text-background/70 shrink-0" />
                </button>

                {/* Preview dropdown items */}
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
