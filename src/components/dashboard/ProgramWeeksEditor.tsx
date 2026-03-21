import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { tokens } from '@/lib/design-tokens';
import { 
  Plus, 
  Trash2, 
  GripVertical,
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
  Edit2,
  Check,
  X,
  Calendar,
  Video,
  FileText,
  ClipboardList,
  Link as LinkIcon
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
import { WeekResourcesManager } from './WeekResourcesManager';

interface ProgramResource {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  week_id: string | null;
  assignment_id: string | null;
  display_order: number;
  is_active: boolean;
}

interface ProgramWeek {
  id: string;
  week_number: number;
  title: string;
  description: string | null;
  objective: string | null;
  start_day: number;
  end_day: number;
  video_url: string | null;
  resources_json: unknown;
  is_active: boolean;
  display_order: number;
}

interface WeeklyAssignment {
  id: string;
  week_id: string;
  title: string;
  description: string | null;
  assignment_type: string;
  proof_type: string;
  display_order: number;
  is_required: boolean;
  is_active: boolean;
}

const ASSIGNMENT_TYPES = [
  { value: 'task', label: 'Task', icon: ClipboardList },
  { value: 'video', label: 'Watch Video', icon: Video },
  { value: 'reading', label: 'Reading', icon: FileText },
  { value: 'worksheet', label: 'Worksheet', icon: FileText },
];

const PROOF_TYPES = [
  { value: 'none', label: 'No proof required' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'file', label: 'File upload' },
  { value: 'link', label: 'URL/Link' },
  { value: 'text', label: 'Text response' },
];

function SortableAssignmentItem({
  assignment,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  assignment: WeeklyAssignment;
  onEdit: (a: WeeklyAssignment) => void;
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
  } = useSortable({ id: assignment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeConfig = ASSIGNMENT_TYPES.find((t) => t.value === assignment.assignment_type);
  const TypeIcon = typeConfig?.icon || ClipboardList;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-muted/50 border rounded-lg ${isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''} ${!assignment.is_active ? 'opacity-50' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <TypeIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{assignment.title}</p>
          {assignment.is_required && (
            <Badge variant="secondary" className="text-[10px]">Required</Badge>
          )}
        </div>
        {assignment.description && (
          <p className="text-xs text-muted-foreground truncate">{assignment.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground capitalize">{assignment.assignment_type}</span>
          {assignment.proof_type !== 'none' && (
            <>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground capitalize">{assignment.proof_type} proof</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Switch
          checked={assignment.is_active}
          onCheckedChange={(checked) => onToggleActive(assignment.id, checked)}
        />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(assignment)}>
          <Edit2 className="w-3 h-3" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
              <Trash2 className="w-3 h-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Assignment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{assignment.title}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(assignment.id)} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function WeekCard({
  week,
  assignments,
  resources,
  onUpdateWeek,
  onAddAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  onToggleAssignmentActive,
  onReorderAssignments,
  onResourcesChange,
}: {
  week: ProgramWeek;
  assignments: WeeklyAssignment[];
  resources: ProgramResource[];
  onUpdateWeek: (week: ProgramWeek) => Promise<void>;
  onAddAssignment: (weekId: string, assignment: Partial<WeeklyAssignment>) => Promise<void>;
  onUpdateAssignment: (assignment: WeeklyAssignment) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
  onToggleAssignmentActive: (id: string, active: boolean) => Promise<void>;
  onReorderAssignments: (weekId: string, assignments: WeeklyAssignment[]) => Promise<void>;
  onResourcesChange: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedWeek, setEditedWeek] = useState(week);
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<WeeklyAssignment | null>(null);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    assignment_type: 'task',
    proof_type: 'none',
    is_required: true,
  });
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSaveWeek = async () => {
    setSaving(true);
    await onUpdateWeek(editedWeek);
    setIsEditing(false);
    setSaving(false);
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.title) {
      toast.error('Assignment title is required');
      return;
    }
    await onAddAssignment(week.id, {
      ...newAssignment,
      display_order: assignments.length + 1,
    });
    setNewAssignment({
      title: '',
      description: '',
      assignment_type: 'task',
      proof_type: 'none',
      is_required: true,
    });
    setIsAddingAssignment(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = assignments.findIndex((a) => a.id === active.id);
    const newIndex = assignments.findIndex((a) => a.id === over.id);
    const reordered = arrayMove(assignments, oldIndex, newIndex);
    await onReorderAssignments(week.id, reordered);
  };

  return (
    <Card className={`${!week.is_active ? 'opacity-60' : ''}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="w-10 h-10 bg-foreground text-background rounded-lg flex items-center justify-center font-display font-medium">
                  {week.week_number}
                </div>
                <div>
                  <CardTitle className="text-base">{week.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Days {week.start_day} - {week.end_day}
                    <span className="text-xs">•</span>
                    <span className="text-xs">{assignments.length} assignments</span>
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!week.is_active && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {/* Week Details Section */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              {isEditing ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Week Title</Label>
                      <Input
                        value={editedWeek.title}
                        onChange={(e) => setEditedWeek({ ...editedWeek, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Video URL (optional)</Label>
                      <Input
                        value={editedWeek.video_url || ''}
                        onChange={(e) => setEditedWeek({ ...editedWeek, video_url: e.target.value || null })}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editedWeek.description || ''}
                      onChange={(e) => setEditedWeek({ ...editedWeek, description: e.target.value })}
                      placeholder="What this week covers..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Objective</Label>
                    <Textarea
                      value={editedWeek.objective || ''}
                      onChange={(e) => setEditedWeek({ ...editedWeek, objective: e.target.value })}
                      placeholder="The main goal for participants this week..."
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editedWeek.is_active}
                        onCheckedChange={(checked) => setEditedWeek({ ...editedWeek, is_active: checked })}
                      />
                      <Label className="text-sm">Week Active</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size={tokens.button.card} onClick={() => { setEditedWeek(week); setIsEditing(false); }}>
                        <X className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                      <Button size={tokens.button.card} onClick={handleSaveWeek} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                        Save
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      {week.description && (
                        <p className="text-sm text-muted-foreground">{week.description}</p>
                      )}
                      {week.objective && (
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="text-xs mt-0.5">Objective</Badge>
                          <p className="text-sm font-medium">{week.objective}</p>
                        </div>
                      )}
                      {week.video_url && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Video className="w-4 h-4" />
                          <a href={week.video_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            Week intro video
                          </a>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size={tokens.button.card} onClick={() => setIsEditing(true)}>
                      <Edit2 className="w-4 h-4 mr-1" /> Edit Week
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Assignments Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Weekly Assignments</h4>
                <Button size={tokens.button.card} variant="outline" onClick={() => setIsAddingAssignment(true)} disabled={isAddingAssignment}>
                  <Plus className="w-4 h-4 mr-1" /> Add Assignment
                </Button>
              </div>

              {isAddingAssignment && (
                <Card className="p-4 border-primary/50 bg-primary/5">
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={newAssignment.title}
                          onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                          placeholder="Assignment title..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={newAssignment.assignment_type}
                          onValueChange={(v) => setNewAssignment({ ...newAssignment, assignment_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNMENT_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newAssignment.description}
                        onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                        placeholder="Detailed instructions..."
                        rows={2}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Proof Type</Label>
                        <Select
                          value={newAssignment.proof_type}
                          onValueChange={(v) => setNewAssignment({ ...newAssignment, proof_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROOF_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 pt-7">
                        <Switch
                          checked={newAssignment.is_required}
                          onCheckedChange={(checked) => setNewAssignment({ ...newAssignment, is_required: checked })}
                        />
                        <Label className="text-sm">Required assignment</Label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size={tokens.button.card} onClick={() => setIsAddingAssignment(false)}>
                        <X className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                      <Button size={tokens.button.card} onClick={handleAddAssignment}>
                        <Check className="w-4 h-4 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={assignments.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {assignments.map((assignment) => (
                      <SortableAssignmentItem
                        key={assignment.id}
                        assignment={assignment}
                        onEdit={setEditingAssignment}
                        onDelete={onDeleteAssignment}
                        onToggleActive={onToggleAssignmentActive}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {assignments.length === 0 && !isAddingAssignment && (
                <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                  <ClipboardList className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No assignments for this week</p>
                </div>
              )}
            </div>

            {/* Resources Section */}
            <WeekResourcesManager
              weekId={week.id}
              resources={resources}
              assignments={assignments}
              onResourcesChange={onResourcesChange}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit Assignment Dialog */}
      <AlertDialog open={!!editingAssignment} onOpenChange={() => setEditingAssignment(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Assignment</AlertDialogTitle>
          </AlertDialogHeader>
          {editingAssignment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingAssignment.title}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingAssignment.description || ''}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editingAssignment.assignment_type}
                    onValueChange={(v) => setEditingAssignment({ ...editingAssignment, assignment_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Proof Type</Label>
                  <Select
                    value={editingAssignment.proof_type}
                    onValueChange={(v) => setEditingAssignment({ ...editingAssignment, proof_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROOF_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingAssignment.is_required}
                  onCheckedChange={(checked) => setEditingAssignment({ ...editingAssignment, is_required: checked })}
                />
                <Label>Required assignment</Label>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (editingAssignment) {
                  onUpdateAssignment(editingAssignment);
                  setEditingAssignment(null);
                }
              }}
            >
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function ProgramWeeksEditor() {
  const [weeks, setWeeks] = useState<ProgramWeek[]>([]);
  const [assignments, setAssignments] = useState<WeeklyAssignment[]>([]);
  const [resources, setResources] = useState<ProgramResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [weeksResult, assignmentsResult, resourcesResult] = await Promise.all([
        supabase.from('program_weeks').select('*').order('week_number'),
        supabase.from('weekly_assignments').select('*').order('display_order'),
        supabase.from('program_resources').select('*').order('display_order'),
      ]);

      if (weeksResult.data) setWeeks(weeksResult.data);
      if (assignmentsResult.data) setAssignments(assignmentsResult.data);
      if (resourcesResult.data) setResources(resourcesResult.data);
    } catch (error) {
      console.error('Error fetching weeks data:', error);
      toast.error('Failed to load weeks');
    } finally {
      setLoading(false);
    }
  };

  const updateWeek = async (week: ProgramWeek) => {
    const { error } = await supabase
      .from('program_weeks')
      .update({
        title: week.title,
        description: week.description,
        objective: week.objective,
        video_url: week.video_url,
        is_active: week.is_active,
      })
      .eq('id', week.id);

    if (error) {
      toast.error('Failed to update week');
    } else {
      setWeeks(weeks.map((w) => (w.id === week.id ? week : w)));
      toast.success('Week updated');
    }
  };

  const addAssignment = async (weekId: string, assignment: Partial<WeeklyAssignment>) => {
    const { data, error } = await supabase
      .from('weekly_assignments')
      .insert({
        week_id: weekId,
        title: assignment.title,
        description: assignment.description || null,
        assignment_type: assignment.assignment_type || 'task',
        proof_type: assignment.proof_type || 'none',
        is_required: assignment.is_required ?? true,
        display_order: assignment.display_order || 1,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add assignment');
    } else if (data) {
      setAssignments([...assignments, data]);
      toast.success('Assignment added');
    }
  };

  const updateAssignment = async (assignment: WeeklyAssignment) => {
    const { error } = await supabase
      .from('weekly_assignments')
      .update({
        title: assignment.title,
        description: assignment.description,
        assignment_type: assignment.assignment_type,
        proof_type: assignment.proof_type,
        is_required: assignment.is_required,
      })
      .eq('id', assignment.id);

    if (error) {
      toast.error('Failed to update assignment');
    } else {
      setAssignments(assignments.map((a) => (a.id === assignment.id ? assignment : a)));
      toast.success('Assignment updated');
    }
  };

  const deleteAssignment = async (id: string) => {
    const { error } = await supabase
      .from('weekly_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete assignment');
    } else {
      setAssignments(assignments.filter((a) => a.id !== id));
      toast.success('Assignment deleted');
    }
  };

  const toggleAssignmentActive = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('weekly_assignments')
      .update({ is_active: active })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update assignment');
    } else {
      setAssignments(assignments.map((a) => (a.id === id ? { ...a, is_active: active } : a)));
    }
  };

  const reorderAssignments = async (weekId: string, reordered: WeeklyAssignment[]) => {
    // Update local state immediately
    const otherAssignments = assignments.filter((a) => a.week_id !== weekId);
    const updatedAssignments = reordered.map((a, index) => ({ ...a, display_order: index + 1 }));
    setAssignments([...otherAssignments, ...updatedAssignments]);

    // Persist to database
    for (const assignment of updatedAssignments) {
      await supabase
        .from('weekly_assignments')
        .update({ display_order: assignment.display_order })
        .eq('id', assignment.id);
    }
  };

  if (loading) {
    return <DashboardLoader size="md" className="py-12" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium">Weekly Modules</h3>
          <p className="text-sm text-muted-foreground">
            Configure themes, objectives, and assignments for each week
          </p>
        </div>
        <Badge variant="outline">{weeks.length} weeks</Badge>
      </div>

      <div className="space-y-3">
        {weeks.map((week) => (
          <WeekCard
            key={week.id}
            week={week}
            assignments={assignments
              .filter((a) => a.week_id === week.id)
              .sort((a, b) => a.display_order - b.display_order)}
            resources={resources.filter((r) => r.week_id === week.id)}
            onUpdateWeek={updateWeek}
            onAddAssignment={addAssignment}
            onUpdateAssignment={updateAssignment}
            onDeleteAssignment={deleteAssignment}
            onToggleAssignmentActive={toggleAssignmentActive}
            onReorderAssignments={reorderAssignments}
            onResourcesChange={fetchData}
          />
        ))}
      </div>

      {weeks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No weeks configured</p>
        </div>
      )}
    </div>
  );
}
