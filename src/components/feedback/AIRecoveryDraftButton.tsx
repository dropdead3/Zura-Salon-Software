import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Copy, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  recoveryTaskId: string;
}

type Channel = 'sms' | 'email';
type Tone = 'apologetic' | 'professional' | 'warm';

export function AIRecoveryDraftButton({ recoveryTaskId }: Props) {
  const [draft, setDraft] = useState('');
  const [channel, setChannel] = useState<Channel>('sms');
  const [tone, setTone] = useState<Tone>('apologetic');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-recovery-draft', {
        body: { recoveryTaskId, channel, tone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDraft(data.draft || '');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not draft outreach';
      if (msg.includes('Rate')) toast.error('AI is busy — try again shortly.');
      else if (msg.includes('credits')) toast.error('AI credits exhausted.');
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    toast.success('Draft copied to clipboard');
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" /> AI-drafted outreach
        </Label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="apologetic">Apologetic</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={generate}
        disabled={loading}
        variant="outline"
        size="sm"
        className="w-full gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {draft ? 'Regenerate draft' : 'Draft message'}
      </Button>
      {draft && (
        <>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Review before sending. Operator approval required — never auto-sent.
            </p>
            <Button onClick={copy} variant="ghost" size="sm" className="gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
