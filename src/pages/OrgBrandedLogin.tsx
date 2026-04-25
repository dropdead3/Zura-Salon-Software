import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Eye, EyeOff, Download, Monitor, User, Users } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationBySlug } from '@/hooks/useOrganizations';
import { OrganizationLogo } from '@/components/brand/OrganizationLogo';
import { OrgLoginPinPad } from '@/components/auth/OrgLoginPinPad';
import { OrgLoginUserGrid } from '@/components/auth/OrgLoginUserGrid';
import { OrgLoginRecentTiles } from '@/components/auth/OrgLoginRecentTiles';
import { LockoutCountdown } from '@/components/auth/LockoutCountdown';
import { useOrgValidatePin, useOrgTeamForLogin } from '@/hooks/useOrgPinValidation';
import { useSessionLockout } from '@/hooks/useSessionLockout';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { formatDisplayName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { PLATFORM_NAME } from '@/lib/brand';
import {
  getRecentUsers,
  pushRecentUser,
  forgetRecentUser,
  type RememberedDeviceUser,
} from '@/lib/orgLoginDeviceMemory';
import NotFound from '@/pages/NotFound';

const emailSchema = z.string().trim().email({ message: 'Please enter a valid email address' });

type DeviceMode = 'shared' | 'personal';

function getDeviceModeKey(orgId: string) {
  return `org-login-device-mode:${orgId}`;
}

function getRememberedUserKey(orgId: string) {
  return `org-login-remembered-user:${orgId}`;
}

interface RememberedUser {
  user_id: string;
  display_name: string;
  photo_url: string | null;
}

/**
 * Per-organization branded login surface.
 *
 * URL: /org/:orgSlug/login
 *
 * Behavior:
 *   - Cold start (no session): inline email + password under the org logo.
 *   - Returning user, personal device: avatar + 4-digit PIN entry only.
 *   - Returning user, shared device: avatar grid → tap → PIN.
 *   - Installable as a per-org PWA via dynamic manifest endpoint.
 *
 * Lives OUTSIDE OrganizationProvider per the public/private route isolation
 * canon — uses provider-free hooks only.
 */
export default function OrgBrandedLogin() {
  const { orgSlug, locationId } = useParams<{ orgSlug: string; locationId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signIn, user, authReady, signOut } = useAuth();
  const { data: organization, isLoading: orgLoading, error: orgError } = useOrganizationBySlug(orgSlug);
  const { isInstallable, isIOS, install } = usePWAInstall();

  // Where to land after auth
  const from = (location.state as any)?.from?.pathname as string | undefined;
  const dashboardHome = orgSlug ? `/org/${orgSlug}/dashboard` : '/dashboard';
  const redirectTarget = from && from.startsWith(`/org/${orgSlug}/`) ? from : dashboardHome;

  // Device-mode state
  const [deviceMode, setDeviceMode] = useState<DeviceMode | null>(null);
  const [showDeviceModeDialog, setShowDeviceModeDialog] = useState(false);

  // Cold-start form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forceFullForm, setForceFullForm] = useState(false);

  // PIN state
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);
  // Lockout window survives refresh / iPad sleep via sessionStorage so a
  // staffer can't bypass the rate limit by reloading the PWA.
  const { lockoutUntil: pinLockoutUntil, setLockoutUntil: setPinLockoutUntil } =
    useSessionLockout(organization?.id);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [rememberedUser, setRememberedUser] = useState<RememberedUser | null>(null);
  const [recents, setRecents] = useState<RememberedDeviceUser[]>([]);
  const [recentsBypassed, setRecentsBypassed] = useState(false);
  const [recentSelected, setRecentSelected] = useState<RememberedDeviceUser | null>(null);

  const validatePin = useOrgValidatePin(organization?.id);
  const { data: teamMembers = [] } = useOrgTeamForLogin(
    organization?.id && deviceMode === 'shared' ? organization.id : null,
    locationId ?? null,
  );

  // Load device mode + remembered user + recents from localStorage once org resolves
  useEffect(() => {
    if (!organization?.id) return;
    const mode = localStorage.getItem(getDeviceModeKey(organization.id)) as DeviceMode | null;
    if (mode === 'shared' || mode === 'personal') {
      setDeviceMode(mode);
    }
    const remembered = localStorage.getItem(getRememberedUserKey(organization.id));
    if (remembered) {
      try {
        setRememberedUser(JSON.parse(remembered));
      } catch {
        // ignore malformed
      }
    }
    if (orgSlug) setRecents(getRecentUsers(orgSlug));
  }, [organization?.id, orgSlug]);

  // First time on this device → ask shared vs personal (only if a user is signed in,
  // since cold-start doesn't need the choice yet)
  useEffect(() => {
    if (!organization?.id || !user || deviceMode !== null) return;
    setShowDeviceModeDialog(true);
  }, [organization?.id, user, deviceMode]);

  const handleChooseDeviceMode = (mode: DeviceMode) => {
    if (!organization?.id) return;
    localStorage.setItem(getDeviceModeKey(organization.id), mode);
    setDeviceMode(mode);
    setShowDeviceModeDialog(false);
    // If the chooser was opened immediately after a cold-start signin, the
    // navigation was deferred — complete it now that the choice is recorded.
    if (user) {
      navigate(redirectTarget, { replace: true });
    }
  };

  const handleResetDeviceMode = () => {
    if (!organization?.id) return;
    localStorage.removeItem(getDeviceModeKey(organization.id));
    localStorage.removeItem(getRememberedUserKey(organization.id));
    setDeviceMode(null);
    setRememberedUser(null);
    setShowDeviceModeDialog(true);
  };

  // Submit handlers
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    const valid = emailSchema.safeParse(email);
    if (!valid.success) {
      setEmailError(valid.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ variant: 'destructive', title: 'Sign in failed', description: error.message });
        return;
      }
      sonnerToast.success(`Welcome to ${organization?.name ?? 'your dashboard'}`);
      // If device mode hasn't been chosen yet, surface the dialog and let the
      // user pick before navigating away — otherwise the page unmounts and the
      // chooser is never seen. Navigation happens on dialog close.
      if (organization?.id && !localStorage.getItem(getDeviceModeKey(organization.id))) {
        setShowDeviceModeDialog(true);
        return;
      }
      navigate(redirectTarget, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) return;
    if (pinLockoutUntil && Date.now() < pinLockoutUntil) {
      // Inline countdown is the dominant signal — no toast.
      return;
    }
    try {
      const result = await validatePin.mutateAsync(pin);

      // ── Server-side rate limit (per-device or org-wide window) ──
      if (result.kind === 'locked') {
        setPinLockoutUntil(result.lockedUntil.getTime());
        setPinAttempts(0);
        setPin('');
        return;
      }

      // ── PIN didn't match any active staff member ──
      if (result.kind === 'no_match') {
        const next = pinAttempts + 1;
        setPinAttempts(next);
        setPinError(true);
        setTimeout(() => setPinError(false), 500);
        setPin('');
        if (next >= 3) {
          // Local soft-lock at 30s — server-side floor is more permissive
          setPinLockoutUntil(Date.now() + 30_000);
          setPinAttempts(0);
        } else {
          toast({ variant: 'destructive', title: 'Wrong PIN', description: `${3 - next} attempts left.` });
        }
        return;
      }

      const identity = result.identity;

      // Personal mode: PIN must match the currently signed-in user.
      // Shared mode: PIN must match the user the operator tapped.
      const expectedUserId = recentSelected
        ? recentSelected.user_id
        : deviceMode === 'personal'
          ? user?.id
          : selectedUserId;

      if (expectedUserId && identity.user_id !== expectedUserId) {
        setPinError(true);
        setTimeout(() => setPinError(false), 500);
        setPin('');
        toast({
          variant: 'destructive',
          title: 'PIN does not match',
          description:
            deviceMode === 'personal'
              ? 'That PIN belongs to another team member. Use yours or sign in with email.'
              : 'That PIN belongs to a different person.',
        });
        return;
      }

      // Success — remember this user for personal mode
      if (organization?.id && deviceMode === 'personal') {
        const remembered: RememberedUser = {
          user_id: identity.user_id,
          display_name: identity.display_name,
          photo_url: identity.photo_url,
        };
        localStorage.setItem(getRememberedUserKey(organization.id), JSON.stringify(remembered));
      }

      // Always push to per-device recents (used by the household tile picker)
      pushRecentUser(orgSlug, {
        user_id: identity.user_id,
        display_name: identity.display_name,
        photo_url: identity.photo_url,
      });

      sessionStorage.setItem(`pin_unlocked_at:${organization?.id}`, String(Date.now()));
      sonnerToast.success(`Welcome, ${identity.display_name.split(' ')[0]}`);
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      console.error('PIN validation error:', err);
      toast({ variant: 'destructive', title: 'PIN check failed', description: 'Please try again.' });
    }
  };

  const handleSwitchAccount = async () => {
    await signOut();
    setForceFullForm(true);
    setRememberedUser(null);
    if (organization?.id) {
      localStorage.removeItem(getRememberedUserKey(organization.id));
    }
  };

  // ─────────────────────────── Derived (hooks BEFORE early returns) ─────
  // Cache-bust on logo/name change so iOS/CDN don't hold the prior asset.
  // organization is undefined on first render — guard with optional chaining.
  const assetVersion = organization?.updated_at
    ? new Date(organization.updated_at).getTime().toString(36)
    : 'v0';

  const manifestSrc = useMemo(() => {
    const supaUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
    if (!supaUrl || !orgSlug) return undefined;
    const params = new URLSearchParams({ slug: orgSlug, v: assetVersion });
    if (locationId) params.set('loc', locationId);
    return `${supaUrl}/functions/v1/org-manifest?${params.toString()}`;
  }, [orgSlug, locationId, assetVersion]);

  const splashSrc = useMemo(() => {
    const supaUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
    if (!supaUrl || !orgSlug) return undefined;
    const params = new URLSearchParams({ slug: orgSlug, v: assetVersion });
    if (locationId) params.set('loc', locationId);
    return `${supaUrl}/functions/v1/org-splash?${params.toString()}`;
  }, [orgSlug, locationId, assetVersion]);

  const versionedLogoUrl = useMemo(() => {
    if (!organization?.logo_url) return null;
    const sep = organization.logo_url.includes('?') ? '&' : '?';
    return `${organization.logo_url}${sep}v=${assetVersion}`;
  }, [organization?.logo_url, assetVersion]);

  // ─────────────────────────── Render gates ───────────────────────────

  if (orgLoading || !authReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-white/60" />
      </div>
    );
  }

  if (orgError || !organization || !orgSlug) {
    return <NotFound />;
  }

  // Determine which sub-flow to render
  const sessionUserHere = !!user && !forceFullForm;
  const showRecentsPicker =
    !sessionUserHere && recents.length > 0 && !recentsBypassed && !recentSelected;
  const showRecentsPin = !!recentSelected;
  const showPinFlow = sessionUserHere || (deviceMode === 'shared' && !forceFullForm);
  const showColdForm = !showPinFlow && !showRecentsPicker && !showRecentsPin;

  const orgName = organization.name;
  const themeColor = '#0a0a0a';

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden flex flex-col">
      <Helmet>
        <title>{`Sign in · ${orgName}`}</title>
        <meta name="theme-color" content={themeColor} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={orgName} />
        {manifestSrc && <link rel="manifest" href={manifestSrc} />}
        {versionedLogoUrl && (
          <link rel="apple-touch-icon" href={versionedLogoUrl} />
        )}
        {/* iOS PWA branded splash — single high-res image, iOS scales as needed */}
        {splashSrc && <link rel="apple-touch-startup-image" href={splashSrc} />}
      </Helmet>

      {/* Atmospheric backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />
      </div>

      <main className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-sm space-y-8">
          {/* Hero logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 flex items-center justify-center">
              <OrganizationLogo
                variant="website"
                logoUrl={organization.logo_url}
                theme="dark"
                alt={orgName}
                className="max-h-16 w-auto"
              />
            </div>
            <p className="text-sm text-white/60 font-sans text-center">
              {showRecentsPicker
                ? 'Welcome back — tap your photo'
                : showRecentsPin
                  ? 'Enter your PIN to continue'
                  : showColdForm
                    ? `Sign in to ${orgName}`
                    : sessionUserHere
                      ? 'Enter your PIN to continue'
                      : 'Tap your photo to sign in'}
            </p>
          </div>

          {/* RECENT-ON-DEVICE TILE PICKER (1–3 faces) */}
          {showRecentsPicker && (
            <div className="space-y-5">
              <OrgLoginRecentTiles
                users={recents}
                onSelect={(u) => {
                  setRecentSelected(u);
                  setPin('');
                }}
                onForget={(uid) => {
                  forgetRecentUser(orgSlug, uid);
                  const next = getRecentUsers(orgSlug);
                  setRecents(next);
                  if (next.length === 0) setRecentsBypassed(true);
                }}
              />
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setRecentsBypassed(true)}
                  className="text-xs text-white/50 hover:text-white/80 transition-colors font-sans"
                >
                  Not you? Sign in with email
                </button>
              </div>
            </div>
          )}

          {/* RECENTS → PIN ENTRY for the picked face */}
          {showRecentsPin && recentSelected && (
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                  {recentSelected.photo_url ? (
                    <img src={recentSelected.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-white/60" />
                  )}
                </div>
                <p className="text-base text-white font-sans">{recentSelected.display_name}</p>
              </div>

              {pinLockoutUntil && pinLockoutUntil > Date.now() && (
                <LockoutCountdown until={pinLockoutUntil} onExpire={() => setPinLockoutUntil(null)} />
              )}

              <OrgLoginPinPad
                value={pin}
                onChange={setPin}
                onSubmit={handlePinSubmit}
                disabled={validatePin.isPending || (!!pinLockoutUntil && pinLockoutUntil > Date.now())}
                errorShake={pinError}
              />

              <button
                type="button"
                onClick={() => {
                  setRecentSelected(null);
                  setPin('');
                }}
                className="text-xs text-white/50 hover:text-white/80 transition-colors font-sans flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </div>
          )}

          {/* COLD-START EMAIL + PASSWORD */}
          {showColdForm && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80 font-sans">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-violet-500"
                />
                {emailError && <p className="text-xs text-red-400">{emailError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/80 font-sans">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 pr-10 focus-visible:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-sans"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
              </Button>

              <div className="flex items-center justify-between text-xs text-white/50 font-sans">
                <Link
                  to={`/login`}
                  state={{ from: { pathname: redirectTarget } }}
                  className="hover:text-white/80 transition-colors"
                >
                  Use platform login
                </Link>
                {forceFullForm && rememberedUser && (
                  <button
                    type="button"
                    onClick={() => setForceFullForm(false)}
                    className="hover:text-white/80 transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" /> Back to PIN
                  </button>
                )}
              </div>
            </form>
          )}

          {/* PIN FLOW: PERSONAL MODE — current session user */}
          {showPinFlow && deviceMode !== 'shared' && sessionUserHere && (
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                  {rememberedUser?.photo_url ? (
                    <img src={rememberedUser.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-white/60" />
                  )}
                </div>
                <p className="text-base text-white font-sans">
                  {rememberedUser?.display_name ?? user?.email ?? 'Welcome back'}
                </p>
              </div>

              {pinLockoutUntil && pinLockoutUntil > Date.now() && (
                <LockoutCountdown until={pinLockoutUntil} onExpire={() => setPinLockoutUntil(null)} />
              )}

              <OrgLoginPinPad
                value={pin}
                onChange={setPin}
                onSubmit={handlePinSubmit}
                disabled={validatePin.isPending || (!!pinLockoutUntil && pinLockoutUntil > Date.now())}
                errorShake={pinError}
              />

              <button
                type="button"
                onClick={handleSwitchAccount}
                className="text-xs text-white/50 hover:text-white/80 transition-colors font-sans"
              >
                Not you? Sign in as someone else
              </button>
            </div>
          )}

          {/* PIN FLOW: SHARED MODE */}
          {showPinFlow && deviceMode === 'shared' && (
            <div className="space-y-6">
              {!selectedUserId ? (
                <OrgLoginUserGrid
                  members={teamMembers}
                  recentUserIds={recents.map((r) => r.user_id)}
                  onSelect={setSelectedUserId}
                />

              ) : (
                <div className="flex flex-col items-center gap-6">
                  {(() => {
                    const m = teamMembers.find((x) => x.user_id === selectedUserId);
                    if (!m) return null;
                    const name = formatDisplayName(m.full_name, m.display_name);
                    return (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                          {m.photo_url ? (
                            <img src={m.photo_url} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-8 h-8 text-white/60" />
                          )}
                        </div>
                        <p className="text-base text-white font-sans">{name}</p>
                      </div>
                    );
                  })()}

                  {pinLockoutUntil && pinLockoutUntil > Date.now() && (
                    <LockoutCountdown until={pinLockoutUntil} onExpire={() => setPinLockoutUntil(null)} />
                  )}

                  <OrgLoginPinPad
                    value={pin}
                    onChange={setPin}
                    onSubmit={handlePinSubmit}
                    disabled={validatePin.isPending || (!!pinLockoutUntil && pinLockoutUntil > Date.now())}
                    errorShake={pinError}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserId(null);
                      setPin('');
                    }}
                    className="text-xs text-white/50 hover:text-white/80 transition-colors font-sans flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" /> Choose another person
                  </button>
                </div>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setForceFullForm(true)}
                  className="text-xs text-white/50 hover:text-white/80 transition-colors font-sans"
                >
                  Sign in with email instead
                </button>
              </div>
            </div>
          )}

          {/* Install + device-mode footer */}
          <div className="pt-4 border-t border-white/5 flex flex-col items-center gap-3">
            {(isInstallable || isIOS) && (
              <button
                type="button"
                onClick={() => {
                  if (isInstallable) {
                    install();
                  } else {
                    sonnerToast.info('On iPhone/iPad: Share → Add to Home Screen');
                  }
                }}
                className="flex items-center gap-2 text-xs text-white/60 hover:text-white/90 transition-colors font-sans"
              >
                <Download className="w-3.5 h-3.5" />
                Install {orgName} as an app
              </button>
            )}
            {deviceMode && (
              <button
                type="button"
                onClick={handleResetDeviceMode}
                className="text-[11px] text-white/30 hover:text-white/60 transition-colors font-sans flex items-center gap-1.5"
              >
                {deviceMode === 'shared' ? <Users className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                {deviceMode === 'shared' ? 'Shared device' : 'Personal device'} · change
              </button>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center">
        <p className="text-[11px] text-white/30 font-sans tracking-wide">
          Powered by {PLATFORM_NAME}
        </p>
      </footer>

      {/* Device-mode chooser */}
      <Dialog open={showDeviceModeDialog} onOpenChange={(open) => {
        // Don't allow dismissal without a choice if no mode set yet
        if (!open && deviceMode === null) return;
        setShowDeviceModeDialog(open);
      }}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide text-white">
              How should this device behave?
            </DialogTitle>
            <DialogDescription className="text-white/60 font-sans">
              We'll remember your choice on this browser.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-2">
            <button
              type="button"
              onClick={() => handleChooseDeviceMode('personal')}
              className="text-left p-4 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-colors"
            >
              <div className="flex items-center gap-3 mb-1">
                <Monitor className="w-5 h-5 text-violet-400" />
                <span className="font-display tracking-wide text-white">Personal device</span>
              </div>
              <p className="text-xs text-white/60 font-sans">
                Just me. Skip directly to my PIN. Best for your own laptop.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleChooseDeviceMode('shared')}
              className="text-left p-4 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-colors"
            >
              <div className="flex items-center gap-3 mb-1">
                <Users className="w-5 h-5 text-violet-400" />
                <span className="font-display tracking-wide text-white">Shared device</span>
              </div>
              <p className="text-xs text-white/60 font-sans">
                Multiple people use this. Show everyone, tap a face, enter PIN. Best for the front desk iPad.
              </p>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
