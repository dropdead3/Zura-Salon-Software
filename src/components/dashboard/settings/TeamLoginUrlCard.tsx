import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Copy, ExternalLink, QrCode, Smartphone, Sparkles, Loader2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLocations } from '@/hooks/useLocations';
import { useGenerateOrgSplash } from '@/hooks/useGenerateOrgSplash';

/**
 * Team Login URL — Settings → Brand Assets card.
 *
 * Owners share/bookmark this URL on team devices. Once installed as a PWA,
 * staff sign in with their PIN — no password each time.
 *
 * Optional per-location URL (/org/:slug/loc/:locId/login) so a Mesa iPad's
 * avatar grid only shows Mesa staff.
 */
export function TeamLoginUrlCard() {
  const { effectiveOrganization } = useOrganizationContext();
  const { data: locations = [] } = useLocations();
  const [scope, setScope] = useState<string>('org'); // 'org' | locationId
  const generateSplash = useGenerateOrgSplash();

  const orgSlug = effectiveOrganization?.slug;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const url = useMemo(() => {
    if (!orgSlug) return '';
    if (scope === 'org') return `${origin}/org/${orgSlug}/login`;
    return `${origin}/org/${orgSlug}/loc/${scope}/login`;
  }, [origin, orgSlug, scope]);

  const scopeLabel = useMemo(() => {
    if (scope === 'org') return 'Whole organization';
    return locations.find((l) => l.id === scope)?.name ?? 'Location';
  }, [scope, locations]);

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Login URL copied');
    } catch {
      toast.error('Could not copy — long-press the URL field to copy manually');
    }
  };

  if (!orgSlug) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-base tracking-wide">TEAM LOGIN URL</CardTitle>
              <CardDescription className="font-sans">
                Bookmark this on team devices or install it as an app. Your team enters their PIN — no password each time.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {locations.length > 1 && (
          <div className="space-y-2">
            <Label className="font-sans text-xs text-muted-foreground">Scope</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="font-sans">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org">Whole organization (all staff)</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} only
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground font-sans">
              Per-location URLs show only staff assigned to that location — useful when shared-mode would otherwise list 30+ faces.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="font-sans text-xs text-muted-foreground">URL</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              className="shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Open
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-5 items-start pt-2 border-t border-border">
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white p-3 rounded-lg border border-border">
              <QRCodeCanvas value={url || origin} size={140} level="M" />
            </div>
            <span className="text-[11px] text-muted-foreground font-sans flex items-center gap-1">
              <QrCode className="w-3 h-3" /> Scan to open
            </span>
          </div>
          <div className="space-y-2 pt-1">
            <p className="text-sm font-sans text-foreground">
              How to install on the {scopeLabel.toLowerCase()} iPad
            </p>
            <ol className="text-xs text-muted-foreground font-sans space-y-1 list-decimal list-inside">
              <li>Scan the QR code with the iPad camera, or open the URL in Safari.</li>
              <li>Tap the <span className="font-medium text-foreground">Share</span> icon, then <span className="font-medium text-foreground">Add to Home Screen</span>.</li>
              <li>From now on, opening the app skips email — staff just tap a face and enter their PIN.</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
