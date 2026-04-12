import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Link, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeepLink {
  id: string;
  label: string;
  location?: string;
  stylist?: string;
  service?: string;
  category?: string;
  consultation?: boolean;
}

interface BookingLinkConfiguratorProps {
  bookingUrl: string;
  locations?: { id: string; name: string }[];
  stylists?: { id: string; name: string }[];
  services?: { name: string; category: string }[];
}

export function BookingLinkConfigurator({ bookingUrl, locations = [], stylists = [], services = [] }: BookingLinkConfiguratorProps) {
  const [links, setLinks] = useState<DeepLink[]>([]);

  const addLink = () => {
    setLinks([...links, { id: crypto.randomUUID(), label: '' }]);
  };

  const removeLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
  };

  const updateLink = (id: string, field: keyof DeepLink, value: string | boolean) => {
    setLinks(links.map((l) => l.id === id ? { ...l, [field]: value } : l));
  };

  const buildUrl = (link: DeepLink) => {
    const params = new URLSearchParams();
    if (link.location) params.set('location', link.location);
    if (link.stylist) params.set('stylist', link.stylist);
    if (link.service) params.set('service', link.service);
    if (link.category) params.set('category', link.category);
    if (link.consultation) params.set('consultation', 'true');
    const qs = params.toString();
    return qs ? `${bookingUrl}?${qs}` : bookingUrl;
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  const categories = useMemo(() => {
    const cats = new Set(services.map(s => s.category));
    return Array.from(cats);
  }, [services]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-base tracking-wide">DEEP LINKS</CardTitle>
            <CardDescription>Create targeted booking links for your website buttons</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addLink}>
            <Plus className="w-4 h-4 mr-1" /> Add Link
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {links.length === 0 && (
          <div className="text-center py-8">
            <Link className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No deep links configured yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Create links like "Book Extensions" or "Book with Kayla" for your website.</p>
          </div>
        )}

        {links.map((link) => {
          const url = buildUrl(link);
          return (
            <div key={link.id} className="p-4 rounded-xl border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Link label, e.g. Book Extensions"
                  value={link.label}
                  onChange={(e) => updateLink(link.id, 'label', e.target.value)}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" onClick={() => removeLink(link.id)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {locations.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <Select value={link.location || ''} onValueChange={(v) => updateLink(link.id, 'location', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {stylists.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Stylist</Label>
                    <Select value={link.stylist || ''} onValueChange={(v) => updateLink(link.id, 'stylist', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        {stylists.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {categories.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <Select value={link.category || ''} onValueChange={(v) => updateLink(link.id, 'category', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {services.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Service</Label>
                    <Select value={link.service || ''} onValueChange={(v) => updateLink(link.id, 'service', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                      <SelectContent>
                        {services.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                <Input value={url} readOnly className="font-mono text-xs flex-1 h-8 bg-transparent border-0" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyUrl(url)}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
