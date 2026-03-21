import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Save, X, Plus } from 'lucide-react';
import { useZuraPersonality, useUpsertZuraPersonality, ZuraPersonalityConfig } from '@/hooks/useZuraConfig';
import { AI_ASSISTANT_NAME_DEFAULT } from '@/lib/brand';

interface PersonalityTabProps {
  organizationId: string;
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', desc: 'Polished and business-like' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
  { value: 'motivational', label: 'Motivational', desc: 'Encouraging and energizing' },
  { value: 'luxury', label: 'Luxury', desc: 'Refined and premium' },
  { value: 'casual', label: 'Casual', desc: 'Relaxed and conversational' },
];

const LENGTH_OPTIONS = [
  { value: 'concise', label: 'Concise', desc: 'Short, punchy responses' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced detail' },
  { value: 'detailed', label: 'Detailed', desc: 'Thorough explanations' },
];

export function PersonalityTab({ organizationId }: PersonalityTabProps) {
  const { data: personality, isLoading } = useZuraPersonality(organizationId);
  const upsert = useUpsertZuraPersonality();

  const [form, setForm] = useState({
    display_name: AI_ASSISTANT_NAME_DEFAULT,
    tone: 'friendly' as ZuraPersonalityConfig['tone'],
    formality_level: 3,
    emoji_usage: false,
    custom_greeting: '',
    custom_sign_off: '',
    brand_voice_notes: '',
    prohibited_phrases: [] as string[],
    encouraged_phrases: [] as string[],
    response_length_preference: 'moderate' as ZuraPersonalityConfig['response_length_preference'],
  });

  const [newProhibited, setNewProhibited] = useState('');
  const [newEncouraged, setNewEncouraged] = useState('');

  useEffect(() => {
    if (personality) {
      setForm({
        display_name: personality.display_name || AI_ASSISTANT_NAME_DEFAULT,
        tone: personality.tone,
        formality_level: personality.formality_level,
        emoji_usage: personality.emoji_usage,
        custom_greeting: personality.custom_greeting || '',
        custom_sign_off: personality.custom_sign_off || '',
        brand_voice_notes: personality.brand_voice_notes || '',
        prohibited_phrases: personality.prohibited_phrases || [],
        encouraged_phrases: personality.encouraged_phrases || [],
        response_length_preference: personality.response_length_preference,
      });
    }
  }, [personality]);

  const handleSave = () => {
    upsert.mutate({
      orgId: organizationId,
      data: {
        ...form,
        custom_greeting: form.custom_greeting || null,
        custom_sign_off: form.custom_sign_off || null,
        brand_voice_notes: form.brand_voice_notes || null,
      },
    });
  };

  const addPhrase = (type: 'prohibited_phrases' | 'encouraged_phrases', value: string) => {
    if (!value.trim()) return;
    setForm(prev => ({ ...prev, [type]: [...prev[type], value.trim()] }));
    if (type === 'prohibited_phrases') setNewProhibited('');
    else setNewEncouraged('');
  };

  const removePhrase = (type: 'prohibited_phrases' | 'encouraged_phrases', index: number) => {
    setForm(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) }));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identity</CardTitle>
          <CardDescription>{`Set how ${AI_ASSISTANT_NAME_DEFAULT} introduces herself`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} placeholder={AI_ASSISTANT_NAME_DEFAULT} />
              <p className="text-xs text-muted-foreground">What the AI calls itself</p>
            </div>
            <div className="space-y-2">
              <Label>Custom Greeting</Label>
              <Input value={form.custom_greeting} onChange={e => setForm(p => ({ ...p, custom_greeting: e.target.value }))} placeholder="Hey gorgeous!" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Custom Sign-Off</Label>
            <Input value={form.custom_sign_off} onChange={e => setForm(p => ({ ...p, custom_sign_off: e.target.value }))} placeholder="Keep slaying! 💇‍♀️" />
          </div>
        </CardContent>
      </Card>

      {/* Tone & Style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tone & Style</CardTitle>
          <CardDescription>{`Configure how ${AI_ASSISTANT_NAME_DEFAULT} communicates`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Tone</Label>
            <Select value={form.tone} onValueChange={(v) => setForm(p => ({ ...p, tone: v as ZuraPersonalityConfig['tone'] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="font-medium">{t.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">— {t.desc}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Formality Level</Label>
              <span className="text-sm text-muted-foreground font-mono">{form.formality_level}/5</span>
            </div>
            <Slider
              value={[form.formality_level]}
              onValueChange={([v]) => setForm(p => ({ ...p, formality_level: v }))}
              min={1} max={5} step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Very Casual</span><span>Very Formal</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Response Length</Label>
            <Select value={form.response_length_preference} onValueChange={(v) => setForm(p => ({ ...p, response_length_preference: v as ZuraPersonalityConfig['response_length_preference'] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LENGTH_OPTIONS.map(l => (
                  <SelectItem key={l.value} value={l.value}>
                    <span className="font-medium">{l.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">— {l.desc}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.emoji_usage} onCheckedChange={v => setForm(p => ({ ...p, emoji_usage: v }))} />
            <Label>Allow emoji usage</Label>
          </div>
        </CardContent>
      </Card>

      {/* Brand Voice */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Brand Voice</CardTitle>
          <CardDescription>Define language preferences and restrictions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Brand Voice Notes</Label>
            <Textarea
              value={form.brand_voice_notes}
              onChange={e => setForm(p => ({ ...p, brand_voice_notes: e.target.value }))}
              placeholder="We never use the word 'cheap', always say 'affordable'. Our brand emphasizes luxury self-care..."
              rows={4}
            />
          </div>

          {/* Prohibited phrases */}
          <div className="space-y-2">
            <Label>Prohibited Phrases</Label>
            <p className="text-xs text-muted-foreground">{`Words or phrases ${AI_ASSISTANT_NAME_DEFAULT} must never use`}</p>
            <div className="flex gap-2">
              <Input value={newProhibited} onChange={e => setNewProhibited(e.target.value)} placeholder="Add phrase..."
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPhrase('prohibited_phrases', newProhibited); }}}
              />
              <Button size="icon" variant="outline" onClick={() => addPhrase('prohibited_phrases', newProhibited)}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.prohibited_phrases.map((p, i) => (
                <Badge key={i} variant="destructive" className="gap-1">
                  {p}
                  <button onClick={() => removePhrase('prohibited_phrases', i)}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Encouraged phrases */}
          <div className="space-y-2">
            <Label>Encouraged Phrases</Label>
            <p className="text-xs text-muted-foreground">{`Brand-aligned language ${AI_ASSISTANT_NAME_DEFAULT} should prefer`}</p>
            <div className="flex gap-2">
              <Input value={newEncouraged} onChange={e => setNewEncouraged(e.target.value)} placeholder="Add phrase..."
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPhrase('encouraged_phrases', newEncouraged); }}}
              />
              <Button size="icon" variant="outline" onClick={() => addPhrase('encouraged_phrases', newEncouraged)}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.encouraged_phrases.map((p, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {p}
                  <button onClick={() => removePhrase('encouraged_phrases', i)}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {upsert.isPending ? 'Saving...' : 'Save Personality'}
        </Button>
      </div>
    </div>
  );
}
