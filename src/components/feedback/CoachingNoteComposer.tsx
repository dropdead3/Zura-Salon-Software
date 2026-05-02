import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateCoachingNote, type CoachingCategory } from '@/hooks/useStylistCoachingNotes';
import { Sparkles } from 'lucide-react';

interface Props {
  stylistUserId: string;
  feedbackResponseId?: string | null;
  onSaved?: () => void;
}

const CATEGORIES: { value: CoachingCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'technical', label: 'Technical' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'tone', label: 'Tone / hospitality' },
  { value: 'recovery', label: 'Recovery follow-up' },
  { value: 'recognition', label: 'Recognition' },
];

export function CoachingNoteComposer({ stylistUserId, feedbackResponseId, onSaved }: Props) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<CoachingCategory>('general');
  const create = useCreateCoachingNote();

  const handleSave = async () => {
    if (!text.trim()) return;
    await create.mutateAsync({
      stylist_user_id: stylistUserId,
      note_text: text,
      category,
      feedback_response_id: feedbackResponseId ?? null,
    });
    setText('');
    onSaved?.();
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Log a coaching note for this stylist
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What pattern did you observe? What's the next conversation?"
        rows={3}
      />
      <div className="flex items-center justify-between gap-3">
        <Select value={category} onValueChange={(v) => setCategory(v as CoachingCategory)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleSave} disabled={!text.trim() || create.isPending}>
          {create.isPending ? 'Saving…' : 'Save coaching note'}
        </Button>
      </div>
    </div>
  );
}
