import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { BookingSurfaceHosted } from '@/hooks/useBookingSurfaceConfig';

interface BookingHostedPageEditorProps {
  hosted: BookingSurfaceHosted;
  slug: string;
  onChange: (hosted: BookingSurfaceHosted) => void;
  onSlugChange: (slug: string) => void;
}

export function BookingHostedPageEditor({ hosted, slug, onChange, onSlugChange }: BookingHostedPageEditorProps) {
  const [draft, setDraft] = useState(hosted);
  const [draftSlug, setDraftSlug] = useState(slug);

  const bookingUrl = `${window.location.origin}/book/${draftSlug}`;

  const handleSave = () => {
    onSlugChange(draftSlug);
    onChange(draft);
  };

  const addFaqItem = () => {
    setDraft({ ...draft, faqItems: [...draft.faqItems, { q: '', a: '' }] });
  };

  const removeFaqItem = (index: number) => {
    setDraft({ ...draft, faqItems: draft.faqItems.filter((_, i) => i !== index) });
  };

  const updateFaqItem = (index: number, field: 'q' | 'a', value: string) => {
    const items = [...draft.faqItems];
    items[index] = { ...items[index], [field]: value };
    setDraft({ ...draft, faqItems: items });
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast.success('Booking URL copied');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base tracking-wide">HOSTED PAGE</CardTitle>
        <CardDescription>Configure the content of your standalone booking page</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Slug */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Page Slug</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{window.location.origin}/book/</span>
            <Input
              value={draftSlug}
              onChange={(e) => setDraftSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="your-salon"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={copyUrl}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy Link
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Page
              </a>
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Page Title</Label>
          <Input
            value={draft.pageTitle}
            onChange={(e) => setDraft({ ...draft, pageTitle: e.target.value })}
            placeholder="Book an Appointment"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Intro Text (optional)</Label>
          <Textarea
            value={draft.introText || ''}
            onChange={(e) => setDraft({ ...draft, introText: e.target.value || null })}
            placeholder="Welcome! Browse our services and book your next appointment."
            rows={3}
          />
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Show Hero Image</p>
              <p className="text-xs text-muted-foreground">Display a hero banner at the top of the page</p>
            </div>
            <Switch
              checked={draft.showHero}
              onCheckedChange={(v) => setDraft({ ...draft, showHero: v })}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Show FAQ Section</p>
              <p className="text-xs text-muted-foreground">Display frequently asked questions below booking</p>
            </div>
            <Switch
              checked={draft.showFaq}
              onCheckedChange={(v) => setDraft({ ...draft, showFaq: v })}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Show "Powered by Zura"</p>
              <p className="text-xs text-muted-foreground">Display a subtle powered-by badge at the bottom</p>
            </div>
            <Switch
              checked={draft.poweredByVisible}
              onCheckedChange={(v) => setDraft({ ...draft, poweredByVisible: v })}
            />
          </div>
        </div>

        {/* FAQ Builder */}
        {draft.showFaq && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">FAQ Items</Label>
              <Button variant="outline" size="sm" onClick={addFaqItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add
              </Button>
            </div>
            {draft.faqItems.map((item, i) => (
              <div key={i} className="p-3 rounded-lg border border-border space-y-2">
                <div className="flex items-start gap-2">
                  <Input
                    value={item.q}
                    onChange={(e) => updateFaqItem(i, 'q', e.target.value)}
                    placeholder="Question"
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeFaqItem(i)}>
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
                <Textarea
                  value={item.a}
                  onChange={(e) => updateFaqItem(i, 'a', e.target.value)}
                  placeholder="Answer"
                  rows={2}
                />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Policy Text (optional)</Label>
          <Textarea
            value={draft.policyText || ''}
            onChange={(e) => setDraft({ ...draft, policyText: e.target.value || null })}
            placeholder="Cancellation policy, deposit requirements, etc."
            rows={3}
          />
        </div>

        <Button onClick={handleSave} className="w-full sm:w-auto">
          Save Page Settings
        </Button>
      </CardContent>
    </Card>
  );
}
