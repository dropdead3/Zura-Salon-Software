import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { BookingSurfaceHosted } from '@/hooks/useBookingSurfaceConfig';

interface BookingHostedPageEditorProps {
  hosted: BookingSurfaceHosted;
  onChange: (hosted: BookingSurfaceHosted) => void;
}

export function BookingHostedPageEditor({ hosted, onChange }: BookingHostedPageEditorProps) {
  const [draft, setDraft] = useState(hosted);

  const handleSave = () => onChange(draft);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base tracking-wide">HOSTED PAGE</CardTitle>
        <CardDescription>Configure the content of your standalone booking page</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Policy Text (optional)</Label>
          <Textarea
            value={draft.policyText || ''}
            onChange={(e) => setDraft({ ...draft, policyText: e.target.value || null })}
            placeholder="Cancellation policy, deposit requirements, etc."
            rows={3}
          />
        </div>

        <div className="space-y-3">
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

        <Button onClick={handleSave} className="w-full sm:w-auto">
          Save Page Settings
        </Button>
      </CardContent>
    </Card>
  );
}
