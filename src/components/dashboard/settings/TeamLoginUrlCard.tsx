import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Copy,
  ExternalLink,
  QrCode,
  Smartphone,
  Sparkles,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useLocations } from '@/hooks/useLocations';
import { useGenerateOrgSplash, useOrgSplashDrift } from '@/hooks/useGenerateOrgSplash';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import { useClearDeviceLockout } from '@/hooks/useClearDeviceLockout';
import { useSessionLockout } from '@/hooks/useSessionLockout';
import { getDeviceFingerprint } from '@/lib/deviceFingerprint';

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
  const drift = useOrgSplashDrift();
  const { data: isPrimaryOwner = false } = useIsPrimaryOwner();
  const clearLockout = useClearDeviceLockout();
  const { clearLockout: clearLocalLockout } = useSessionLockout(effectiveOrganization?.id);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const deviceFp = useMemo(() => getDeviceFingerprint(), []);
  const fpPreview = deviceFp ? `${deviceFp.slice(0, 8)}…` : 'unknown';

  const handleClearLockout = async () => {
    if (!effectiveOrganization?.id) return;
    try {
      const res = await clearLockout.mutateAsync({
        organizationId: effectiveOrganization.id,
        surface: 'login',
      });
      clearLocalLockout();
      setOverrideOpen(false);
      toast.success(
        res.clearedCount > 0
          ? `Lockout cleared on this device (${res.clearedCount} attempt${res.clearedCount === 1 ? '' : 's'} removed)`
          : 'No active lockout on this device — already clear',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not clear lockout';
      toast.error(message);
    }
  };

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

  // Preferred preview source: just-generated dataUrl (always fresh) →
  // cached storage URL → null (empty state).
  const previewSrc = generateSplash.data?.dataUrl ?? drift.cachedUrl ?? null;
  const hasLogo = !!effectiveOrganization?.logo_url;

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

        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-sans text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Branded PWA splash (Android & Chrome)
              </p>
              <p className="text-xs text-muted-foreground font-sans">
                iOS Safari already shows a branded splash from your logo. Generate a raster version for staff installing on Android, Chrome, Edge, or Firefox so they get the same launch experience.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => generateSplash.mutate()}
              disabled={generateSplash.isPending || !hasLogo}
              className="shrink-0 font-sans"
            >
              {generateSplash.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  {drift.cachedUrl || generateSplash.isSuccess ? 'Regenerate splash' : 'Generate splash'}
                </>
              )}
            </Button>
          </div>

          {!hasLogo && (
            <p className="text-xs text-muted-foreground font-sans italic">
              Upload an organization logo first — the splash uses it as the centerpiece.
            </p>
          )}

          {/* Drift nudge — surfaces only when cached file is stale relative to current logo/theme/name */}
          {hasLogo && drift.isDrifted && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-xs text-foreground font-sans">
                  Your logo, name, or theme changed since this splash was generated. New PWA installs will show the old version until you regenerate.
                </p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => generateSplash.mutate()}
                  disabled={generateSplash.isPending}
                  className="h-auto p-0 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400"
                >
                  Regenerate now →
                </Button>
              </div>
            </div>
          )}

          {/* Preview pane */}
          {hasLogo && (
            <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-4 items-start pt-2">
              <div className="flex flex-col items-center gap-1.5">
                {drift.isLoading && !previewSrc ? (
                  <Skeleton className="w-[108px] h-[192px] rounded-lg" />
                ) : previewSrc ? (
                  <a
                    href={previewSrc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-[108px] h-[192px] rounded-lg overflow-hidden bg-black border border-border hover:border-primary/40 transition-colors"
                    title="Open full size"
                  >
                    <img
                      src={previewSrc}
                      alt="PWA splash preview"
                      className="w-full h-full object-cover"
                    />
                  </a>
                ) : (
                  <div className="w-[108px] h-[192px] rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30">
                    <span className="text-[10px] text-muted-foreground font-sans text-center px-2">
                      No splash yet
                    </span>
                  </div>
                )}
                <span className="text-[10px] text-muted-foreground font-sans">1080 × 1920</span>
              </div>
              <div className="space-y-1 pt-1">
                <p className="text-xs font-sans text-foreground">
                  {previewSrc ? 'Preview' : 'Generate to preview'}
                </p>
                <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                  {previewSrc
                    ? 'What staff will see when launching your installed app on Android or Chrome. Tap to open at full size.'
                    : 'After you generate, the rendered splash will appear here so you can confirm logo placement and brand color before deploying.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
