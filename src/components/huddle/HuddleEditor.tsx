import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Send, Trash2, Sparkles } from 'lucide-react';
import {
  useCreateHuddle,
  useUpdateHuddle,
  useDeleteHuddle,
  type DailyHuddle,
} from '@/hooks/useHuddles';
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
import { AIHuddleGenerator } from './AIHuddleGenerator';
import type { GeneratedHuddleContent } from '@/hooks/useAIHuddle';

interface HuddleEditorProps {
  existingHuddle?: DailyHuddle | null;
  date?: string;
  locationId?: string;
  onSaved?: () => void;
}

export function HuddleEditor({
  existingHuddle,
  date,
  locationId,
  onSaved,
}: HuddleEditorProps) {
  const createHuddle = useCreateHuddle();
  const updateHuddle = useUpdateHuddle();
  const deleteHuddle = useDeleteHuddle();

  const [formData, setFormData] = useState({
    focus_of_the_day: '',
    announcements: '',
    wins_from_yesterday: '',
    birthdays_celebrations: '',
    training_reminders: '',
    sales_goals: { retail: 0, service: 0 },
    is_published: false,
  });
  const [aiSections, setAiSections] = useState<Set<string>>(new Set());

  const handleAIContentGenerated = (content: GeneratedHuddleContent) => {
    setFormData(prev => ({
      ...prev,
      focus_of_the_day: content.focus_of_the_day,
      wins_from_yesterday: content.wins_from_yesterday,
      announcements: content.announcements,
      birthdays_celebrations: content.birthdays_celebrations,
      training_reminders: content.training_reminders,
      sales_goals: content.sales_goals,
    }));
    setAiSections(new Set(['focus', 'wins', 'announcements', 'birthdays', 'training', 'goals']));
  };

  useEffect(() => {
    if (existingHuddle) {
      setFormData({
        focus_of_the_day: existingHuddle.focus_of_the_day || '',
        announcements: existingHuddle.announcements || '',
        wins_from_yesterday: existingHuddle.wins_from_yesterday || '',
        birthdays_celebrations: existingHuddle.birthdays_celebrations || '',
        training_reminders: existingHuddle.training_reminders || '',
        sales_goals: (existingHuddle.sales_goals as { retail: number; service: number }) || {
          retail: 0,
          service: 0,
        },
        is_published: existingHuddle.is_published,
      });
    }
  }, [existingHuddle]);

  const handleSave = async (publish = false) => {
    const data = {
      ...formData,
      huddle_date: date || new Date().toISOString().split('T')[0],
      location_id: locationId || null,
      is_published: publish ? true : formData.is_published,
    };

    if (existingHuddle) {
      await updateHuddle.mutateAsync({ id: existingHuddle.id, updates: data });
    } else {
      await createHuddle.mutateAsync(data);
    }

    onSaved?.();
  };

  const handleDelete = async () => {
    if (existingHuddle) {
      await deleteHuddle.mutateAsync(existingHuddle.id);
      onSaved?.();
    }
  };

  const isPending = createHuddle.isPending || updateHuddle.isPending;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* AI Generator */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h3 className="font-medium">Huddle Content</h3>
            <p className="text-sm text-muted-foreground">Fill in manually or generate with AI</p>
          </div>
          <AIHuddleGenerator
            huddleDate={date || new Date().toISOString().split('T')[0]}
            locationId={locationId}
            onContentGenerated={handleAIContentGenerated}
          />
        </div>

        {/* Focus of the day */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="focus">Focus of the Day</Label>
            {aiSections.has('focus') && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Badge>
            )}
          </div>
          <Input
            id="focus"
            placeholder="What should the team focus on today?"
            value={formData.focus_of_the_day}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, focus_of_the_day: e.target.value }));
              setAiSections(prev => { prev.delete('focus'); return new Set(prev); });
            }}
          />
        </div>

        {/* Announcements */}
        <div className="space-y-2">
          <Label htmlFor="announcements">Announcements</Label>
          <Textarea
            id="announcements"
            placeholder="Any important announcements for the team..."
            value={formData.announcements}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, announcements: e.target.value }))
            }
          />
        </div>

        {/* Wins from yesterday */}
        <div className="space-y-2">
          <Label htmlFor="wins">Yesterday's Wins</Label>
          <Textarea
            id="wins"
            placeholder="Celebrate yesterday's successes..."
            value={formData.wins_from_yesterday}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, wins_from_yesterday: e.target.value }))
            }
          />
        </div>

        {/* Birthdays / Celebrations */}
        <div className="space-y-2">
          <Label htmlFor="birthdays">Birthdays & Celebrations</Label>
          <Input
            id="birthdays"
            placeholder="Any birthdays or special celebrations today?"
            value={formData.birthdays_celebrations}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                birthdays_celebrations: e.target.value,
              }))
            }
          />
        </div>

        {/* Training reminders */}
        <div className="space-y-2">
          <Label htmlFor="training">Training Reminders</Label>
          <Input
            id="training"
            placeholder="Any training sessions or deadlines?"
            value={formData.training_reminders}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, training_reminders: e.target.value }))
            }
          />
        </div>

        {/* Sales goals */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="retail-goal">Retail Goal ($)</Label>
            <Input
              id="retail-goal"
              type="number"
              value={formData.sales_goals.retail || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sales_goals: {
                    ...prev.sales_goals,
                    retail: Number(e.target.value) || 0,
                  },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-goal">Service Goal ($)</Label>
            <Input
              id="service-goal"
              type="number"
              value={formData.sales_goals.service || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sales_goals: {
                    ...prev.sales_goals,
                    service: Number(e.target.value) || 0,
                  },
                }))
              }
            />
          </div>
        </div>

        {/* Published toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div>
            <p className="font-medium">Published</p>
            <p className="text-sm text-muted-foreground">
              Make visible to team members
            </p>
          </div>
          <Switch
            checked={formData.is_published}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, is_published: checked }))
            }
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={() => handleSave(false)} disabled={isPending}>
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Save Draft
          </Button>
          <Button
            variant="default"
            onClick={() => handleSave(true)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Send className="w-4 h-4 mr-1" />
            )}
            Save & Publish
          </Button>

          {existingHuddle && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="ml-auto">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Huddle?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this huddle. This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </Card>
  );
}
