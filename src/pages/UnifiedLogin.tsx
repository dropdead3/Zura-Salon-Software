import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PLATFORM_NAME, PLATFORM_NAME_FULL } from '@/lib/brand';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { Loader2, ArrowLeft, Eye, EyeOff, Mail, CheckCircle, Shield, Building2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { PlatformLogo } from '@/components/brand/PlatformLogo';
import { LoginShell } from '@/components/auth/LoginShell';
import { AuthFlowLoader } from '@/components/auth/AuthFlowLoader';
import { markAuthFlowActive } from '@/lib/authFlowSentinel';
import { z } from 'zod';
import { useCheckInvitation, useAcceptInvitation } from '@/hooks/useStaffInvitations';
import { useInvitationByToken, useAcceptPlatformInvitation } from '@/hooks/usePlatformInvitations';
import { useDebounce } from '@/hooks/use-debounce';
import { useRoleUtils } from '@/hooks/useRoleUtils';
import { supabase } from '@/integrations/supabase/client';

import type { Database } from '@/integrations/supabase/types';


type AppRole = Database['public']['Enums']['app_role'];

const emailSchema = z.string().trim().email({ message: 'Please enter a valid email address' });

async function getCustomLandingPage(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('custom_landing_page')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return null;
    return data?.custom_landing_page || null;
  } catch {
    return null;
  }
}

interface DualRoleOrg {
  slug: string;
  name: string;
  logo_url: string | null;
}

interface DualRoleInfo {
  hasPlatformRoles: boolean;
  hasOrgMembership: boolean;
  orgs: DualRoleOrg[];
}

async function checkDualRoleStatus(userId: string): Promise<DualRoleInfo> {
  const [platformResult, employeeResult, adminResult] = await Promise.all([
    supabase.from('platform_roles').select('role').eq('user_id', userId).limit(1),
    supabase
      .from('employee_profiles')
      .select('organization_id, organizations:organization_id (slug, name, logo_url)')
      .eq('user_id', userId),
    supabase
      .from('organization_admins')
      .select('organization_id, organizations:organization_id (slug, name, logo_url)')
      .eq('user_id', userId),
  ]);

  const hasPlatformRoles = !!(platformResult.data && platformResult.data.length > 0);

  const orgMap = new Map<string, DualRoleOrg>();
  employeeResult.data?.forEach((row: any) => {
    if (row.organization_id && row.organizations) {
      orgMap.set(row.organization_id, {
        slug: row.organizations.slug,
        name: row.organizations.name,
        logo_url: row.organizations.logo_url ?? null,
      });
    }
  });
  adminResult.data?.forEach((row: any) => {
    if (row.organization_id && row.organizations && !orgMap.has(row.organization_id)) {
      orgMap.set(row.organization_id, {
        slug: row.organizations.slug,
        name: row.organizations.name,
        logo_url: row.organizations.logo_url ?? null,
      });
    }
  });

  const orgs = Array.from(orgMap.values());
  return { hasPlatformRoles, hasOrgMembership: orgs.length > 0, orgs };
}

async function getDualRolePreference(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('dual_role_destination')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return null;
    return (data as any)?.dual_role_destination || null;
  } catch {
    return null;
  }
}

async function saveDualRolePreference(userId: string, destination: string | null): Promise<void> {
  await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        dual_role_destination: destination,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'user_id' }
    );
}

async function getUserRedirectPath(userId: string, fallback: string): Promise<string> {
  // Check for platform roles first
  const { data: platformRoles } = await supabase
    .from('platform_roles')
    .select('role')
    .eq('user_id', userId)
    .limit(1);

  if (platformRoles && platformRoles.length > 0) {
    return '/platform/overview';
  }

  // Check for custom landing page
  const customLanding = await getCustomLandingPage(userId);
  if (customLanding) return customLanding;

  return fallback;
}

/** Contextual subtitle based on referral source */
function getContextualSubtitle(
  fromPathname: string | undefined,
  hasStaffInvitation: boolean,
): string {
  if (hasStaffInvitation) return 'Sign in to join your team';
  if (fromPathname?.startsWith('/platform')) return `Sign in to the ${PLATFORM_NAME} Platform`;
  if (fromPathname?.match(/^\/org\/[^/]+\/dashboard/)) return 'Sign in to manage your organization';
  return 'Sign in to access your dashboard';
}

