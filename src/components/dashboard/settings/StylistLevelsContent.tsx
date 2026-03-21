import { useState, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';
import { getLevelColor } from '@/lib/level-colors';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  AlertTriangle,
  Info,
  Loader2,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useStylistLevels, 
  useSaveStylistLevels,
} from '@/hooks/useStylistLevels';
import { TeamCommissionRoster } from './TeamCommissionRoster';

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


const formatRate = (rate: number | null | undefined): string => {
  if (rate == null) return '';
  return String(Math.round(rate * 100));
};

export function StylistLevelsContent() {
  const { data: dbLevels, isLoading, error, refetch } = useStylistLevels();
  const saveLevels = useSaveStylistLevels();
  
  const [levels, setLevels] = useState<LocalStylistLevel[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newLevelName, setNewLevelName] = useState('');
  const [newServiceRate, setNewServiceRate] = useState('');
  const [newRetailRate, setNewRetailRate] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Commission overrides
  const { data: orgData } = useQuery({
    queryKey: ['user-org-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      // Try organization_admins first
      const { data: adminData } = await supabase
        .from('organization_admins')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (adminData?.organization_id) return adminData;
      // Fallback to employee_profiles
      const { data: empData } = await supabase
        .from('employee_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .not('organization_id', 'is', null)
        .maybeSingle();
      return empData;
    },
  });
  const orgId = orgData?.organization_id;




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

  const handleCommissionChange = (index: number, field: 'serviceCommissionRate' | 'retailCommissionRate', value: string) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], [field]: value };
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
      serviceCommissionRate: newServiceRate || '',
      retailCommissionRate: newRetailRate || '',
    };
    
    setLevels([...levels, newLevel]);
    setNewLevelName('');
    setNewServiceRate('');
    setNewRetailRate('');
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
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
        <p className="text-destructive">Failed to load stylist levels</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-2 p-3 rounded-lg bg-muted/50 border">
          <Button variant="ghost" onClick={handleDiscard}>Discard</Button>
          <Button onClick={handleSave} disabled={saveLevels.isPending}>
            {saveLevels.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      )}

      {/* Info Notice */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Commission rates set here apply to all stylists at each level unless individually overridden below. Level-based service pricing is displayed on the client-facing website — adjust level pricing in the{' '}
          <a href="/dashboard/admin/services" className="text-primary hover:underline">Services editor</a>.
        </p>
      </div>

      {/* Levels List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className={tokens.card.iconBox}>
              <Layers className={tokens.card.icon} />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>EXPERIENCE LEVELS</CardTitle>
              <CardDescription>Define experience tiers with default commission rates.</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size={tokens.button.card}
            className={tokens.button.cardAction}
            onClick={() => setIsAddingNew(true)}
          >
            <Plus className="w-4 h-4" /> Add Level
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
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
                  <div className="flex flex-col opacity-40 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-0.5 hover:text-foreground disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      className="p-0.5 hover:text-foreground disabled:opacity-30"
                      disabled={index === levels.length - 1}
                      onClick={() => handleMoveDown(index)}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getLevelColor(index, levels.length).bg,
                    getLevelColor(index, levels.length).text
                  )}>
                    Level {index + 1}
                  </span>

                  {editingIndex === index ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={level.label}
                        onChange={(e) => handleRename(index, e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') setEditingIndex(null);
                        }}
                      />
                      <Button variant="ghost" size={tokens.button.inline} onClick={() => setEditingIndex(null)}>Done</Button>
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
                      {/* Commission rates display */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        {level.serviceCommissionRate && (
                          <span>Svc: {level.serviceCommissionRate}%</span>
                        )}
                        {level.retailCommissionRate && (
                          <span>Retail: {level.retailCommissionRate}%</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 rounded-md hover:bg-muted" onClick={() => setEditingIndex(index)}>
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-2 rounded-md hover:bg-destructive/10" disabled={levels.length <= 1}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                {hasStylists && <AlertTriangle className="w-5 h-5 text-destructive" />}
                                Delete "{level.label}"?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {hasStylists ? (
                                  <span className="text-destructive">
                                    Warning: {stylistCount} stylist{stylistCount !== 1 ? 's are' : ' is'} assigned to this level.
                                  </span>
                                ) : (
                                  'No stylists are currently assigned to this level.'
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive" onClick={() => handleDelete(index)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </div>
                
                {editingIndex === index && (
                  <div className="px-4 pb-3 space-y-3">
                    <Textarea
                      placeholder="Optional description..."
                      value={level.description}
                      onChange={(e) => handleDescriptionChange(index, e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Service Commission %</label>
                        <Input
                          type="number"
                          placeholder="e.g. 40"
                          value={level.serviceCommissionRate}
                          onChange={(e) => handleCommissionChange(index, 'serviceCommissionRate', e.target.value)}
                          className="h-8 text-sm"
                          min={0}
                          max={100}
                          autoCapitalize="off"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Retail Commission %</label>
                        <Input
                          type="number"
                          placeholder="e.g. 10"
                          value={level.retailCommissionRate}
                          onChange={(e) => handleCommissionChange(index, 'retailCommissionRate', e.target.value)}
                          className="h-8 text-sm"
                          min={0}
                          max={100}
                          autoCapitalize="off"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add new level */}
          {isAddingNew ? (
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Input
                value={newLevelName}
                onChange={(e) => setNewLevelName(e.target.value)}
                placeholder="Level name..."
                className="flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddNew();
                  if (e.key === 'Escape') { setIsAddingNew(false); setNewLevelName(''); setNewServiceRate(''); setNewRetailRate(''); }
                }}
              />
              <Input
                type="number"
                value={newServiceRate}
                onChange={(e) => setNewServiceRate(e.target.value)}
                placeholder="Svc %"
                className="w-20"
                min={0}
                max={100}
                autoCapitalize="off"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddNew();
                  if (e.key === 'Escape') { setIsAddingNew(false); setNewLevelName(''); setNewServiceRate(''); setNewRetailRate(''); }
                }}
              />
              <Input
                type="number"
                value={newRetailRate}
                onChange={(e) => setNewRetailRate(e.target.value)}
                placeholder="Retail %"
                className="w-20"
                min={0}
                max={100}
                autoCapitalize="off"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddNew();
                  if (e.key === 'Escape') { setIsAddingNew(false); setNewLevelName(''); setNewServiceRate(''); setNewRetailRate(''); }
                }}
              />
              <Button size={tokens.button.inline} onClick={handleAddNew} disabled={!newLevelName.trim()}>Add</Button>
              <Button size={tokens.button.inline} variant="ghost" onClick={() => { setIsAddingNew(false); setNewLevelName(''); setNewServiceRate(''); setNewRetailRate(''); }}>Cancel</Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Team Commission Roster */}
      {orgId && dbLevels && dbLevels.length > 0 && (
        <TeamCommissionRoster orgId={orgId} levels={dbLevels} />
      )}

    </div>
  );
}
