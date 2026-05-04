import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { tokens } from '@/lib/design-tokens';
import { MessageSquareReply, Plus, Pencil, Trash2, Copy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useReviewResponseTemplates,
  useUpsertReviewResponseTemplate,
  useDeleteReviewResponseTemplate,
  useIncrementTemplateUse,
  type ReviewResponseTemplate,
  type TemplateAppliesTo,
  type TemplateTone,
} from '@/hooks/useReviewResponseTemplates';
import { toast } from 'sonner';

const TONE_OPTIONS: { value: TemplateTone; label: string }[] = [
  { value: 'warm', label: 'Warm' },
  { value: 'professional', label: 'Professional' },
  { value: 'apologetic', label: 'Apologetic' },
  { value: 'celebratory', label: 'Celebratory' },
  { value: 'concise', label: 'Concise' },
];

const APPLIES_OPTIONS: { value: TemplateAppliesTo; label: string }[] = [
  { value: 'all', label: 'Any review' },
  { value: 'positive', label: 'Positive (4–5★)' },
  { value: 'neutral', label: 'Neutral (3★)' },
  { value: 'negative', label: 'Negative (1–2★)' },
];

const VARIABLES = ['client_first_name', 'business_name', 'staff_first_name', 'service_name'];

export function ReviewResponseTemplateLibrary() {
  const { data, isLoading } = useReviewResponseTemplates();
  const upsert = useUpsertReviewResponseTemplate();
  const del = useDeleteReviewResponseTemplate();
  const incUse = useIncrementTemplateUse();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ReviewResponseTemplate> | null>(null);

  const grouped = useMemo(() => {
    const buckets: Record<TemplateAppliesTo, ReviewResponseTemplate[]> = {
      all: [], positive: [], neutral: [], negative: [],
    };
    (data ?? []).forEach((t) => buckets[t.applies_to]?.push(t));
    return buckets;
  }, [data]);

  const openCreate = () => {
    setEditing({ name: '', body: '', tone: 'warm', applies_to: 'all', is_active: true });
    setEditorOpen(true);
  };

  const openEdit = (t: ReviewResponseTemplate) => {
    setEditing(t);
    setEditorOpen(true);
  };

  const handleCopy = async (t: ReviewResponseTemplate) => {
    await navigator.clipboard.writeText(t.body);
    incUse.mutate(t.id);
    toast.success('Copied to clipboard');
  };

  const handleSave = async () => {
    if (!editing?.name?.trim() || !editing?.body?.trim()) {
      toast.error('Name and body are required');
      return;
    }
    await upsert.mutateAsync({
      id: editing.id,
      name: editing.name,
      body: editing.body!,
      tone: editing.tone as TemplateTone,
      applies_to: editing.applies_to as TemplateAppliesTo,
      is_active: editing.is_active ?? true,
    });
    setEditorOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={tokens.card.iconBox}>
              <MessageSquareReply className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>Review Response Library</CardTitle>
              <CardDescription>
                Reusable replies for Google / Facebook reviews — copy, personalize, post.
              </CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> New template
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <div className={tokens.empty.container}>
            <MessageSquareReply className={tokens.empty.icon} />
            <h3 className={tokens.empty.heading}>No templates yet</h3>
            <p className={tokens.empty.description}>
              Build a small library so any teammate can reply with a consistent voice.
            </p>
            <Button size="sm" className="mt-3" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Create first template
            </Button>
          </div>
        ) : (
          (Object.keys(grouped) as TemplateAppliesTo[]).map((bucket) =>
            grouped[bucket].length === 0 ? null : (
              <div key={bucket} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={tokens.label.tiny}>
                    {APPLIES_OPTIONS.find((o) => o.value === bucket)?.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{grouped[bucket].length}</span>
                </div>
                <div className="grid gap-2">
                  {grouped[bucket].map((t) => (
                    <div
                      key={t.id}
                      className="rounded-lg border border-border/60 bg-card p-3 flex items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{t.name}</span>
                          <Badge variant="outline" className="text-xs capitalize">{t.tone}</Badge>
                          {!t.is_active && <Badge variant="secondary" className="text-xs">Paused</Badge>}
                          {t.use_count > 0 && (
                            <span className="text-xs text-muted-foreground">used {t.use_count}×</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                          {t.body}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => handleCopy(t)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete template "${t.name}"?`)) del.mutate(t.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )
        )}
      </CardContent>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit template' : 'New response template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={editing?.name ?? ''}
                onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))}
                placeholder="e.g. 5-star thank you"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tone</Label>
                <Select
                  value={editing?.tone ?? 'warm'}
                  onValueChange={(v) => setEditing((s) => ({ ...s, tone: v as TemplateTone }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Use for</Label>
                <Select
                  value={editing?.applies_to ?? 'all'}
                  onValueChange={(v) => setEditing((s) => ({ ...s, applies_to: v as TemplateAppliesTo }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPLIES_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Body</Label>
              <Textarea
                rows={6}
                value={editing?.body ?? ''}
                onChange={(e) => setEditing((s) => ({ ...s, body: e.target.value }))}
                placeholder="Thanks so much, {{client_first_name}}! We're thrilled you loved your time with {{staff_first_name}} at {{business_name}}."
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {VARIABLES.map((v) => (
                  <Badge key={v} variant="outline" className="font-mono text-xs">{`{{${v}}}`}</Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <Label>Active</Label>
              <Switch
                checked={editing?.is_active ?? true}
                onCheckedChange={(v) => setEditing((s) => ({ ...s, is_active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? 'Saving…' : 'Save template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

useEffect; // keep import optimization quiet
