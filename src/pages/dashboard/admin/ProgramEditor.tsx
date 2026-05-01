import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsTrigger, ResponsiveTabsList } from '@/components/ui/tabs';
import { 
  Settings, 
  ListChecks, 
  ScrollText, 
  Save, 
  Plus, 
  Trash2, 
  GripVertical,
  Loader2,
  AlertTriangle,
  Target,
  ChevronLeft,
  Edit2,
  Check,
  X,
  Calendar,
  FileText,
  Eye
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import ProgramWeeksEditor from '@/components/dashboard/ProgramWeeksEditor';
import ProgramResourcesEditor from '@/components/dashboard/ProgramResourcesEditor';
import { ProgramPreviewModal } from '@/components/dashboard/ProgramPreviewModal';
import { MissedDayPreview } from '@/components/dashboard/MissedDayPreview';
import { WelcomePagePreview } from '@/components/dashboard/WelcomePagePreview';
import { ProgramLogoEditor } from '@/components/dashboard/ProgramLogoEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { isStructurallyEqual } from '@/lib/stableStringify';


interface ProgramConfig {
  id: string;
  program_name: string;
  total_days: number;
  weekly_wins_interval: number;
  require_proof_upload: boolean;
  require_metrics_logging: boolean;
  allow_manual_restart: boolean;
  auto_restart_on_miss: boolean;
  is_active: boolean;
  grace_period_hours: number;
  life_happens_passes_total: number;
  logo_url: string | null;
  logo_size: number;
  logo_color: string | null;
  welcome_headline: string | null;
  welcome_subheadline: string | null;
  welcome_cta_text: string | null;
  welcome_eyebrow: string | null;
}

interface DailyTask {
  id: string;
  task_key: string;
  label: string;
  description: string | null;
  display_order: number;
  is_required: boolean;
  is_active: boolean;
}

interface ProgramRule {
  id: string;
  rule_number: number;
  rule_text: string;
  is_emphasized: boolean;
  is_active: boolean;
  display_order: number;
}

function SortableTaskItem({ 
  task, 
  onEdit, 
  onDelete, 
  onToggleActive 
}: { 
  task: DailyTask;
  onEdit: (task: DailyTask) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-card border rounded-lg ${isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''} ${!task.is_active ? 'opacity-50' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{task.label}</p>
          {task.is_required && (
            <Badge variant="secondary" className="text-[10px]">Required</Badge>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground truncate">{task.description}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">Key: {task.task_key}</p>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={task.is_active}
          onCheckedChange={(checked) => onToggleActive(task.id, checked)}
        />
        <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
          <Edit2 className="w-4 h-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{task.label}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(task.id)} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function SortableRuleItem({ 
  rule, 
  onEdit, 
  onDelete, 
  onToggleActive,
  onToggleEmphasis
}: { 
  rule: ProgramRule;
  onEdit: (rule: ProgramRule) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onToggleEmphasis: (id: string, emphasized: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-card border rounded-lg ${isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''} ${!rule.is_active ? 'opacity-50' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
        {rule.rule_number}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${rule.is_emphasized ? 'font-medium' : ''}`}>{rule.rule_text}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={rule.is_emphasized ? "default" : "outline"}
          size="sm"
          className="text-xs h-7"
          onClick={() => onToggleEmphasis(rule.id, !rule.is_emphasized)}
        >
          {rule.is_emphasized ? 'Emphasized' : 'Normal'}
        </Button>
        <Switch
          checked={rule.is_active}
          onCheckedChange={(checked) => onToggleActive(rule.id, checked)}
        />
        <Button variant="ghost" size="icon" onClick={() => onEdit(rule)}>
          <Edit2 className="w-4 h-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this rule. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(rule.id)} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function ProgramEditor() {
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();
  const { data: profile } = useEmployeeProfile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [config, setConfig] = useState<ProgramConfig | null>(null);
  const [initialConfig, setInitialConfig] = useState<ProgramConfig | null>(null);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [rules, setRules] = useState<ProgramRule[]>([]);
  
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [editingRule, setEditingRule] = useState<ProgramRule | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  
  const [newTask, setNewTask] = useState({ task_key: '', label: '', description: '', is_required: true });
  const [newRule, setNewRule] = useState({ rule_text: '', is_emphasized: false });

  // Track unsaved changes
  const hasUnsavedChanges = config && initialConfig ? 
    !isStructurallyEqual(config, initialConfig) : false;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check super admin access
  const isSuperAdmin = profile?.is_super_admin;

  useEffect(() => {
    if (profile && !isSuperAdmin) {
      toast.error('Access denied. Super admin only.');
      navigate(dashPath('/'));
    }
  }, [profile, isSuperAdmin, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configResult, tasksResult, rulesResult] = await Promise.all([
        supabase.from('program_configuration').select('*').single(),
        supabase.from('program_daily_tasks').select('*').order('display_order'),
        supabase.from('program_rules').select('*').order('display_order'),
      ]);

      if (configResult.data) {
        setConfig(configResult.data);
        setInitialConfig(configResult.data);
      }
      if (tasksResult.data) setTasks(tasksResult.data);
      if (rulesResult.data) setRules(rulesResult.data);
    } catch (error) {
      console.error('Error fetching program data:', error);
      toast.error('Failed to load program configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('program_configuration')
      .update({
        program_name: config.program_name,
        total_days: config.total_days,
        weekly_wins_interval: config.weekly_wins_interval,
        require_proof_upload: config.require_proof_upload,
        require_metrics_logging: config.require_metrics_logging,
        allow_manual_restart: config.allow_manual_restart,
        auto_restart_on_miss: config.auto_restart_on_miss,
        is_active: config.is_active,
        grace_period_hours: config.grace_period_hours,
        life_happens_passes_total: config.life_happens_passes_total,
        logo_url: config.logo_url,
        logo_size: config.logo_size,
        logo_color: config.logo_color,
        welcome_headline: config.welcome_headline,
        welcome_subheadline: config.welcome_subheadline,
        welcome_cta_text: config.welcome_cta_text,
        welcome_eyebrow: config.welcome_eyebrow,
      })
      .eq('id', config.id);

    if (error) {
      toast.error('Failed to save configuration');
    } else {
      toast.success('Configuration saved');
      setInitialConfig(config); // Reset initial state after save
    }
    setSaving(false);
  };

  const handleTaskDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex(t => t.id === active.id);
    const newIndex = tasks.findIndex(t => t.id === over.id);
    const newTasks = arrayMove(tasks, oldIndex, newIndex);
    
    setTasks(newTasks);

    // Update display orders in database
    const updates = newTasks.map((task, index) => ({
      id: task.id,
      display_order: index + 1,
    }));

    for (const update of updates) {
      await supabase
        .from('program_daily_tasks')
        .update({ display_order: update.display_order })
        .eq('id', update.id);
    }
  };

  const handleRuleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rules.findIndex(r => r.id === active.id);
    const newIndex = rules.findIndex(r => r.id === over.id);
    const newRules = arrayMove(rules, oldIndex, newIndex);
    
    // Update rule numbers based on new order
    const updatedRules = newRules.map((rule, index) => ({
      ...rule,
      rule_number: index + 1,
      display_order: index + 1,
    }));
    
    setRules(updatedRules);

    // Update in database
    for (const rule of updatedRules) {
      await supabase
        .from('program_rules')
        .update({ rule_number: rule.rule_number, display_order: rule.display_order })
        .eq('id', rule.id);
    }
  };

  const addTask = async () => {
    if (!newTask.task_key || !newTask.label) {
      toast.error('Task key and label are required');
      return;
    }

    const { data, error } = await supabase
      .from('program_daily_tasks')
      .insert({
        task_key: newTask.task_key.toLowerCase().replace(/\s+/g, '_'),
        label: newTask.label,
        description: newTask.description || null,
        is_required: newTask.is_required,
        display_order: tasks.length + 1,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add task');
    } else if (data) {
      setTasks([...tasks, data]);
      setNewTask({ task_key: '', label: '', description: '', is_required: true });
      setIsAddingTask(false);
      toast.success('Task added');
    }
  };

  const updateTask = async (task: DailyTask) => {
    const { error } = await supabase
      .from('program_daily_tasks')
      .update({
        task_key: task.task_key,
        label: task.label,
        description: task.description,
        is_required: task.is_required,
      })
      .eq('id', task.id);

    if (error) {
      toast.error('Failed to update task');
    } else {
      setTasks(tasks.map(t => t.id === task.id ? task : t));
      setEditingTask(null);
      toast.success('Task updated');
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase
      .from('program_daily_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete task');
    } else {
      setTasks(tasks.filter(t => t.id !== id));
      toast.success('Task deleted');
    }
  };

  const toggleTaskActive = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('program_daily_tasks')
      .update({ is_active: active })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update task');
    } else {
      setTasks(tasks.map(t => t.id === id ? { ...t, is_active: active } : t));
    }
  };

  const addRule = async () => {
    if (!newRule.rule_text) {
      toast.error('Rule text is required');
      return;
    }

    const newRuleNumber = rules.length + 1;
    const { data, error } = await supabase
      .from('program_rules')
      .insert({
        rule_number: newRuleNumber,
        rule_text: newRule.rule_text,
        is_emphasized: newRule.is_emphasized,
        display_order: newRuleNumber,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add rule');
    } else if (data) {
      setRules([...rules, data]);
      setNewRule({ rule_text: '', is_emphasized: false });
      setIsAddingRule(false);
      toast.success('Rule added');
    }
  };

  const updateRule = async (rule: ProgramRule) => {
    const { error } = await supabase
      .from('program_rules')
      .update({
        rule_text: rule.rule_text,
        is_emphasized: rule.is_emphasized,
      })
      .eq('id', rule.id);

    if (error) {
      toast.error('Failed to update rule');
    } else {
      setRules(rules.map(r => r.id === rule.id ? rule : r));
      setEditingRule(null);
      toast.success('Rule updated');
    }
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase
      .from('program_rules')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete rule');
    } else {
      // Re-number remaining rules
      const remainingRules = rules.filter(r => r.id !== id);
      const renumberedRules = remainingRules.map((rule, index) => ({
        ...rule,
        rule_number: index + 1,
      }));
      setRules(renumberedRules);
      
      // Update rule numbers in database
      for (const rule of renumberedRules) {
        await supabase
          .from('program_rules')
          .update({ rule_number: rule.rule_number })
          .eq('id', rule.id);
      }
      
      toast.success('Rule deleted');
    }
  };

  const toggleRuleActive = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('program_rules')
      .update({ is_active: active })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update rule');
    } else {
      setRules(rules.map(r => r.id === id ? { ...r, is_active: active } : r));
    }
  };

  const toggleRuleEmphasis = async (id: string, emphasized: boolean) => {
    const { error } = await supabase
      .from('program_rules')
      .update({ is_emphasized: emphasized })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update rule');
    } else {
      setRules(rules.map(r => r.id === id ? { ...r, is_emphasized: emphasized } : r));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardLoader size="xl" className="min-h-[60vh] p-6 lg:p-8" />
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
          <h1 className="text-xl font-display mb-2">Access Denied</h1>
          <p className="text-muted-foreground">This page is only accessible to Super Admins.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-foreground text-background rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-medium">Program Editor</h1>
              <p className="text-sm text-muted-foreground">Configure the Client Engine program settings</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <ResponsiveTabsList>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="weeks" className="gap-2">
              <Calendar className="w-4 h-4" />
              Weeks
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ListChecks className="w-4 h-4" />
              Daily Tasks
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <ScrollText className="w-4 h-4" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="w-4 h-4" />
              Editor
            </TabsTrigger>
          </ResponsiveTabsList>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Program Configuration</CardTitle>
                <CardDescription>Core settings for the Client Engine program</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {config && (
                  <>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Program Name</Label>
                        <Input
                          value={config.program_name}
                          onChange={(e) => setConfig({ ...config, program_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total Days</Label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={config.total_days}
                          onChange={(e) => setConfig({ ...config, total_days: parseInt(e.target.value) || 75 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Weekly Wins Interval (days)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={config.weekly_wins_interval}
                          onChange={(e) => setConfig({ ...config, weekly_wins_interval: parseInt(e.target.value) || 7 })}
                        />
                        <p className="text-xs text-muted-foreground">
                          How often participants submit Weekly Wins reports
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-6 space-y-4">
                      <h3 className="font-medium text-sm">Requirements</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">Require Proof Upload</p>
                            <p className="text-xs text-muted-foreground">Must upload proof of work daily</p>
                          </div>
                          <Switch
                            checked={config.require_proof_upload}
                            onCheckedChange={(checked) => setConfig({ ...config, require_proof_upload: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">Require Metrics Logging</p>
                            <p className="text-xs text-muted-foreground">Must log daily metrics</p>
                          </div>
                          <Switch
                            checked={config.require_metrics_logging}
                            onCheckedChange={(checked) => setConfig({ ...config, require_metrics_logging: checked })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6 space-y-4">
                      <h3 className="font-medium text-sm">Life Happens Pass Settings</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Grace Period (hours)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={72}
                            value={config.grace_period_hours || 24}
                            onChange={(e) => setConfig({ ...config, grace_period_hours: parseInt(e.target.value) || 24 })}
                          />
                          <p className="text-xs text-muted-foreground">Time users have to use a pass after missing a day</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Total Passes Per Enrollment</Label>
                          <Input
                            type="number"
                            min={0}
                            max={10}
                            value={config.life_happens_passes_total || 2}
                            onChange={(e) => setConfig({ ...config, life_happens_passes_total: parseInt(e.target.value) || 2 })}
                          />
                          <p className="text-xs text-muted-foreground">Number of Life Happens Passes each participant gets</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6 space-y-4">
                      <h3 className="font-medium text-sm">Restart Behavior</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">Allow Manual Restart</p>
                            <p className="text-xs text-muted-foreground">Users can restart their program anytime</p>
                          </div>
                          <Switch
                            checked={config.allow_manual_restart}
                            onCheckedChange={(checked) => setConfig({ ...config, allow_manual_restart: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">Auto Restart on Miss</p>
                            <p className="text-xs text-muted-foreground">Automatically restart if a day is missed</p>
                          </div>
                          <Switch
                            checked={config.auto_restart_on_miss}
                            onCheckedChange={(checked) => setConfig({ ...config, auto_restart_on_miss: checked })}
                          />
                        </div>
                      </div>
                    </div>


                    <div className="border-t pt-6">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={config.is_active}
                          onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
                        />
                        <div>
                          <p className="font-medium text-sm">Program Active</p>
                          <p className="text-xs text-muted-foreground">
                            {config.is_active ? 'Program is open for enrollment' : 'Program is currently disabled'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weeks Tab */}
          <TabsContent value="weeks">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly Modules</CardTitle>
                <CardDescription>Configure each week's theme, objectives, and unique assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <ProgramWeeksEditor />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">Daily Tasks</CardTitle>
                  <CardDescription>Tasks participants must complete each day</CardDescription>
                </div>
                <Button onClick={() => setIsAddingTask(true)} disabled={isAddingTask}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAddingTask && (
                  <Card className="p-4 border-primary/50 bg-primary/5">
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Task Key</Label>
                          <Input
                            placeholder="e.g., content_posted"
                            value={newTask.task_key}
                            onChange={(e) => setNewTask({ ...newTask, task_key: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">Unique identifier (snake_case)</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Label</Label>
                          <Input
                            placeholder="e.g., Post content today"
                            value={newTask.label}
                            onChange={(e) => setNewTask({ ...newTask, label: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description (optional)</Label>
                        <Textarea
                          placeholder="Additional details about this task..."
                          value={newTask.description}
                          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newTask.is_required}
                            onCheckedChange={(checked) => setNewTask({ ...newTask, is_required: checked })}
                          />
                          <Label className="text-sm">Required task</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" onClick={() => setIsAddingTask(false)}>
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                          <Button onClick={addTask}>
                            <Check className="w-4 h-4 mr-2" />
                            Add Task
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleTaskDragEnd}
                >
                  <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {tasks.map(task => (
                        <SortableTaskItem
                          key={task.id}
                          task={task}
                          onEdit={setEditingTask}
                          onDelete={deleteTask}
                          onToggleActive={toggleTaskActive}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {tasks.length === 0 && !isAddingTask && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No daily tasks configured</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Task Dialog */}
            <AlertDialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Edit Task</AlertDialogTitle>
                </AlertDialogHeader>
                {editingTask && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Task Key</Label>
                      <Input
                        value={editingTask.task_key}
                        onChange={(e) => setEditingTask({ ...editingTask, task_key: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input
                        value={editingTask.label}
                        onChange={(e) => setEditingTask({ ...editingTask, label: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={editingTask.description || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingTask.is_required}
                        onCheckedChange={(checked) => setEditingTask({ ...editingTask, is_required: checked })}
                      />
                      <Label>Required task</Label>
                    </div>
                  </div>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => editingTask && updateTask(editingTask)}>
                    Save Changes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">Program Rules</CardTitle>
                  <CardDescription>The rules displayed to participants on enrollment</CardDescription>
                </div>
                <Button onClick={() => setIsAddingRule(true)} disabled={isAddingRule}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAddingRule && (
                  <Card className="p-4 border-primary/50 bg-primary/5">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Rule Text</Label>
                        <Input
                          placeholder="e.g., Complete all daily tasks"
                          value={newRule.rule_text}
                          onChange={(e) => setNewRule({ ...newRule, rule_text: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newRule.is_emphasized}
                            onCheckedChange={(checked) => setNewRule({ ...newRule, is_emphasized: checked })}
                          />
                          <Label className="text-sm">Emphasize this rule (bold)</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" onClick={() => setIsAddingRule(false)}>
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                          <Button onClick={addRule}>
                            <Check className="w-4 h-4 mr-2" />
                            Add Rule
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleRuleDragEnd}
                >
                  <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {rules.map(rule => (
                        <SortableRuleItem
                          key={rule.id}
                          rule={rule}
                          onEdit={setEditingRule}
                          onDelete={deleteRule}
                          onToggleActive={toggleRuleActive}
                          onToggleEmphasis={toggleRuleEmphasis}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {rules.length === 0 && !isAddingRule && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No program rules configured</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Rule Dialog */}
            <AlertDialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Edit Rule</AlertDialogTitle>
                </AlertDialogHeader>
                {editingRule && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Rule Text</Label>
                      <Input
                        value={editingRule.rule_text}
                        onChange={(e) => setEditingRule({ ...editingRule, rule_text: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingRule.is_emphasized}
                        onCheckedChange={(checked) => setEditingRule({ ...editingRule, is_emphasized: checked })}
                      />
                      <Label>Emphasize this rule</Label>
                    </div>
                  </div>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => editingRule && updateRule(editingRule)}>
                    Save Changes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-8">
            {/* Welcome Page Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display">Welcome Page</CardTitle>
                <CardDescription>Customize the onboarding experience for new participants</CardDescription>
              </CardHeader>
              <CardContent>
                <WelcomePagePreview 
                  previewConfig={config} 
                  onLogoChange={(url) => setConfig({ ...config!, logo_url: url })}
                  onLogoSizeChange={(size) => setConfig({ ...config!, logo_size: size })}
                  onLogoColorChange={(color) => setConfig({ ...config!, logo_color: color })}
                  onEyebrowChange={(eyebrow) => setConfig({ ...config!, welcome_eyebrow: eyebrow })}
                  onHeadlineChange={(headline) => setConfig({ ...config!, welcome_headline: headline })}
                  onSubheadlineChange={(subheadline) => setConfig({ ...config!, welcome_subheadline: subheadline })}
                  onCtaTextChange={(ctaText) => setConfig({ ...config!, welcome_cta_text: ctaText })}
                />
              </CardContent>
            </Card>

            {/* Missed Day Dialog Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display">Missed Day Dialog</CardTitle>
                <CardDescription>Preview how the force restart popup appears to participants</CardDescription>
              </CardHeader>
              <CardContent>
                <MissedDayPreview />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sticky Save Bar */}
        {config && (
          <div className="sticky bottom-0 left-0 right-0 z-50 mt-6 -mx-4 lg:-mx-6">
            <div className="bg-gradient-to-t from-background via-background to-background/80 pt-4 pb-6 px-4 lg:px-6">
              <div className="flex items-center justify-between gap-4 p-4 bg-card border rounded-xl shadow-lg">
                <div className="flex items-center gap-3">
                  {hasUnsavedChanges && (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Unsaved changes</span>
                    </div>
                  )}
                  {!hasUnsavedChanges && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Check className="w-4 h-4" />
                      <span className="text-sm">All changes saved</span>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={saveConfig} 
                  disabled={saving || !hasUnsavedChanges}
                  size="lg"
                  className="font-display tracking-wide px-6"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}