export default function UnifiedLogin() {
  const [searchParams] = useSearchParams();
  const platformInvitationToken = searchParams.get('invitation');

  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AppRole>('stylist');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const passwordMatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPasswordMatchStateRef = useRef<boolean | null>(null);

  // Dual-role interstitial state
  const [dualRoleInfo, setDualRoleInfo] = useState<DualRoleInfo | null>(null);
  const [showDualRoleInterstitial, setShowDualRoleInterstitial] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(false);

  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const acceptStaffInvitation = useAcceptInvitation();
  const { roleOptions } = useRoleUtils();

  /**
   * Navigate to a post-auth destination. Marks the auth-flow sentinel so
   * the dashboard's loader stack renders <AuthFlowLoader /> on the same
   * slate-950 canvas instead of flashing the theme-driven BootLuxeLoader.
   */
  const navigateAuthenticated = useCallback(
    (path: string) => {
      markAuthFlowActive();
      navigateAuthenticated(path);
    },
    [navigate],
  );


  // Staff invitation check
  const debouncedEmail = useDebounce(email, 500);
  const { data: staffInvitation, isLoading: checkingStaffInvitation } = useCheckInvitation(debouncedEmail);

  // Platform invitation check
  const { data: platformInvitation, isLoading: loadingPlatformInvitation } = useInvitationByToken(platformInvitationToken);
  const acceptPlatformInvitation = useAcceptPlatformInvitation();

  const from = location.state?.from?.pathname || '/dashboard';

  // Sign-up gating: only show sign-up when invitation is present
  const canSignUp = !!staffInvitation || !!platformInvitationToken;

  // Contextual subtitle
  const contextualSubtitle = useMemo(
    () => getContextualSubtitle(location.state?.from?.pathname, !!staffInvitation),
    [location.state?.from?.pathname, staffInvitation],
  );

  // Show redirect message as toast (e.g. "Please sign in to access your dashboard")
  useEffect(() => {
    const message = location.state?.message;
    if (message && typeof message === 'string') {
      sonnerToast.info(message);
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location.state?.message, location.pathname, location.search, navigate]);

  // Set signup mode if platform invitation
  useEffect(() => {
    if (platformInvitation && platformInvitation.status === 'pending') {
      setEmail(platformInvitation.email);
      setIsLogin(false);
    }
  }, [platformInvitation]);

  // Staff invitation role auto-set
  useEffect(() => {
    if (staffInvitation && !isLogin) {
      setRole(staffInvitation.role);
    }
  }, [staffInvitation, isLogin]);

  // If already logged in, redirect based on role (with dual-role check)
  useEffect(() => {
    const checkAccess = async () => {
      if (!user) return;
      setCheckingAccess(true);

      // Accept platform invitation if present
      if (platformInvitationToken && platformInvitation?.status === 'pending') {
        try {
          await acceptPlatformInvitation.mutateAsync({
            token: platformInvitationToken,
            userId: user.id,
          });
          sonnerToast.success('Welcome to the platform!');
          navigateAuthenticated('/platform/overview');
          return;
        } catch (error) {
          console.error('Failed to accept platform invitation:', error);
        }
      }

      // Check for dual roles
      const info = await checkDualRoleStatus(user.id);
      if (info.hasPlatformRoles && info.hasOrgMembership) {
        const savedPref = await getDualRolePreference(user.id);
        if (savedPref === 'platform') {
          navigateAuthenticated('/platform/overview');
          return;
        }
        if (savedPref?.startsWith('org_dashboard:')) {
          const slug = savedPref.split(':')[1];
          navigateAuthenticated(slug ? `/org/${slug}/dashboard` : '/dashboard');
          return;
        }
        // Legacy format
        if (savedPref === 'org_dashboard' && info.orgs.length > 0) {
          navigateAuthenticated(`/org/${info.orgs[0].slug}/dashboard`);
          return;
        }
        setDualRoleInfo(info);
        setShowDualRoleInterstitial(true);
        setCheckingAccess(false);
        return;
      }

      const redirectPath = await getUserRedirectPath(user.id, from);
      navigateAuthenticated(redirectPath);
    };

    checkAccess();
  }, [user, navigate, platformInvitationToken, platformInvitation]);

  const showPasswordMatchToast = useCallback((matches: boolean) => {
    if (lastPasswordMatchStateRef.current === matches) return;
    lastPasswordMatchStateRef.current = matches;
    if (matches) {
      toast({ title: 'Passwords match', description: "You're all set!" });
    } else {
      toast({ variant: 'destructive', title: 'Passwords do not match', description: 'Please make sure both passwords are identical.' });
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    const emailValidation = emailSchema.safeParse(email);
    if (!emailValidation.success) {
      setEmailError(emailValidation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await resetPassword(email);
        if (error) {
          toast({ variant: 'destructive', title: 'Reset failed', description: error.message });
        } else {
          toast({ title: 'Check your email', description: 'We sent you a password reset link.' });
          setIsForgotPassword(false);
        }
      } else if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ variant: 'destructive', title: 'Login failed', description: error.message });
        } else {
          const { data: { user: loggedInUser } } = await supabase.auth.getUser();
          if (loggedInUser) {
            // Accept platform invitation if present
            if (platformInvitationToken && platformInvitation?.status === 'pending') {
              try {
                await acceptPlatformInvitation.mutateAsync({
                  token: platformInvitationToken,
                  userId: loggedInUser.id,
                });
                sonnerToast.success('Welcome to the platform!');
                navigateAuthenticated('/platform/overview');
                return;
              } catch (error) {
                console.error('Failed to accept platform invitation:', error);
              }
            }

            // Check for dual roles before redirecting
            const info = await checkDualRoleStatus(loggedInUser.id);
            if (info.hasPlatformRoles && info.hasOrgMembership) {
              const savedPref = await getDualRolePreference(loggedInUser.id);
              if (savedPref === 'platform') {
                navigateAuthenticated('/platform/overview');
                return;
              }
              if (savedPref?.startsWith('org_dashboard:')) {
                const slug = savedPref.split(':')[1];
                navigateAuthenticated(slug ? `/org/${slug}/dashboard` : '/dashboard');
                return;
              }
              if (savedPref === 'org_dashboard' && info.orgs.length > 0) {
                navigateAuthenticated(`/org/${info.orgs[0].slug}/dashboard`);
                return;
              }
              setDualRoleInfo(info);
              setShowDualRoleInterstitial(true);
              setLoading(false);
              return;
            }

            const redirectPath = await getUserRedirectPath(loggedInUser.id, from);
            navigateAuthenticated(redirectPath);
          }
        }
      } else {
        // Sign up
        if (password !== confirmPassword) {
          toast({ variant: 'destructive', title: 'Passwords do not match', description: 'Please make sure your passwords match.' });
          return;
        }

        const isPlatformSignup = platformInvitationToken && platformInvitation?.status === 'pending';
        const signUpRole = isPlatformSignup ? 'admin' : (staffInvitation?.role || role) as AppRole;

        const { error, data } = await signUp(email, password, fullName, signUpRole);
        if (error) {
          toast({ variant: 'destructive', title: 'Sign up failed', description: error.message });
        } else {
          if (staffInvitation && data?.user) {
            acceptStaffInvitation.mutate({ email, userId: data.user.id });
          }

          if (isPlatformSignup) {
            toast({ title: 'Account created!', description: 'Please check your email to verify your account, then sign in.' });
            setIsLogin(true);
          } else {
            toast({
              title: staffInvitation ? 'Welcome to the team!' : 'Account created',
              description: staffInvitation
                ? `Your account has been created with the ${roleOptions.find(r => r.value === staffInvitation.role)?.label} role.`
                : `Welcome! You've been registered as ${roleOptions.find(r => r.value === role)?.label}.`,
            });
            navigateAuthenticated('/dashboard');
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAccess || loadingPlatformInvitation) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          <p className="text-slate-400 text-sm">
            {loadingPlatformInvitation ? 'Loading invitation...' : 'Checking access...'}
          </p>
        </div>
      </div>
    );
  }

  // Dual-role interstitial
  if (showDualRoleInterstitial && dualRoleInfo) {
    const handleDestinationChoice = async (destination: string, orgSlug?: string) => {
      const prefValue = destination === 'platform' ? 'platform' : `org_dashboard:${orgSlug}`;
      if (rememberChoice && user) {
        await saveDualRolePreference(user.id, prefValue);
      }
      const path = destination === 'platform'
        ? '/platform/overview'
        : orgSlug ? `/org/${orgSlug}/dashboard` : '/dashboard';
      navigateAuthenticated(path);
    };

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 relative z-10">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center mb-6">
                <PlatformLogo variant="login" className="h-10 w-auto" />
              </div>
              <h1 className="text-3xl font-medium text-white tracking-tight">
                Where do you want to go?
              </h1>
              <p className="text-slate-400">
                You have access to both platform administration and {dualRoleInfo.orgs.length > 1 ? 'multiple organizations' : 'your organization dashboard'}.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleDestinationChoice('platform')}
                className="w-full p-5 bg-white/[0.03] border border-white/[0.08] rounded-xl backdrop-blur-sm hover:bg-white/[0.06] hover:border-violet-500/30 transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-violet-500/10 rounded-lg group-hover:bg-violet-500/20 transition-colors">
                    <Shield className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Platform Administration</h3>
                    <p className="text-sm text-slate-400 mt-0.5">
                      Manage organizations, users, and platform settings
                    </p>
                  </div>
                </div>
              </button>

              {dualRoleInfo.orgs.map((org) => (
                <button
                  key={org.slug}
                  onClick={() => handleDestinationChoice('org_dashboard', org.slug)}
                  className="w-full p-5 bg-white/[0.03] border border-white/[0.08] rounded-xl backdrop-blur-sm hover:bg-white/[0.06] hover:border-violet-500/30 transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    {org.logo_url ? (
                      <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/[0.05] flex items-center justify-center group-hover:ring-1 group-hover:ring-emerald-500/30 transition-all">
                        <img src={org.logo_url} alt={org.name} className="w-full h-full object-contain p-1" />
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                        <Building2 className="w-5 h-5 text-emerald-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-white font-medium">
                        {org.name} Dashboard
                      </h3>
                      <p className="text-sm text-slate-400 mt-0.5">
                        View performance and operations
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Remember choice */}
            <div className="flex items-center gap-3 justify-center">
              <Checkbox
                id="rememberChoice"
                checked={rememberChoice}
                onCheckedChange={(checked) => setRememberChoice(checked === true)}
                className="border-slate-600 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
              />
              <label
                htmlFor="rememberChoice"
                className="text-sm text-slate-400 cursor-pointer select-none"
              >
                Remember my choice
              </label>
            </div>
          </div>
        </div>

        {/* Bottom branding */}
        <div className="py-6 text-center relative z-10">
          <p className="text-slate-600 text-sm">
            &copy; {new Date().getFullYear()} {PLATFORM_NAME_FULL}
          </p>
        </div>
      </div>
    );
  }

  // Expired/invalid platform invitation
  if (platformInvitationToken && platformInvitation && platformInvitation.status !== 'pending') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full p-8 text-center bg-white/[0.03] border border-white/[0.06] rounded-2xl">
          <div className="p-4 bg-red-500/10 rounded-full w-fit mx-auto mb-4">
            <Mail className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-medium text-white mb-2">
            {platformInvitation.status === 'accepted' ? 'Invitation Already Used' : 'Invitation Expired'}
          </h2>
          <p className="text-slate-400 mb-6">
            {platformInvitation.status === 'accepted'
              ? 'This invitation has already been accepted.'
              : 'This invitation has expired or been cancelled.'}
          </p>
          <Button onClick={() => navigate('/login', { replace: true })} className="bg-violet-600 hover:bg-violet-500">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const isPlatformInviteSignup = !isLogin && platformInvitationToken && platformInvitation?.status === 'pending';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Back link */}
      <div className="p-6 relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 pb-20 relative z-10">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center mb-6">
              <PlatformLogo variant="login" className="h-10 w-auto" />
            </div>
            {!(isLogin && !isForgotPassword && !isPlatformInviteSignup) && (
              <h1 className="text-3xl font-medium text-white tracking-tight">
                {isForgotPassword
                  ? 'Reset Password'
                  : isPlatformInviteSignup
                  ? 'Create Your Account'
                  : 'Create Account'}
              </h1>
            )}
            <p className="text-slate-400">
              {isForgotPassword
                ? 'Enter your email to receive a reset link'
                : isPlatformInviteSignup
                ? `You've been invited as ${platformInvitation?.role.replace('platform_', '').replace('_', ' ')}`
                : isLogin
                ? contextualSubtitle
                : `Get started with ${PLATFORM_NAME}`}
            </p>
          </div>

          {/* Form Card */}
          <div className="p-8 bg-white/[0.03] border border-white/[0.08] rounded-2xl backdrop-blur-sm shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name (signup only) */}
              {!isLogin && !isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm text-slate-300">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="h-12 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500"
                  />
                </div>
              )}

              {/* Role (staff signup only, not platform invite) */}
              {!isLogin && !isForgotPassword && !isPlatformInviteSignup && (
                <div className="space-y-2">
                  <Label className="text-sm text-slate-300">Your Role</Label>
                  {staffInvitation ? (
                    <div className="h-12 px-4 bg-green-500/10 border border-green-500/20 flex items-center gap-3 rounded-md">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="font-medium text-green-300">
                        {roleOptions.find(r => r.value === staffInvitation.role)?.label}
                      </span>
                      <span className="text-xs text-green-500 ml-1">(assigned by invitation)</span>
                    </div>
                  ) : (
                    <Select value={role} onValueChange={(v) => setRole(v as AppRole)} required>
                      <SelectTrigger className="h-12 bg-white/[0.05] border-white/[0.1] text-white">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-slate-300">
                  Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(null);
                    }}
                    placeholder="you@company.com"
                    required
                    disabled={isPlatformInviteSignup}
                    className={`h-12 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500 pr-10 ${emailError ? 'border-red-500' : ''} ${staffInvitation && !isLogin ? 'border-green-500/50' : ''}`}
                  />
                  {!isLogin && checkingStaffInvitation && debouncedEmail.includes('@') && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  )}
                  {!isLogin && staffInvitation && !checkingStaffInvitation && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                  )}
                </div>
                {emailError && <p className="text-xs text-red-400">{emailError}</p>}
                {!isLogin && staffInvitation && (
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <Mail className="w-3 h-3" />
                    <span>You have a pending invitation!</span>
                  </div>
                )}
              </div>

              {/* Password */}
              {!isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-slate-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="h-12 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password (signup) */}
              {!isLogin && !isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm text-slate-300">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setConfirmPassword(newValue);
                        if (passwordMatchTimeoutRef.current) {
                          clearTimeout(passwordMatchTimeoutRef.current);
                        }
                        if (newValue.length >= 6 && password.length >= 6) {
                          passwordMatchTimeoutRef.current = setTimeout(() => {
                            showPasswordMatchToast(newValue === password);
                          }, 800);
                        }
                      }}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className={`h-12 bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500 pr-12 ${confirmPassword.length >= 6 ? (confirmPassword === password ? 'border-green-500/50' : 'border-red-500') : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword.length >= 6 && (
                    <p className={`text-xs ${confirmPassword === password ? 'text-green-400' : 'text-red-400'}`}>
                      {confirmPassword === password ? 'Passwords match' : 'Passwords do not match'}
                    </p>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                {isLogin && !isForgotPassword && canSignUp && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsLogin(false)}
                    className="flex-1 h-12 font-medium bg-transparent border-white/[0.1] text-white hover:bg-white/[0.05]"
                  >
                    Sign Up
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-12 font-medium bg-violet-600 hover:bg-violet-500 text-white"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isForgotPassword ? (
                    'Send Reset Link'
                  ) : isLogin ? (
                    'Sign In'
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </form>

            {/* Toggle & Forgot Password */}
            <div className="text-center space-y-3 mt-6">
              {isLogin && !isForgotPassword && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Forgot password?
                </button>
              )}
              <div>
                {isForgotPassword ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setIsLogin(true);
                      lastPasswordMatchStateRef.current = null;
                    }}
                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Back to sign in
                  </button>
                ) : !isLogin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      lastPasswordMatchStateRef.current = null;
                    }}
                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Already have an account? Sign in
                  </button>
                ) : canSignUp ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      lastPasswordMatchStateRef.current = null;
                    }}
                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Don't have an account? Sign up
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="py-6 text-center relative z-10">
        <p className="text-slate-600 text-sm">
          &copy; {new Date().getFullYear()} {PLATFORM_NAME_FULL}
        </p>
      </div>
    </div>
  );
}
